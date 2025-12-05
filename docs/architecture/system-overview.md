# System Overview

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │  Components  │  │    Hooks     │  │   Services   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                             │ HTTP/REST API
                             │
┌────────────────────────────┼────────────────────────────────┐
│                    Backend (PHP)                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │   Endpoints  │  │   JWT Auth   │  │   Database   │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
│         │                  │                  │             │
│         └──────────────────┼──────────────────┘             │
│                            │                                │
└────────────────────────────┼────────────────────────────────┘
                             │
                             │ Horizon API
                             │
┌────────────────────────────┼────────────────────────────────┐
│              Stellar Blockchain (Testnet)                    │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Escrow Accts │  │ Transactions │  │   Wallets    │     │
│  └──────────────┘  └──────────────┘  └──────────────┘     │
└─────────────────────────────────────────────────────────────┘
```

## Component Layers

### 1. Frontend Layer

**Technology**: React 19.0.0 + TypeScript 5.7.2

**Responsibilities**:
- User interface and interactions
- Wallet connection and management
- Transaction signing
- State management
- API communication

**Key Components**:
- `SuperviseTask.tsx` - Task supervision and fund withdrawal
- `ProposalReview.tsx` - Proposal review and escrow creation
- `EscrowProcessPopup.tsx` - Interactive escrow flow
- `stellarEscrowService.ts` - Stellar blockchain services

### 2. Backend Layer

**Technology**: PHP + MySQL/MariaDB

**Responsibilities**:
- API endpoints
- Authentication and authorization
- Database operations
- Business logic
- XDR transaction storage

**Key Features**:
- RESTful API design
- JWT authentication
- Database abstraction
- Error handling

### 3. Blockchain Layer

**Technology**: Stellar SDK

**Responsibilities**:
- Escrow account creation
- Multi-signature setup
- Transaction creation and signing
- Payment processing
- Account management

**Key Features**:
- Multi-signature (2-of-2) escrow
- XDR transaction handling
- Horizon API integration
- Wallet integration

## Data Flow

### Task Creation Flow

```
1. Client creates task (Frontend)
   ↓
2. Task saved to database (Backend)
   ↓
3. Task displayed in dashboard (Frontend)
```

### Proposal Flow

```
1. Worker applies to task (Frontend)
   ↓
2. Proposal saved to database (Backend)
   ↓
3. Client reviews proposals (Frontend)
   ↓
4. Client selects proposal (Frontend)
   ↓
5. Escrow account created (Stellar)
   ↓
6. Escrow funded (Stellar)
   ↓
7. Task status updated (Backend)
```

### Payment Flow

```
1. Both parties accept completion (Frontend)
   ↓
2. Transaction XDR created (Frontend)
   ↓
3. Client signs transaction (Wallet)
   ↓
4. XDR saved to database (Backend)
   ↓
5. Worker signs transaction (Wallet)
   ↓
6. Complete XDR saved (Backend)
   ↓
7. Transaction submitted to Stellar (Frontend)
   ↓
8. Funds released to worker (Stellar)
```

## Security Architecture

### Authentication

- **JWT Tokens**: Stateless authentication
- **OAuth**: Google and GitHub integration via Supabase
- **Token Storage**: localStorage (frontend)
- **Token Validation**: Backend middleware

### Authorization

- **Role-based**: Client vs Worker
- **Resource-based**: Users can only access their own resources
- **Task-based**: Only task participants can access task data

### Blockchain Security

- **Multi-signature**: Requires both parties to sign
- **Escrow Accounts**: Dedicated accounts per task
- **Transaction Validation**: Sequence and balance checks
- **Wallet Verification**: Address validation

## Scalability Considerations

### Current Limitations

- Single database instance
- No caching layer
- Direct Horizon API calls
- No load balancing

### Future Improvements

- Database replication
- Redis caching
- API rate limiting
- CDN for static assets
- Horizontal scaling

## Technology Choices

### Why React?

- Component-based architecture
- Large ecosystem
- TypeScript support
- Good performance

### Why PHP?

- Simple deployment
- Good database integration
- Mature ecosystem
- Easy to maintain

### Why Stellar?

- Fast transactions (3-5 seconds)
- Low fees (~0.0001 XLM)
- Multi-signature support
- Good developer tools

---

**Next**: [Frontend Architecture →](frontend.md)

