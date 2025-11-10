# User Authentication & Authorization - Complete ✅

## Summary

User authentication and authorization have been fully implemented with JWT tokens, Spring Security, and frontend auth components.

## ✅ Backend Implementation

### 1. Dependencies Added

**File:** `apps/backend/build.gradle`

**Added:**
- ✅ `spring-boot-starter-security` - Spring Security
- ✅ `jjwt-api:0.12.3` - JWT API
- ✅ `jjwt-impl:0.12.3` - JWT Implementation
- ✅ `jjwt-jackson:0.12.3` - JWT Jackson Support

### 2. JWT Service

**File:** `apps/backend/src/main/java/com/rapidphoto/features/auth/JwtService.java`

**Features:**
- ✅ `generateToken(UUID userId, String email)` - Generate JWT tokens
- ✅ `validateToken(String token)` - Validate JWT tokens
- ✅ `getUserIdFromToken(String token)` - Extract user ID from token
- ✅ `getEmailFromToken(String token)` - Extract email from token
- ✅ Token expiration: 24 hours (configurable)
- ✅ Secret key: Configurable via `jwt.secret` property

### 3. JWT Authentication Filter

**File:** `apps/backend/src/main/java/com/rapidphoto/features/auth/JwtAuthenticationFilter.java`

**Features:**
- ✅ Intercepts all requests
- ✅ Extracts JWT token from `Authorization: Bearer {token}` header
- ✅ Validates token using JwtService
- ✅ Sets authentication in SecurityContext
- ✅ Allows requests without token (for public endpoints)

### 4. Security Configuration

**File:** `apps/backend/src/main/java/com/rapidphoto/features/auth/SecurityConfig.java`

**Features:**
- ✅ Stateless session management (JWT-based)
- ✅ Public endpoints:
  - `/api/auth/**` - Authentication endpoints
  - `/ws/**` - WebSocket endpoints
  - `/actuator/health` - Health check
  - `/actuator/info` - Info endpoint
- ✅ Protected endpoints:
  - `/api/**` - All other API endpoints require authentication
- ✅ CORS configuration for `http://localhost:3000`
- ✅ BCrypt password encoder
- ✅ JWT filter added to filter chain

### 5. Auth Controller

**File:** `apps/backend/src/main/java/com/rapidphoto/features/auth/AuthController.java`

**Endpoints:**
- ✅ `POST /api/auth/register` - Register new user
  - Validates email/username uniqueness
  - Hashes password with BCrypt
  - Returns JWT token and user info
- ✅ `POST /api/auth/login` - Login with email/password
  - Validates credentials
  - Checks user status (ACTIVE)
  - Updates last login timestamp
  - Returns JWT token and user info
- ✅ `POST /api/auth/logout` - Logout (client-side token removal)
- ✅ `GET /api/auth/me` - Get current user info from token

### 6. Custom User Details Service

**File:** `apps/backend/src/main/java/com/rapidphoto/features/auth/CustomUserDetailsService.java`

**Features:**
- ✅ Implements Spring Security `UserDetailsService`
- ✅ Loads user by email
- ✅ Checks user status (ACTIVE)
- ✅ Returns Spring Security UserDetails

### 7. Controllers Updated

**PhotoController:**
- ✅ Removed `userId` parameter from `GET /api/photos`
- ✅ Gets userId from `SecurityContextHolder`
- ✅ Only returns photos for authenticated user

**UploadController:**
- ✅ Removed `userId` parameter from `POST /api/upload`
- ✅ Gets userId from `SecurityContextHolder`
- ✅ Sets userId in `UploadPhotoRequest` from authentication

**ChunkController:**
- ✅ Verifies photo ownership before allowing chunk upload
- ✅ Gets userId from `SecurityContextHolder`
- ✅ Returns 403 if photo doesn't belong to user

### 8. User Entity Updated

**File:** `apps/backend/src/main/java/com/rapidphoto/domain/user/User.java`

**Added:**
- ✅ `getPasswordHash()` method for Spring Security integration

### 9. RegisterUserCommandHandler Updated

**File:** `apps/backend/src/main/java/com/rapidphoto/application/command/user/RegisterUserCommandHandler.java`

**Updated:**
- ✅ Accepts pre-hashed passwords (from AuthController)
- ✅ Backward compatible with plain passwords

### 10. Configuration

**File:** `apps/backend/src/main/resources/application.yml`

**Added:**
```yaml
jwt:
  secret: your-256-bit-secret-key-change-this-in-production-minimum-32-characters-long
  expiration: 86400000 # 24 hours
```

## ✅ Frontend Implementation

### 1. Auth Service

**File:** `apps/web/src/utils/authService.ts`

**Features:**
- ✅ `login(email, password)` - Login and store JWT
- ✅ `register(email, username, password, fullName?)` - Register and store JWT
- ✅ `logout()` - Clear JWT and user info
- ✅ `getCurrentUser()` - Get current user from token
- ✅ `getToken()` - Retrieve JWT from localStorage
- ✅ `setToken(token)` - Store JWT in localStorage
- ✅ `getUser()` - Get user info from localStorage
- ✅ `setUser(user)` - Store user info in localStorage
- ✅ `isAuthenticated()` - Check if user is authenticated
- ✅ `clearAuth()` - Clear all auth data

### 2. API Client Updated

**File:** `apps/web/src/api/client.ts`

**Features:**
- ✅ Request interceptor: Adds `Authorization: Bearer {token}` header
- ✅ Response interceptor: Handles 401 errors
  - Clears auth data on 401
  - Redirects to `/login` if not already there

### 3. Auth Context

**File:** `apps/web/src/features/auth/AuthContext.tsx`

**Features:**
- ✅ React context for auth state
- ✅ `user` - Current user object
- ✅ `loading` - Auth check loading state
- ✅ `login()` - Login function
- ✅ `register()` - Register function
- ✅ `logout()` - Logout function
- ✅ `isAuthenticated` - Boolean flag
- ✅ Auto-checks auth on mount
- ✅ Verifies token validity on load

### 4. Login Page

**File:** `apps/web/src/features/auth/components/LoginPage.tsx`

**Features:**
- ✅ Email/password form
- ✅ Form validation
- ✅ Error display
- ✅ Loading state
- ✅ Redirects to `/gallery` on success
- ✅ Link to register page

### 5. Register Page

**File:** `apps/web/src/features/auth/components/RegisterPage.tsx`

**Features:**
- ✅ Email, username, password, fullName form
- ✅ Form validation (email format, password length, username length)
- ✅ Error display
- ✅ Loading state
- ✅ Redirects to `/gallery` on success
- ✅ Link to login page

### 6. Private Route

**File:** `apps/web/src/features/auth/components/PrivateRoute.tsx`

**Features:**
- ✅ Wraps protected routes
- ✅ Shows loading spinner while checking auth
- ✅ Redirects to `/login` if not authenticated
- ✅ Renders children if authenticated

### 7. App Routing Updated

**File:** `apps/web/src/App.tsx`

**Features:**
- ✅ Wrapped with `AuthProvider`
- ✅ Added `/login` route
- ✅ Added `/register` route
- ✅ Wrapped `/upload` with `PrivateRoute`
- ✅ Wrapped `/gallery` with `PrivateRoute`
- ✅ Default route redirects to `/gallery`

### 8. Navigation Updated

**File:** `apps/web/src/components/Navigation.tsx`

**Features:**
- ✅ Shows "Sign In" / "Sign Up" when not authenticated
- ✅ Shows "Upload" / "Gallery" / "Logout" when authenticated
- ✅ Displays username when authenticated
- ✅ Logout button calls `logout()` and redirects to `/login`

### 9. Gallery Page Updated

**File:** `apps/web/src/features/gallery/GalleryPage.tsx`

**Features:**
- ✅ Removed hardcoded `TEST_USER_ID`
- ✅ Uses `useAuth()` to get current user
- ✅ Calls `galleryApi.getPhotos()` without userId (backend gets it from token)

### 10. Upload API Updated

**File:** `apps/web/src/api/upload.ts`

**Features:**
- ✅ Removed `userId` parameter from `uploadPhoto()`
- ✅ Removed `userId` parameter from `initializeUpload()`
- ✅ Backend gets userId from JWT token

### 11. Upload Hooks Updated

**Files:**
- `apps/web/src/features/upload/hooks/useFileUpload.ts`
- `apps/web/src/features/upload/hooks/useChunkedUpload.ts`

**Features:**
- ✅ Removed hardcoded `TEST_USER_ID`
- ✅ Calls upload API without userId parameter

## 🔧 Configuration

### Backend Configuration

**application.yml:**
```yaml
jwt:
  secret: your-256-bit-secret-key-change-this-in-production-minimum-32-characters-long
  expiration: 86400000 # 24 hours in milliseconds
```

**Note:** Change the JWT secret in production!

### Frontend Configuration

**API Client:**
- Base URL: `http://localhost:8080/api`
- Auto-adds JWT token to all requests
- Auto-redirects to login on 401

## 🧪 Testing Guide

### 1. Start Services

**Backend:**
```bash
cd apps/backend
./gradlew bootRun
```

**Frontend:**
```bash
cd apps/web
pnpm dev
```

### 2. Test Registration

1. Navigate to http://localhost:3000/register
2. Fill in registration form:
   - Email: `test@example.com`
   - Username: `testuser`
   - Password: `password123` (min 8 characters)
   - Full Name: `Test User` (optional)
3. Click "Create Account"
4. Should redirect to `/gallery`
5. Check localStorage for `rapidphoto_token` and `rapidphoto_user`

### 3. Test Login

1. Navigate to http://localhost:3000/login
2. Fill in login form:
   - Email: `test@example.com`
   - Password: `password123`
3. Click "Sign In"
4. Should redirect to `/gallery`
5. Check localStorage for JWT token

### 4. Test Protected Routes

1. **Without Authentication:**
   - Clear localStorage
   - Navigate to http://localhost:3000/gallery
   - Should redirect to `/login`

2. **With Authentication:**
   - Login first
   - Navigate to http://localhost:3000/gallery
   - Should show gallery

### 5. Test Upload with Auth

1. Login to the application
2. Navigate to http://localhost:3000/upload
3. Upload a photo
4. Check backend logs - should show authenticated userId
5. Photo should be associated with logged-in user

### 6. Test Gallery with Auth

1. Login to the application
2. Navigate to http://localhost:3000/gallery
3. Should only show photos for logged-in user
4. Upload photos from different accounts - each should only see their own

### 7. Test Logout

1. Click "Logout" button in navigation
2. Should redirect to `/login`
3. localStorage should be cleared
4. Try accessing `/gallery` - should redirect to `/login`

### 8. Test Token Expiration

1. Login to the application
2. Wait 24 hours (or modify token expiration in config)
3. Try to access `/gallery`
4. Should redirect to `/login` (401 response)

### 9. Test API Endpoints

**Register:**
```bash
curl -X POST http://localhost:8080/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123",
    "fullName": "Test User"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:8080/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'
```

**Get Current User:**
```bash
curl -X GET http://localhost:8080/api/auth/me \
  -H "Authorization: Bearer {token}"
```

**Get Photos (Protected):**
```bash
curl -X GET "http://localhost:8080/api/photos?page=0&size=24" \
  -H "Authorization: Bearer {token}"
```

**Upload Photo (Protected):**
```bash
curl -X POST http://localhost:8080/api/upload \
  -H "Authorization: Bearer {token}" \
  -F "file=@photo.jpg"
```

## ✅ Verification Checklist

### Backend
- [x] Spring Security dependencies added
- [x] JWT dependencies added
- [x] JwtService created with token generation/validation
- [x] JwtAuthenticationFilter created
- [x] SecurityConfig configured with public/protected endpoints
- [x] AuthController with register/login/logout/me endpoints
- [x] CustomUserDetailsService created
- [x] Password hashing with BCrypt
- [x] PhotoController uses authenticated user
- [x] UploadController uses authenticated user
- [x] ChunkController verifies photo ownership
- [x] User entity has getPasswordHash() method
- [x] JWT configuration in application.yml

### Frontend
- [x] AuthService created with login/register/logout
- [x] API client with JWT interceptor
- [x] AuthContext for auth state management
- [x] LoginPage component created
- [x] RegisterPage component created
- [x] PrivateRoute component created
- [x] App.tsx routing updated with auth
- [x] Navigation shows login/logout based on auth state
- [x] GalleryPage uses authenticated user
- [x] Upload hooks use authenticated user
- [x] All hardcoded userIds removed

## 📝 Files Created/Modified

### Backend Files Created
- `apps/backend/src/main/java/com/rapidphoto/features/auth/JwtService.java`
- `apps/backend/src/main/java/com/rapidphoto/features/auth/JwtAuthenticationFilter.java`
- `apps/backend/src/main/java/com/rapidphoto/features/auth/SecurityConfig.java`
- `apps/backend/src/main/java/com/rapidphoto/features/auth/AuthController.java`
- `apps/backend/src/main/java/com/rapidphoto/features/auth/CustomUserDetailsService.java`
- `apps/backend/src/main/java/com/rapidphoto/features/auth/RegisterRequest.java`
- `apps/backend/src/main/java/com/rapidphoto/features/auth/LoginRequest.java`

### Backend Files Modified
- `apps/backend/build.gradle` - Added Spring Security and JWT dependencies
- `apps/backend/src/main/resources/application.yml` - Added JWT configuration
- `apps/backend/src/main/java/com/rapidphoto/domain/user/User.java` - Added getPasswordHash() method
- `apps/backend/src/main/java/com/rapidphoto/features/gallery/PhotoController.java` - Uses authenticated user
- `apps/backend/src/main/java/com/rapidphoto/features/upload/UploadController.java` - Uses authenticated user
- `apps/backend/src/main/java/com/rapidphoto/features/upload/chunk/ChunkController.java` - Verifies photo ownership
- `apps/backend/src/main/java/com/rapidphoto/application/command/user/RegisterUserCommandHandler.java` - Accepts pre-hashed passwords

### Frontend Files Created
- `apps/web/src/utils/authService.ts`
- `apps/web/src/features/auth/AuthContext.tsx`
- `apps/web/src/features/auth/components/LoginPage.tsx`
- `apps/web/src/features/auth/components/RegisterPage.tsx`
- `apps/web/src/features/auth/components/PrivateRoute.tsx`

### Frontend Files Modified
- `apps/web/src/api/client.ts` - Added JWT interceptor
- `apps/web/src/App.tsx` - Added auth routing
- `apps/web/src/components/Navigation.tsx` - Added login/logout buttons
- `apps/web/src/features/gallery/GalleryPage.tsx` - Uses authenticated user
- `apps/web/src/api/gallery.ts` - Removed userId parameter
- `apps/web/src/api/upload.ts` - Removed userId parameter
- `apps/web/src/features/upload/hooks/useFileUpload.ts` - Removed TEST_USER_ID
- `apps/web/src/features/upload/hooks/useChunkedUpload.ts` - Removed TEST_USER_ID

## 🎯 Success Criteria

✅ Users can register new accounts
✅ Users can login with email/password
✅ JWT tokens are generated and stored
✅ Protected routes require authentication
✅ API endpoints use authenticated user ID
✅ Photo ownership is verified
✅ Logout clears authentication
✅ Token expiration is handled
✅ 401 errors redirect to login
✅ All hardcoded userIds removed

## 🚀 Next Steps

1. **Test Authentication Flow:**
   - Register a new user
   - Login with credentials
   - Upload photos
   - View gallery (should only show user's photos)
   - Logout and verify redirect

2. **Security Enhancements:**
   - Change JWT secret in production
   - Add token refresh mechanism
   - Add rate limiting for login attempts
   - Add password reset functionality
   - Add email verification

3. **Production Deployment:**
   - Use environment variables for JWT secret
   - Configure HTTPS
   - Set secure cookie flags
   - Add CSRF protection for state-changing operations

## ⚠️ Important Notes

1. **JWT Secret:**
   - Change the default JWT secret in production
   - Use a strong, random secret (minimum 32 characters)
   - Store in environment variables

2. **Password Hashing:**
   - Passwords are hashed with BCrypt
   - Never store plain passwords
   - Password validation: minimum 8 characters

3. **Token Storage:**
   - JWT tokens are stored in localStorage
   - Consider using httpOnly cookies for production
   - Tokens expire after 24 hours

4. **CORS:**
   - Currently configured for `http://localhost:3000`
   - Update for production domain

5. **User Status:**
   - Only ACTIVE users can login
   - SUSPENDED and DELETED users are blocked

