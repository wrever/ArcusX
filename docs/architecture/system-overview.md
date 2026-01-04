# System Architecture

This document provides a comprehensive overview of the ArcusX system architecture.

## High-Level Architecture

ArcusX is built as a three-tier architecture:

```
┌─────────────────────────────────────────────────────────┐
│                    Frontend Layer                        │
│  React 19 + TypeScript | Vite | Chakra UI               │
│  User Interface | Wallet Integration | State Management  │
└─────────────────────────────────────────────────────────┘
                           │
                           │ HTTP/REST API
                           │
┌─────────────────────────────────────────────────────────┐
│                    Backend Layer                         │
│  PHP | MySQL | JWT Authentication                        │
│  Business Logic | Data Management | API Endpoints        │
└─────────────────────────────────────────────────────────┘
                           │
                           │ Database Queries
                           │
┌─────────────────────────────────────────────────────────┐
│                  Blockchain Layer                        │
│  Stellar Network | Trustless Work | Smart Contracts      │
│  Payments | Escrow | Transactions                        │
└─────────────────────────────────────────────────────────┘
```

## Frontend Architecture

### Technology Stack

- **Framework**: React 19.0.0
- **Language**: TypeScript 5.7.2
- **Build Tool**: Vite 6.2.0
- **Routing**: React Router DOM 6.30.0
- **UI Library**: Chakra UI 3.15.0
- **Animations**: Framer Motion 12.6.3
- **State Management**: React Hooks + Context

### Component Structure

```
src/
├── components/          # React components
│   ├── Dashboard.tsx
│   ├── CreateTask.tsx
│   ├── ApplyTask.tsx
│   ├── ProposalReview.tsx
│   ├── SuperviseTask.tsx
│   ├── DisputeManagement.tsx
│   └── ...
├── services/           # API and business logic services
│   ├── authService.ts
│   ├── trustlessWorkEscrowService.ts
│   ├── adminService.ts
│   └── ...
├── hooks/              # Custom React hooks
│   ├── useAuth.ts
│   ├── useWallet.ts
│   └── ...
└── config/             # Configuration files
    ├── database.ts
    ├── trustlessWork.ts
    └── ...
```

### Key Components

**Dashboard**: Main task listing and navigation
**CreateTask**: Task creation interface
**ApplyTask**: Worker proposal submission
**ProposalReview**: Client proposal review and escrow creation
**SuperviseTask**: Task supervision and payment release
**DisputeManagement**: Dispute resolution interface

## Backend Architecture

### Technology Stack

- **Language**: PHP 7.4+
- **Database**: MySQL/MariaDB
- **Authentication**: JWT (Firebase JWT 6.0)
- **OAuth**: Supabase integration

### API Structure

```
backend_externo/
├── *.php              # REST API endpoints
├── config.php         # Database and JWT configuration
├── admin_actions.php  # Admin operation handlers
└── composer.json      # PHP dependencies
```

### Endpoint Organization

Endpoints are organized by functionality:

- **Authentication**: `login.php`, `register.php`, `register_wallet.php`
- **Tasks**: `create_task.php`, `get_tasks.php`, `get_task_details.php`
- **Proposals**: `apply_task.php`, `get_task_proposals.php`, `select_proposal.php`
- **Escrow**: `create_escrow.php`, `get_escrow_status.php`
- **Messages**: `send_message.php`, `get_messages.php`
- **Disputes**: `create_dispute.php`, `get_dispute_chat.php`
- **Admin**: `admin.php`, `admin_login.php`

### Database Schema

**Core Tables**:
- `users`: User accounts and authentication
- `tasks`: Task listings
- `applications`: Worker proposals
- `messages`: User communications
- `disputes`: Dispute records
- `ratings`: User ratings
- `notifications`: User notifications

**Relationships**:
- Users → Tasks (one-to-many)
- Tasks → Applications (one-to-many)
- Tasks → Messages (one-to-many)
- Tasks → Disputes (one-to-one)

## Blockchain Integration

### Stellar Network

- **Network**: Stellar (Testnet/Mainnet)
- **Currency**: USDC on Stellar
- **Transactions**: Payment operations
- **Confirmation**: 3-5 seconds

### Trustless Work

- **Platform**: Trustless Work escrow infrastructure
- **Contracts**: Single-release escrow smart contracts
- **API Integration**: REST API for contract operations
- **Automation**: Automatic contract execution

### Wallet Integration

- **Primary**: Freighter wallet extension
- **Additional**: xBull, Albedo, Rabet, Lobstr
- **SDK**: @creit.tech/stellar-wallets-kit
- **Signing**: Client-side transaction signing

## Data Flow

### Task Creation Flow

```
1. Client creates task (Frontend)
   ↓
2. POST /api/auth/create_task.php (Backend)
   ↓
3. Task saved to database
   ↓
4. Task appears in dashboard
```

### Escrow Creation Flow

```
1. Client selects proposal (Frontend)
   ↓
2. Create escrow contract (Trustless Work API)
   ↓
3. Client signs transaction (Wallet)
   ↓
4. Contract deployed on Stellar
   ↓
5. Escrow ID saved to database
   ↓
6. Client funds escrow
```

### Payment Release Flow

```
1. Worker marks task complete (Frontend)
   ↓
2. Client approves work (Frontend)
   ↓
3. Approve milestone (Trustless Work API)
   ↓
4. Release funds (Trustless Work API)
   ↓
5. Transaction submitted to Stellar
   ↓
6. Payment confirmed (3-5 seconds)
   ↓
7. Database updated
```

## Security Architecture

### Authentication

- **JWT Tokens**: Stateless authentication
- **Token Storage**: LocalStorage (frontend)
- **Token Validation**: Backend validation on each request
- **OAuth**: Supabase integration for Google/GitHub

### Authorization

- **Role-Based**: User, Admin roles
- **Resource-Based**: Users can only access their resources
- **Admin Access**: Separate admin authentication

### Data Security

- **Encryption**: HTTPS/TLS for all communications
- **Password Hashing**: bcrypt with salt
- **Input Validation**: Frontend and backend validation
- **SQL Injection Prevention**: Prepared statements

### Blockchain Security

- **Private Keys**: Stored in user wallets (never on servers)
- **Transaction Signing**: Client-side signing
- **Smart Contracts**: Audited Trustless Work contracts
- **Immutability**: Blockchain transaction immutability

## Performance Optimizations

### Caching Strategy

- **API Response Caching**: 5-second cache for escrow data
- **Debouncing**: User input debouncing (500ms)
- **Polling Optimization**: Reduced polling intervals (5-8s)

### Database Optimization

- **Indexing**: Strategic indexes on frequently queried columns
- **Query Optimization**: Efficient SQL queries
- **Connection Pooling**: Database connection management

### Frontend Optimization

- **Code Splitting**: Lazy loading of components
- **Bundle Optimization**: Vite build optimizations
- **Asset Optimization**: Image and asset optimization

## Scalability Considerations

### Horizontal Scaling

- **Stateless Backend**: JWT enables horizontal scaling
- **Database Replication**: Read replicas for scaling reads
- **CDN**: Static asset delivery via CDN

### Vertical Scaling

- **Server Resources**: CPU and memory optimization
- **Database Resources**: Efficient database configuration
- **Caching Layers**: Redis for advanced caching (future)

## Integration Points

### External Services

- **Supabase**: Authentication and user management
- **Trustless Work**: Escrow contract infrastructure
- **Stellar Horizon**: Blockchain data queries
- **Wallet Providers**: Freighter and other wallets

### Internal Services

- **REST API**: Backend PHP endpoints
- **Real-time Messaging**: Database-driven messaging
- **Notification System**: In-app notifications
- **Admin Panel**: Administrative operations

## Monitoring and Logging

### Current Implementation

- **Error Logging**: PHP error logs
- **Frontend Logging**: Console logging (development)
- **Transaction Tracking**: Blockchain transaction tracking

### Future Enhancements

- **Application Monitoring**: APM tools
- **Error Tracking**: Sentry or similar
- **Analytics**: User behavior analytics
- **Performance Monitoring**: Response time tracking

## Deployment Architecture

### Development Environment

- **Frontend**: Vite dev server (localhost:5173)
- **Backend**: PHP built-in server or local Apache/Nginx
- **Database**: Local MySQL instance
- **Blockchain**: Stellar Testnet

### Production Environment

- **Frontend**: Static files served via CDN/web server
- **Backend**: PHP-FPM with Nginx/Apache
- **Database**: Managed MySQL database
- **Blockchain**: Stellar Mainnet

## Technology Decisions

### Why React?

- Component reusability
- Strong ecosystem
- TypeScript support
- Performance optimizations

### Why PHP?

- Rapid development
- Easy deployment
- Mature ecosystem
- Good database integration

### Why Stellar?

- Fast transactions
- Low fees
- USDC support
- Proven reliability

### Why Trustless Work?

- Pre-audited contracts
- Developer-friendly API
- Rapid integration
- Active maintenance

## Future Architecture Considerations

### Planned Improvements

- **API Versioning**: Versioned API endpoints
- **GraphQL**: Consider GraphQL for flexible queries
- **Microservices**: Consider service decomposition
- **Event-Driven**: Event-driven architecture for scalability

## Next Steps

- Review [Database Schema](database-schema.md)
- Explore [API Design](api-design.md)
- Study [Security Model](security-model.md)
- Learn about [Deployment](deployment.md)

Understanding the architecture helps in development, debugging, and extension of the platform.

