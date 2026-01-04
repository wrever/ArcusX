# API Reference

Complete reference documentation for the ArcusX REST API.

## Base URL

- **Development**: `http://arcusx.pro/api`
- **Production**: `https://arcusx.pro/api`

All authenticated endpoints are under `/auth/` path.

## Authentication

All API requests (except login and register) require a JWT token in the Authorization header:

```http
Authorization: Bearer {jwt_token}
```

## Response Format

All responses follow this structure:

**Success**
```json
{
  "success": true,
  "message": "Operation successful",
  "data": { /* response data */ }
}
```

**Error**
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error information"
}
```

## Endpoint Categories

### Authentication Endpoints

User registration, login, and wallet management.

- [Login](authentication.md#login)
- [Register](authentication.md#register)
- [Register Wallet](authentication.md#register-wallet)
- [Verify Wallet](authentication.md#verify-wallet)
- [Sync Supabase User](authentication.md#sync-supabase-user)

### Task Endpoints

Task creation, retrieval, and management.

- [Get Tasks](tasks.md#get-tasks)
- [Get User Tasks](tasks.md#get-user-tasks)
- [Get Accepted Tasks](tasks.md#get-accepted-tasks)
- [Get Task Details](tasks.md#get-task-details)
- [Create Task](tasks.md#create-task)
- [Complete Task](tasks.md#complete-task)
- [Task Stats](tasks.md#task-stats)

### Proposal Endpoints

Worker proposals and application management.

- [Apply to Task](proposals.md#apply-to-task)
- [Get Task Proposals](proposals.md#get-task-proposals)
- [Select Proposal](proposals.md#select-proposal)

### Escrow Endpoints

Escrow contract creation and status management.

- [Create Escrow](escrow.md#create-escrow)
- [Get Escrow Status](escrow.md#get-escrow-status)
- [Save Escrow Secret](escrow.md#save-escrow-secret)
- [Get Escrow Secret](escrow.md#get-escrow-secret)

### Message Endpoints

User messaging and communication.

- [Get Messages](messages.md#get-messages)
- [Send Message](messages.md#send-message)

### Dispute Endpoints

Dispute creation and management.

- [Create Dispute](disputes.md#create-dispute)
- [Get User Disputes](disputes.md#get-user-disputes)
- [Get Dispute Chat](disputes.md#get-dispute-chat)
- [Get Dispute Files](disputes.md#get-dispute-files)
- [Get Dispute Timeline](disputes.md#get-dispute-timeline)

### User Endpoints

User profile and account management.

- [Get User Details](users.md#get-user-details)
- [Get User Profile](users.md#get-user-profile)
- [Update User](users.md#update-user)
- [Update User Profile](users.md#update-user-profile)
- [Get User Public Stats](users.md#get-user-public-stats)
- [Get Completed Tasks Count](users.md#get-completed-tasks-count)
- [Get User Limits](users.md#get-user-limits)

### Transaction Endpoints

Transaction history and management.

- [Get User Transactions](transactions.md#get-user-transactions)
- [Get User Earnings Summary](transactions.md#get-user-earnings-summary)
- [Save Pending Transaction](transactions.md#save-pending-transaction)
- [Get Pending Transaction](transactions.md#get-pending-transaction)
- [Submit Complete Transaction](transactions.md#submit-complete-transaction)

### Rating Endpoints

User ratings and reviews.

- [Create Rating](ratings.md#create-rating)
- [Get Ratings](ratings.md#get-ratings)
- [Get User Rating Summary](ratings.md#get-user-rating-summary)

### Notification Endpoints

User notifications.

- [Get Notifications](notifications.md#get-notifications)
- [Mark Notification Read](notifications.md#mark-notification-read)
- [Get Pending Actions](notifications.md#get-pending-actions)

### Cancellation Endpoints

Task cancellation and refunds.

- [Check Cancellation Allowed](cancellation.md#check-cancellation-allowed)
- [Cancel Task](cancellation.md#cancel-task)

### Admin Endpoints

Administrative operations (admin access required).

- [Admin Login](admin.md#admin-login)
- [Get Admin Stats](admin.md#get-admin-stats)
- [Get Admin Users](admin.md#get-admin-users)
- [Get Admin Tasks](admin.md#get-admin-tasks)
- [Get Admin Disputes](admin.md#get-admin-disputes)
- [Resolve Dispute](admin.md#resolve-dispute)
- [And more...](admin.md)

### Platform Endpoints

Platform configuration and status.

- [Get Platform Fee](platform.md#get-platform-fee)
- [Get Stats](platform.md#get-stats)

## HTTP Methods

- `GET`: Retrieve resources
- `POST`: Create resources or perform actions
- `PUT`: Update resources (some endpoints)
- `DELETE`: Delete resources (admin endpoints)

## Status Codes

- `200 OK`: Successful request
- `201 Created`: Resource created successfully
- `400 Bad Request`: Invalid request parameters
- `401 Unauthorized`: Authentication required or invalid
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `500 Internal Server Error`: Server error

## Error Handling

Always check the `success` field in responses:

```typescript
const response = await fetch(endpoint);
const data = await response.json();

if (!data.success) {
  // Handle error
  console.error(data.message);
  // data.error may contain additional details
}
```

## Rate Limits

Currently, ArcusX does not enforce strict rate limits. However:

- Implement reasonable request throttling
- Cache responses when appropriate
- Avoid excessive polling
- Respect server resources

## Pagination

Some endpoints support pagination:

```http
GET /api/auth/get_tasks.php?page=1&limit=20
```

Parameters:
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 20, max: 100)

## Filtering and Sorting

Many endpoints support filtering and sorting via query parameters. See individual endpoint documentation for details.

## Data Formats

### Dates

Dates are returned in ISO 8601 format: `YYYY-MM-DD HH:MM:SS`

### Currency

All monetary values are in USDC with 7 decimal precision.

### Wallet Addresses

Stellar wallet addresses are 56-character strings starting with 'G'.

### Contract IDs

Escrow contract IDs are Soroban contract addresses starting with 'C'.

## SDK and Libraries

While ArcusX doesn't provide official SDKs, you can use our TypeScript services as a reference:

- Authentication Service: `src/services/authService.ts`
- Escrow Service: `src/services/trustlessWorkEscrowService.ts`
- Admin Service: `src/services/adminService.ts`

## Support

For API support:

- Review endpoint-specific documentation
- Check error messages for details
- Review code examples
- Contact support through official channels

## Next Steps

- Review [Authentication Endpoints](authentication.md)
- Explore [Task Endpoints](tasks.md)
- Study [Escrow Endpoints](escrow.md)
- Learn about [Error Handling](../developer-guide/api-integration.md#error-handling)

