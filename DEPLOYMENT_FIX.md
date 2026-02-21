# Deployment Fix - Backend URL Configuration

## Issue Fixed
The frontend was hardcoded to use `localhost:8001` which breaks OAuth and API calls in the deployed environment.

## Solution Applied

### 1. Updated Frontend API Client (`/app/frontend/src/utils/api.js`)
- **Before**: `const API_BASE_URL = process.env.REACT_APP_BACKEND_URL || 'http://localhost:8001';`
- **After**: `const API_BASE_URL = '';` (empty string for relative URLs)

### 2. Why This Works
- Kubernetes ingress automatically routes `/api/*` requests to `backend:8001`
- Frontend makes relative API calls (e.g., `/api/auth/me`)
- Same-origin policy allows cookies to work correctly
- OAuth redirects work because everything is on the same domain

### 3. Updated `.env` File
```env
# Backend URL Configuration
# IMPORTANT: Leave empty for production - Kubernetes ingress handles routing
# The /api routes are automatically forwarded to backend:8001
REACT_APP_BACKEND_URL=
```

## How It Works Now

**Frontend Request Flow:**
1. Frontend makes request to `/api/missions` (relative URL)
2. Browser sends to same domain (e.g., `https://your-app.preview.emergentagent.com/api/missions`)
3. Kubernetes ingress sees `/api` prefix
4. Routes request to `backend:8001`
5. Backend responds
6. Cookies work correctly (same domain)

**OAuth Flow:**
1. User clicks "Sign In"
2. Redirects to `https://auth.emergentagent.com/?redirect=https://your-app.preview.emergentagent.com/dashboard`
3. After Google auth, returns to your app's domain
4. Frontend exchanges session_id for session_token via `/api/auth/session`
5. Backend sets httpOnly cookie
6. Cookie works because it's same domain

## Testing

```bash
# Test health endpoint
curl https://your-app.preview.emergentagent.com/api/health

# Frontend should now be able to:
# 1. Complete OAuth flow
# 2. Make API calls
# 3. Set/read cookies correctly
```

## Important Notes

- **Never hardcode `localhost` in production code**
- **Never hardcode full URLs** - use relative paths
- **Trust Kubernetes ingress** to handle routing
- **Frontend .env should be empty** for REACT_APP_BACKEND_URL in production

## Services Restarted
- Frontend has been restarted to pick up the new configuration
- Backend continues running (no changes needed)
- OAuth should now work correctly!
