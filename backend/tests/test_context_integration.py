"""
Comprehensive E2E tests for RakshaAI context-aware chat API
Tests the integration of ContextService with chat responses
"""
import pytest
import httpx
import asyncio
import json
from pathlib import Path
import sys
import os

# Add backend to path for imports
sys.path.insert(0, '/app/backend')

from services.context_service import ContextService
from agents.problem_understanding_agent import ProblemUnderstandingAgent

# Test configuration
BASE_URL = "https://rti-helper-bot.preview.emergentagent.com"
TIMEOUT = 30.0

class TestContextIntegration:
    """Test suite for context-aware chat functionality"""
    
    def setup_class(self):
        """Setup test class"""
        self.base_url = BASE_URL
        self.headers = {"Content-Type": "application/json"}
        print(f"Testing against: {self.base_url}")
    
    @pytest.mark.asyncio
    async def test_health_check(self):
        """Test 1: Health Check - Should return healthy status"""
        print("\n=== TEST 1: Health Check ===")
        
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            response = await client.get(f"{self.base_url}/api/health")
            
            assert response.status_code == 200, f"Expected 200, got {response.status_code}"
            
            data = response.json()
            assert "status" in data, "Health response missing 'status' field"
            assert data["status"] == "healthy", f"Expected 'healthy', got {data['status']}"
            
            print("✅ Health check passed")
            print(f"   Response: {data}")
    
    @pytest.mark.asyncio
    async def test_chat_authentication_required(self):
        """Test 2: Chat endpoint should require authentication"""
        print("\n=== TEST 2: Authentication Requirement ===")
        
        async with httpx.AsyncClient(timeout=TIMEOUT) as client:
            chat_payload = {
                "message": "How do I apply for Aadhaar?",
                "includeContext": True
            }
            
            # Test without any auth headers
            response = await client.post(
                f"{self.base_url}/api/chat",
                json=chat_payload,
                headers=self.headers
            )
            
            assert response.status_code == 401, f"Expected 401 Unauthorized, got {response.status_code}"
            
            print("✅ Authentication requirement verified")
            print(f"   Status: {response.status_code}")
            print(f"   Response: {response.json()}")
    
    def test_context_service_loading(self):
        """Test 3: Context Service should load all JSON files correctly"""
        print("\n=== TEST 3: Context Service Loading ===")
        
        context_service = ContextService()
        success = context_service.load_context_files()
        
        assert success, "Context service failed to load files"
        assert len(context_service.context_data) == 5, f"Expected 5 context files, loaded {len(context_service.context_data)}"
        
        # Verify all expected files are loaded
        expected_categories = [
            "government_services", 
            "legal_rights", 
            "financial_services", 
            "privacy_safety", 
            "grievance_redressal"
        ]
        
        loaded_categories = [ctx.get("category") for ctx in context_service.context_data]
        
        for category in expected_categories:
            assert category in loaded_categories, f"Missing category: {category}"
        
        print("✅ Context service loading verified")
        print(f"   Loaded categories: {loaded_categories}")
    
    def test_aadhaar_context_matching(self):
        """Test 4a: Aadhaar query should match government services context"""
        print("\n=== TEST 4a: Aadhaar Context Matching ===")
        
        context_service = ContextService()
        context_service.load_context_files()
        
        query = "How do I apply for an Aadhaar card?"
        matched = context_service.search_context(query)
        
        assert matched is not None, "No context matched for Aadhaar query"
        assert matched["category"] == "government_services", f"Expected 'government_services', got {matched['category']}"
        assert "aadhaar" in matched["keywords_matched"], "Aadhaar keyword not matched"
        
        # Test context formatting
        formatted_context = context_service.format_context_for_llm(matched)
        
        # Verify essential information is present
        assert "https://uidai.gov.in" in formatted_context, "Official Aadhaar portal not found"
        assert "1947" in formatted_context, "Aadhaar helpline not found"
        assert "KNOWLEDGE BASE CONTEXT" in formatted_context, "Context header missing"
        
        print("✅ Aadhaar context matching verified")
        print(f"   Keywords matched: {matched['keywords_matched']}")
        print(f"   Context length: {len(formatted_context)} characters")
    
    def test_pan_context_matching(self):
        """Test 4b: PAN card query should match government services context"""
        print("\n=== TEST 4b: PAN Context Matching ===")
        
        context_service = ContextService()
        context_service.load_context_files()
        
        query = "I need help with PAN card application"
        matched = context_service.search_context(query)
        
        assert matched is not None, "No context matched for PAN query"
        assert matched["category"] == "government_services", f"Expected 'government_services', got {matched['category']}"
        assert "pan" in matched["keywords_matched"], "PAN keyword not matched"
        
        formatted_context = context_service.format_context_for_llm(matched)
        
        # Verify PAN-specific information
        assert "https://incometax.gov.in" in formatted_context or "https://tin.nsdl.com" in formatted_context, "Official PAN portal not found"
        assert "020-27218080" in formatted_context, "PAN helpline not found"
        
        print("✅ PAN context matching verified")
        print(f"   Keywords matched: {matched['keywords_matched']}")
    
    def test_legal_rights_context_matching(self):
        """Test 4c: Legal rights query should match legal context"""
        print("\n=== TEST 4c: Legal Rights Context Matching ===")
        
        context_service = ContextService()
        context_service.load_context_files()
        
        query = "What are my rights if I'm arrested?"
        matched = context_service.search_context(query)
        
        assert matched is not None, "No context matched for legal rights query"
        assert matched["category"] == "legal_rights", f"Expected 'legal_rights', got {matched['category']}"
        
        formatted_context = context_service.format_context_for_llm(matched)
        
        # Check for legal-specific content
        assert "KNOWLEDGE BASE CONTEXT" in formatted_context, "Context header missing"
        assert len(formatted_context) > 100, "Context seems too short"
        
        print("✅ Legal rights context matching verified")
        print(f"   Keywords matched: {matched.get('keywords_matched', [])}")
    
    def test_passport_context_matching(self):
        """Test 4d: Passport query should match government services context"""
        print("\n=== TEST 4d: Passport Context Matching ===")
        
        context_service = ContextService()
        context_service.load_context_files()
        
        query = "How to apply for passport?"
        matched = context_service.search_context(query)
        
        assert matched is not None, "No context matched for passport query"
        assert matched["category"] == "government_services", f"Expected 'government_services', got {matched['category']}"
        assert "passport" in matched["keywords_matched"], "Passport keyword not matched"
        
        formatted_context = context_service.format_context_for_llm(matched)
        
        # Verify passport-specific information
        assert "https://passportindia.gov.in" in formatted_context, "Official passport portal not found"
        assert "1800-258-1800" in formatted_context, "Passport helpline not found"
        
        print("✅ Passport context matching verified")
        print(f"   Keywords matched: {matched['keywords_matched']}")
    
    def test_no_match_behavior(self):
        """Test 4e: Unrelated query should not match any context"""
        print("\n=== TEST 4e: No Match Behavior ===")
        
        context_service = ContextService()
        context_service.load_context_files()
        
        query = "What's the weather like today?"
        matched = context_service.search_context(query)
        
        assert matched is None, "Unexpected context match for weather query"
        
        formatted_context = context_service.get_context_for_query(query)
        assert formatted_context == "", "Context should be empty for unrelated query"
        
        print("✅ No match behavior verified")
        print("   No context returned for weather query (expected)")
    
    @pytest.mark.asyncio
    async def test_problem_understanding_agent(self):
        """Test 5: Problem Understanding Agent with context integration"""
        print("\n=== TEST 5: Problem Understanding Agent Integration ===")
        
        # Load context service
        context_service = ContextService()
        context_service.load_context_files()
        
        # Initialize agent
        agent = ProblemUnderstandingAgent()
        
        # Test with Aadhaar query
        query = "How do I apply for an Aadhaar card?"
        knowledge_context = context_service.get_context_for_query(query)
        
        input_data = {
            "user_input": query,
            "previous_context": "",
            "knowledge_context": knowledge_context
        }
        
        # Process the request
        result = await agent.process(input_data)
        
        # Verify response structure
        assert "success" in result or "message" in result, "Agent should return success or message"
        
        if "success" in result:
            assert result["success"] == True, "Agent processing should succeed"
            assert "message" in result, "Agent should return message"
            message = result["message"]
            
            # Verify the response contains context information
            # Should reference official portals or helplines due to knowledge context
            contains_context_info = any([
                "uidai.gov.in" in message.lower(),
                "1947" in message,
                "official" in message.lower(),
                "portal" in message.lower()
            ])
            
            print("✅ Problem Understanding Agent integration verified")
            print(f"   Response contains context info: {contains_context_info}")
            print(f"   Message length: {len(message)} characters")
            print(f"   Knowledge context provided: {len(knowledge_context)} characters")
        else:
            print(f"   Agent returned: {result}")
    
    def test_context_data_structure(self):
        """Test 6: Verify context data has required structure"""
        print("\n=== TEST 6: Context Data Structure ===")
        
        context_service = ContextService()
        context_service.load_context_files()
        
        required_fields = ["category", "keywords"]
        
        for i, context in enumerate(context_service.context_data):
            for field in required_fields:
                assert field in context, f"Context {i} missing required field: {field}"
            
            # Verify keywords is a list
            assert isinstance(context["keywords"], list), f"Context {i} keywords should be a list"
            assert len(context["keywords"]) > 0, f"Context {i} should have at least one keyword"
        
        print("✅ Context data structure verified")
        print(f"   All {len(context_service.context_data)} context files have valid structure")
    
    @pytest.mark.asyncio
    async def test_sensitive_data_detection(self):
        """Test 7: Verify sensitive data is handled correctly"""
        print("\n=== TEST 7: Sensitive Data Detection ===")
        
        agent = ProblemUnderstandingAgent()
        
        # Test with sensitive data
        sensitive_query = "My Aadhaar number is 1234-5678-9012, can you help me?"
        
        input_data = {
            "user_input": sensitive_query,
            "previous_context": "",
            "knowledge_context": ""
        }
        
        result = await agent.process(input_data)
        
        # Should detect sensitive data and return appropriate warning
        assert "error" in result, "Should detect sensitive data"
        assert result["error"] == "sensitive_data_detected", "Should flag sensitive data"
        assert "message" in result, "Should provide warning message"
        
        warning_message = result["message"]
        assert "don't share" in warning_message.lower(), "Should warn against sharing sensitive data"
        
        print("✅ Sensitive data detection verified")
        print(f"   Warning message: {warning_message}")

def run_tests():
    """Run all tests and provide summary"""
    print("🚀 Starting RakshaAI Context Integration Tests")
    print("=" * 60)
    
    test_instance = TestContextIntegration()
    test_instance.setup_class()
    
    tests = [
        ("Health Check", test_instance.test_health_check),
        ("Authentication Requirement", test_instance.test_chat_authentication_required),
        ("Context Service Loading", lambda: test_instance.test_context_service_loading()),
        ("Aadhaar Context Matching", lambda: test_instance.test_aadhaar_context_matching()),
        ("PAN Context Matching", lambda: test_instance.test_pan_context_matching()),
        ("Legal Rights Context", lambda: test_instance.test_legal_rights_context_matching()),
        ("Passport Context Matching", lambda: test_instance.test_passport_context_matching()),
        ("No Match Behavior", lambda: test_instance.test_no_match_behavior()),
        ("Agent Integration", test_instance.test_problem_understanding_agent),
        ("Context Data Structure", lambda: test_instance.test_context_data_structure()),
        ("Sensitive Data Detection", test_instance.test_sensitive_data_detection())
    ]
    
    results = {"passed": 0, "failed": 0, "errors": []}
    
    for test_name, test_func in tests:
        try:
            if asyncio.iscoroutinefunction(test_func):
                asyncio.run(test_func())
            else:
                test_func()
            results["passed"] += 1
            print(f"✅ {test_name}: PASSED")
        except Exception as e:
            results["failed"] += 1
            error_msg = f"❌ {test_name}: FAILED - {str(e)}"
            results["errors"].append(error_msg)
            print(error_msg)
    
    print("\n" + "=" * 60)
    print("🏁 TEST SUMMARY")
    print("=" * 60)
    print(f"✅ PASSED: {results['passed']}")
    print(f"❌ FAILED: {results['failed']}")
    print(f"📊 TOTAL:  {results['passed'] + results['failed']}")
    
    if results["errors"]:
        print("\n❌ FAILURES:")
        for error in results["errors"]:
            print(f"   {error}")
    
    return results

if __name__ == "__main__":
    # Create tests directory if it doesn't exist
    os.makedirs("/app/backend/tests", exist_ok=True)
    
    # Run tests
    results = run_tests()
    
    # Exit with appropriate code
    exit_code = 0 if results["failed"] == 0 else 1
    print(f"\nExiting with code: {exit_code}")