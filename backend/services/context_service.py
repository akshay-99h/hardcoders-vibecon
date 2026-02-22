"""
Context Service for loading and searching Indian government services knowledge base
"""
import json
import os
from typing import Dict, List, Any, Optional
from pathlib import Path


class ContextService:
    """Service to load and search through context JSON files"""
    
    def __init__(self, data_dir: str = "/app/backend/data/context"):
        self.data_dir = Path(data_dir)
        self.context_data: List[Dict[str, Any]] = []
        self.loaded = False
    
    def load_context_files(self) -> bool:
        """Load all JSON context files from the data directory"""
        try:
            json_files = list(self.data_dir.glob("*.json"))
            
            if not json_files:
                print(f"Warning: No JSON files found in {self.data_dir}")
                return False
            
            for json_file in json_files:
                try:
                    with open(json_file, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                        self.context_data.append(data)
                        print(f"Loaded context file: {json_file.name}")
                except Exception as e:
                    print(f"Error loading {json_file.name}: {e}")
            
            self.loaded = True
            print(f"✓ Successfully loaded {len(self.context_data)} context files")
            return True
            
        except Exception as e:
            print(f"Error loading context files: {e}")
            return False
    
    def search_context(self, query: str) -> Optional[Dict[str, Any]]:
        """
        Search for relevant context based on user query keywords
        
        Args:
            query: User's query text
            
        Returns:
            Dict containing relevant context information or None if no match
        """
        if not self.loaded:
            self.load_context_files()
        
        if not self.context_data:
            return None
        
        query_lower = query.lower()
        matched_contexts = []
        
        # Search through each context file
        for context in self.context_data:
            keywords = context.get("keywords", [])
            category = context.get("category", "")
            
            # Check if any keyword matches the query
            keyword_matches = [kw for kw in keywords if kw.lower() in query_lower]
            
            if keyword_matches:
                matched_contexts.append({
                    "category": category,
                    "keywords_matched": keyword_matches,
                    "data": context,
                    "relevance_score": len(keyword_matches)
                })
        
        # Sort by relevance (number of keyword matches)
        if matched_contexts:
            matched_contexts.sort(key=lambda x: x["relevance_score"], reverse=True)
            return matched_contexts[0]  # Return most relevant match
        
        return None
    
    def format_context_for_llm(self, matched_context: Dict[str, Any]) -> str:
        """
        Format the matched context into a structured prompt for the LLM
        
        Args:
            matched_context: The matched context from search_context()
            
        Returns:
            Formatted string to prepend to the LLM prompt
        """
        if not matched_context:
            return ""
        
        data = matched_context["data"]
        category = data.get("category", "")
        description = data.get("description", "")
        keywords_matched = matched_context.get("keywords_matched", [])
        
        context_text = f"""
KNOWLEDGE BASE CONTEXT:
Category: {category}
Description: {description}
Keywords Detected: {', '.join(keywords_matched)}

"""
        
        # Add portals information if available
        portals = data.get("portals", {})
        if portals:
            context_text += "OFFICIAL PORTALS:\n"
            for service_name, portal_info in portals.items():
                url = portal_info.get("url", "N/A")
                helpline = portal_info.get("helpline", "")
                alt = portal_info.get("alt", "")
                purpose = portal_info.get("purpose", "")
                note = portal_info.get("note", "")
                
                context_text += f"  • {service_name.replace('_', ' ').title()}: {url}\n"
                if purpose:
                    context_text += f"    Purpose: {purpose}\n"
                if helpline:
                    context_text += f"    Helpline: {helpline}\n"
                if alt:
                    context_text += f"    Alternative: {alt}\n"
                if note:
                    context_text += f"    Note: {note}\n"
            context_text += "\n"

        # Add curated video references if available
        video_references = data.get("video_references", [])
        if video_references:
            context_text += "VIDEO REFERENCES (YOUTUBE):\n"
            for ref in video_references:
                title = ref.get("title", "Helpful video")
                youtube_url = ref.get("youtube_url", "")
                embed_url = ref.get("embed_url", "")
                topics = ref.get("topics", [])
                use_when = ref.get("use_when", "")
                default_placement = ref.get("default_placement", "")

                context_text += f"  • {title}\n"
                if topics:
                    context_text += f"    Topics: {', '.join(topics)}\n"
                if use_when:
                    context_text += f"    Use when: {use_when}\n"
                if youtube_url:
                    context_text += f"    Watch URL: {youtube_url}\n"
                if embed_url:
                    context_text += f"    Embed URL: {embed_url}\n"
                if default_placement:
                    context_text += f"    Suggested placement: {default_placement}\n"
            context_text += "\n"
            context_text += (
                "VIDEO EMBED RULES:\n"
                "  • Use only the provided embed URLs. Do not invent video IDs.\n"
                "  • Add at most 2 videos when highly relevant to the user's query.\n"
                "  • Use exact iframe format with placement marker:\n"
                "    <iframe src=\"https://www.youtube.com/embed/VIDEO_ID\" "
                "title=\"Short helpful title\" data-placement=\"top|bottom\" "
                "loading=\"lazy\" referrerpolicy=\"strict-origin-when-cross-origin\" "
                "allowfullscreen></iframe>\n\n"
            )
        
        # Add general rules if available
        general_rules = data.get("general_rules", [])
        if general_rules:
            context_text += "GENERAL RULES:\n"
            for rule in general_rules:
                context_text += f"  • {rule}\n"
            context_text += "\n"
        
        # Add common patterns if available
        common_patterns = data.get("common_patterns", {})
        if common_patterns:
            context_text += "COMMON PROCESSES:\n"
            for pattern_name, pattern_steps in common_patterns.items():
                context_text += f"  • {pattern_name.replace('_', ' ').title()}: {pattern_steps}\n"
            context_text += "\n"
        
        # Add escalation procedures if available
        escalation = data.get("escalation", {})
        if escalation:
            context_text += "ESCALATION PROCEDURES:\n"
            for level, action in escalation.items():
                context_text += f"  {level.title()}: {action}\n"
            context_text += "\n"
        
        # Add rights information if available (for legal_rights category)
        rights = data.get("rights", {})
        if rights:
            context_text += "LEGAL RIGHTS:\n"
            for right_category, right_info in rights.items():
                context_text += f"  • {right_category.replace('_', ' ').title()}:\n"
                if isinstance(right_info, dict):
                    for key, value in right_info.items():
                        context_text += f"    - {key}: {value}\n"
                else:
                    context_text += f"    {right_info}\n"
            context_text += "\n"
        
        # Add document templates if available
        templates = data.get("templates", {})
        can_generate = data.get("can_generate", [])
        cannot_generate = data.get("cannot_generate", {})
        
        if templates:
            context_text += "DOCUMENT TEMPLATES AVAILABLE:\n"
            context_text += f"Can generate: {', '.join(can_generate)}\n"
            if cannot_generate:
                cannot_types = cannot_generate.get("types", [])
                cannot_reason = cannot_generate.get("reason", "")
                cannot_redirect = cannot_generate.get("redirect", "")
                context_text += f"Cannot generate: {', '.join(cannot_types)}\n"
                context_text += f"Reason: {cannot_reason}\n"
                context_text += f"Redirect: {cannot_redirect}\n"
            context_text += "\n"
            
            context_text += "TEMPLATE DETAILS:\n"
            for template_name, template_info in templates.items():
                desc = template_info.get("description", "")
                required_fields = template_info.get("required_fields", [])
                context_text += f"  • {template_name.replace('_', ' ').title()}: {desc}\n"
                context_text += f"    Required fields: {len(required_fields)}\n"
                for field in required_fields[:5]:  # Show first 5 fields
                    context_text += f"      - {field.get('field')}: {field.get('ask')}\n"
                if len(required_fields) > 5:
                    context_text += f"      ... and {len(required_fields) - 5} more fields\n"
            context_text += "\n"
        
        context_text += """
IMPORTANT: Use this verified information to provide accurate, safe guidance. 
Always direct users to official portals and helplines mentioned above.
"""
        
        return context_text
    
    def get_context_for_query(self, query: str) -> str:
        """
        Main method: Search and format context for a given query
        
        Args:
            query: User's query text
            
        Returns:
            Formatted context string to prepend to LLM prompt
        """
        matched = self.search_context(query)
        if matched:
            return self.format_context_for_llm(matched)
        return ""
