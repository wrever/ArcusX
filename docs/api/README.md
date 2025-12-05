# API Reference

Complete API documentation for ArcusX backend endpoints.

## Base URL

- **Development**: `http://arcusx.one/api`
- **Production**: `https://arcusx.one/api`

## Authentication

Most endpoints require JWT authentication. Include the token in the Authorization header:

```
Authorization: Bearer <your_jwt_token>
```

## Response Format

### Success Response

```json
{
  "success": true,
  "message": "Operation successful",
  "data": { ... }
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

## Endpoints

- [Authentication](authentication.md) - Login, register, OAuth sync
- [Tasks](tasks.md) - Task management endpoints
- [Proposals](proposals.md) - Proposal and application endpoints
- [Messages](messages.md) - Messaging system endpoints
- [Escrow](escrow.md) - Escrow and transaction endpoints
- [Wallet](wallet.md) - Wallet management endpoints

## Rate Limiting

Currently, there are no rate limits implemented. This may change in future versions.

## CORS

CORS is enabled for all origins. In production, consider restricting this to specific domains.

---

**Next**: [Authentication →](authentication.md)

