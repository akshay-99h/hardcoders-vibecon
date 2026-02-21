# Fix: 520 Error During Login

## Issue
Users were getting a 520 error code when trying to log in via Google OAuth.

## Root Cause
The backend was returning MongoDB documents with `datetime` objects directly in JSON responses. Python's `datetime` objects cannot be serialized to JSON by default, causing the API to crash with:
```
TypeError: Object of type datetime is not JSON serializable
```

This occurred in:
- `/api/auth/session` endpoint (during OAuth callback)
- `/api/auth/me` endpoint (user authentication)
- `/api/missions` endpoints (mission data)

## Solution Applied

### 1. Created Serialization Helper Function
Added a `serialize_doc()` helper function to convert MongoDB documents with datetime objects to JSON-serializable dictionaries:

```python
def serialize_doc(doc):
    """Convert MongoDB document to JSON-serializable dict"""
    if doc is None:
        return None
    
    serialized = {}
    for key, value in doc.items():
        if isinstance(value, datetime):
            serialized[key] = value.isoformat()  # Convert to ISO format string
        elif isinstance(value, list):
            serialized[key] = [serialize_doc(item) if isinstance(item, dict) else item for item in value]
        elif isinstance(value, dict):
            serialized[key] = serialize_doc(value)
        else:
            serialized[key] = value
    return serialized
```

### 2. Updated All Endpoints
Modified all endpoints that return MongoDB documents to use `serialize_doc()`:

**Auth Endpoints:**
- `GET /api/auth/me` - Now returns `serialize_doc(user_doc)`
- `POST /api/auth/session` - Now returns `serialize_doc(user_data)`

**Mission Endpoints:**
- `POST /api/missions/create` - Returns `serialize_doc(mission_doc)`
- `GET /api/missions` - Returns list of `serialize_doc(mission_doc)`
- `GET /api/missions/{mission_id}` - Returns `serialize_doc(mission_doc)`

### 3. Backend Restarted
- Service restarted successfully
- No errors in logs
- API responding correctly

## Testing the Fix

```bash
# Test health endpoint
curl http://localhost:8001/api/health

# Backend should now handle:
# 1. OAuth login flow
# 2. User authentication
# 3. Mission creation and retrieval
# All with properly serialized datetime fields
```

## Datetime Format in Responses

Datetime objects are now returned as ISO 8601 strings:
```json
{
  "user_id": "user_abc123",
  "email": "user@example.com",
  "name": "John Doe",
  "created_at": "2025-01-15T10:30:45.123456+00:00"
}
```

This format is:
- Timezone-aware
- Easy to parse in JavaScript: `new Date(dateString)`
- Human-readable
- ISO standard compliant

## Status
✅ Backend restarted successfully
✅ No serialization errors
✅ API responding correctly
✅ OAuth login should work now

## Try Logging In Again!
The 520 error should now be resolved. You can:
1. Click "Sign In" on the landing page
2. Complete Google OAuth
3. Be redirected to dashboard
4. Start creating missions
