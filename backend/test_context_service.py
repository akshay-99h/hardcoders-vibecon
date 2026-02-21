"""
Quick test script to verify ContextService is working correctly
"""
import sys
import asyncio
sys.path.append('/app/backend')

from services.context_service import ContextService


async def test_context_service():
    """Test the context service"""
    print("=" * 60)
    print("Testing ContextService")
    print("=" * 60)
    
    # Initialize service
    context_service = ContextService()
    print("\n1. Loading context files...")
    loaded = context_service.load_context_files()
    print(f"   Loaded: {loaded}")
    print(f"   Number of context files: {len(context_service.context_data)}")
    
    # Test queries
    test_queries = [
        "How do I apply for an Aadhaar card?",
        "I need help with PAN card application",
        "How to file a consumer complaint?",
        "What are my rights if I'm arrested?",
        "How to apply for passport?",
        "Something completely unrelated like weather"
    ]
    
    print("\n2. Testing queries:")
    print("-" * 60)
    
    for query in test_queries:
        print(f"\nQuery: '{query}'")
        matched = context_service.search_context(query)
        
        if matched:
            print(f"  ✓ Match found!")
            print(f"    Category: {matched['category']}")
            print(f"    Keywords matched: {matched['keywords_matched']}")
            print(f"    Relevance score: {matched['relevance_score']}")
            
            # Get formatted context
            formatted = context_service.format_context_for_llm(matched)
            print(f"    Context length: {len(formatted)} chars")
            print(f"    First 200 chars: {formatted[:200]}...")
        else:
            print("  ✗ No match found")
    
    print("\n" + "=" * 60)
    print("Test complete!")
    print("=" * 60)


if __name__ == "__main__":
    asyncio.run(test_context_service())
