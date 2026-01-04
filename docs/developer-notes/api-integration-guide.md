# API Integration Guide

This guide will help you integrate with the ArcusX REST API to build applications and automate workflows.

## API Overview

The ArcusX API is a RESTful API that provides access to platform functionality including:

- User authentication and management
- Task creation and management
- Proposal submission and review
- Escrow contract operations
- Payment processing
- Dispute resolution
- Messaging and notifications
- Administrative operations

## Base URL

- **Development**: `http://arcusx.pro/api`
- **Production**: `https://arcusx.pro/api`

All endpoints are prefixed with `/auth/` for authenticated routes.

## Authentication

ArcusX uses JWT (JSON Web Tokens) for authentication. Most endpoints require a valid JWT token in the Authorization header.

### Getting a Token

**Login Endpoint**

```http
POST /api/auth/login.php
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "your_password"
}
```

**Response**

```json
{
  "success": true,
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "username": "username"
  }
}
```

### Using the Token

Include the token in the Authorization header:

```http
GET /api/auth/get_tasks.php
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

### Token Expiration

JWT tokens expire after a set period. Handle 401 responses by redirecting to login or refreshing the token.

## Request Format

### Headers

All requests should include:

```http
Content-Type: application/json
Authorization: Bearer {token}
```

### Request Body

POST and PUT requests should send JSON:

```json
{
  "field1": "value1",
  "field2": "value2"
}
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {
    // Response data
  }
}
```

### Error Response

```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

### HTTP Status Codes

- `200 OK`: Request successful
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request data
- `401 Unauthorized`: Authentication required or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Common Endpoints

### Authentication

**Login**
```http
POST /api/auth/login.php
```

**Register**
```http
POST /api/auth/register.php
```

**Register Wallet**
```http
POST /api/auth/register_wallet.php
```

### Tasks

**Get Tasks**
```http
GET /api/auth/get_tasks.php
```

**Create Task**
```http
POST /api/auth/create_task.php
Body: {
  "title": "Task title",
  "description": "Task description",
  "price": "100.00",
  "currency": "USDC",
  "category": "Development",
  "difficulty": "Intermediate"
}
```

**Get Task Details**
```http
GET /api/auth/get_task_details.php?task_id=1
```

**Apply to Task**
```http
POST /api/auth/apply_task.php
Body: {
  "task_id": 1,
  "message": "Proposal message",
  "portfolio_url": "https://portfolio.example.com",
  "worker_wallet_address": "G..."
}
```

### Escrow

**Create Escrow**
```http
POST /api/auth/create_escrow.php
Body: {
  "task_id": 1,
  "escrow_id": "C...",
  "escrow_status": "pending_funding",
  "escrow_amount": "100.5025"
}
```

**Get Escrow Status**
```http
GET /api/auth/get_escrow_status.php?task_id=1
```

### Messages

**Get Messages**
```http
GET /api/auth/get_messages.php?task_id=1
```

**Send Message**
```http
POST /api/auth/send_message.php
Body: {
  "task_id": 1,
  "receiver_id": 2,
  "message": "Message content"
}
```

## Code Examples

### JavaScript/TypeScript

```typescript
const API_URL = 'https://arcusx.pro/api';

async function login(email: string, password: string) {
  const response = await fetch(`${API_URL}/auth/login.php`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password }),
  });
  
  const data = await response.json();
  if (data.success) {
    localStorage.setItem('token', data.token);
    return data;
  }
  throw new Error(data.message);
}

async function getTasks(token: string) {
  const response = await fetch(`${API_URL}/auth/get_tasks.php`, {
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });
  
  return response.json();
}
```

### PHP

```php
<?php
$apiUrl = 'https://arcusx.pro/api';
$token = 'your_jwt_token';

// Login
$ch = curl_init($apiUrl . '/auth/login.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
    'email' => 'user@example.com',
    'password' => 'password'
]));
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Content-Type: application/json'
]);

$response = curl_exec($ch);
$data = json_decode($response, true);

// Get Tasks
$ch = curl_init($apiUrl . '/auth/get_tasks.php');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_HTTPHEADER, [
    'Authorization: Bearer ' . $token
]);

$response = curl_exec($ch);
$tasks = json_decode($response, true);
?>
```

### Python

```python
import requests

API_URL = 'https://arcusx.pro/api'

def login(email, password):
    response = requests.post(
        f'{API_URL}/auth/login.php',
        json={'email': email, 'password': password},
        headers={'Content-Type': 'application/json'}
    )
    data = response.json()
    if data['success']:
        return data['token']
    raise Exception(data['message'])

def get_tasks(token):
    response = requests.get(
        f'{API_URL}/auth/get_tasks.php',
        headers={'Authorization': f'Bearer {token}'}
    )
    return response.json()
```

## Error Handling

Always implement proper error handling:

```typescript
async function apiCall(endpoint: string, options: RequestInit = {}) {
  try {
    const response = await fetch(endpoint, options);
    const data = await response.json();
    
    if (!response.ok) {
      if (response.status === 401) {
        // Handle authentication error
        // Redirect to login or refresh token
      }
      throw new Error(data.message || 'Request failed');
    }
    
    return data;
  } catch (error) {
    // Handle network errors, timeouts, etc.
    console.error('API Error:', error);
    throw error;
  }
}
```

## Rate Limiting

Currently, ArcusX does not enforce strict rate limits, but:

- Implement reasonable request throttling in your application
- Cache responses when appropriate
- Avoid excessive polling
- Respect server resources

## Best Practices

### Security

- Never expose JWT tokens in client-side code (if public)
- Store tokens securely (localStorage for web apps, secure storage for mobile)
- Use HTTPS in production
- Validate all input data
- Sanitize user inputs

### Performance

- Implement response caching
- Use pagination for large datasets
- Minimize unnecessary requests
- Batch operations when possible

### Reliability

- Implement retry logic for failed requests
- Handle network timeouts
- Gracefully handle API errors
- Provide user feedback for long operations

## Testing

### Using Postman

1. Import API endpoints into Postman
2. Set up environment variables (base URL, token)
3. Create collection with authentication pre-request script
4. Test all endpoints

### Using cURL

```bash
# Login
curl -X POST https://arcusx.pro/api/auth/login.php \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password"}'

# Get Tasks (with token)
curl https://arcusx.pro/api/auth/get_tasks.php \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Next Steps

- Review [Complete API Reference](../how-arcusx-works/api-reference.md)
- Learn about [Stellar Integration](../how-arcusx-works/stellar-network-integration.md)
- Explore [Escrow Operations](../how-arcusx-works/smart-escrow-contracts-in-arcusx.md)
- Study [Authentication Details](developer-guide.md)

Happy integrating!

