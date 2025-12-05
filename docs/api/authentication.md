# Authentication API

Endpoints for user authentication and registration.

## POST /api/auth/register.php

Register a new user account.

### Request Body

```json
{
  "username": "string",
  "email": "string",
  "password": "string"
}
```

### Response

```json
{
  "success": true,
  "message": "User registered successfully",
  "data": {
    "user_id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

### Error Codes

- `400` - Invalid input data
- `409` - Email already exists
- `500` - Server error

---

## POST /api/auth/login.php

Authenticate a user and receive a JWT token.

### Request Body

```json
{
  "email": "string",
  "password": "string"
}
```

### Response

```json
{
  "success": true,
  "message": "Login successful",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": 1,
      "username": "john_doe",
      "email": "john@example.com"
    }
  }
}
```

### Error Codes

- `400` - Invalid credentials
- `401` - Unauthorized
- `500` - Server error

---

## POST /api/auth/sync_supabase_user.php

Synchronize a Supabase OAuth user with the backend.

### Request Body

```json
{
  "supabase_user_id": "string",
  "email": "string",
  "username": "string"
}
```

### Headers

```
Authorization: Bearer <supabase_access_token>
```

### Response

```json
{
  "success": true,
  "message": "User synchronized successfully",
  "data": {
    "user_id": 1,
    "username": "john_doe",
    "email": "john@example.com"
  }
}
```

---

## Example Usage

### JavaScript/TypeScript

```typescript
// Register
const registerResponse = await fetch('http://arcusx.one/api/auth/register.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    username: 'john_doe',
    email: 'john@example.com',
    password: 'secure_password'
  })
});

const registerData = await registerResponse.json();

// Login
const loginResponse = await fetch('http://arcusx.one/api/auth/login.php', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    email: 'john@example.com',
    password: 'secure_password'
  })
});

const loginData = await loginResponse.json();
const token = loginData.data.token;

// Store token for future requests
localStorage.setItem('token', token);
```

---

**Next**: [Tasks →](tasks.md)

