# ArcusX

<div align="center">

**The Future of Freelancing on Blockchain**

Empowering freelancers with fast, secure, and borderless crypto payments on Stellar from Chile.

[![Stellar](https://img.shields.io/badge/Stellar-Testnet-blue)](https://www.stellar.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-3178c6)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Technology Stack](#technology-stack)
- [Architecture](#architecture)
- [Getting Started](#getting-started)
- [Configuration](#configuration)
- [Usage](#usage)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Contributing](#contributing)
- [License](#license)

## 🎯 Overview

ArcusX is a decentralized freelancing platform built on the Stellar blockchain that connects clients with freelancers through secure, trustless escrow smart contracts. By leveraging Stellar's fast, low-cost transactions and Freighter wallet integration, ArcusX eliminates intermediaries and provides a transparent, efficient marketplace for freelance work.

### Key Benefits

- **Ultra-Low Fees**: Only 0.3% commission (vs 10-20% on traditional platforms)
- **Instant Payments**: 3-5 second transaction finality
- **Secure Escrow**: 2-of-2 multisig accounts requiring both parties to approve
- **Global Access**: No banking restrictions or geographic limitations
- **Transparent**: All transactions verifiable on the Stellar blockchain

## ✨ Features

### For Clients
- Create unlimited tasks with flexible budgets in XLM
- Review freelancer proposals and portfolios
- Secure escrow system protects funds until work is approved
- Instant payment processing
- Transparent transaction history on blockchain

### For Freelancers
- Browse and apply to tasks globally
- Secure payment guarantee through escrow
- Fast payment processing (3-5 seconds)
- Low platform fees (0.3% vs 10-20% industry standard)
- Direct wallet-to-wallet payments via Freighter

### Platform Features
- Real-time messaging between parties
- Task management dashboard
- Application tracking system
- Transaction history and escrow status monitoring
- Admin panel for platform management
- Daily/weekly task limits with cooldown system

## 🛠 Technology Stack

### Frontend
- **Framework**: React 19.0.0
- **Language**: TypeScript 5.7.2
- **Build Tool**: Vite 6.2.0
- **Routing**: React Router DOM 6.30.0
- **UI Libraries**:
  - Chakra UI 3.15.0
  - Framer Motion 12.6.3
  - React Icons 5.5.0
- **HTTP Client**: Axios 1.9.0
- **Authentication**: Supabase 2.78.0

### Backend
- **Language**: PHP
- **Database**: MySQL/MariaDB
- **Authentication**: JWT (Firebase JWT 6.0)
- **OAuth**: Supabase (Google, GitHub)

### Blockchain
- **Network**: Stellar Testnet (migrating to Mainnet)
- **Wallet**: Freighter
- **SDK**: Stellar SDK 11.2.2
- **Escrow**: 2-of-2 Multisig accounts
- **Currency**: XLM (Stellar Lumens)
- **Horizon Server**: `https://horizon-testnet.stellar.org`

## 🏗 Architecture

```
ArcusX/
├── arcusx/                    # Frontend React + TypeScript
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── hooks/             # Custom React hooks
│   │   ├── services/          # API and blockchain services
│   │   ├── config/            # Configuration files
│   │   └── css/               # Stylesheets
│   └── package.json
│
├── backend_externo/           # Backend PHP API
│   ├── *.php                  # REST API endpoints
│   ├── config.php             # Database and JWT configuration
│   └── composer.json          # PHP dependencies
│
└── docs/                      # Documentation
```

### Escrow System

ArcusX uses a 2-of-2 multisig escrow system on Stellar:

1. **Escrow Creation**: A dedicated Stellar account is created for each task
2. **Multisig Setup**: Both client and freelancer are set as signers (weight = 1 each)
3. **Funding**: Client funds the escrow with the task amount
4. **Work Completion**: Both parties approve completion
5. **Fund Release**: Both parties sign the release transaction
6. **Payment**: Funds are instantly transferred to the freelancer

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ and npm
- PHP 7.4+ and Composer
- MySQL/MariaDB
- Freighter wallet extension
- Stellar Testnet account (for testing)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/yourusername/arcusx.git
   cd arcusx
   ```

2. **Install Frontend Dependencies**
   ```bash
   cd arcusx
   npm install
   ```

3. **Install Backend Dependencies**
   ```bash
   cd backend_externo
   composer install
   ```

4. **Database Setup**
   - Create a MySQL database
   - Import the schema (see `docs/` for database structure)
   - Update `backend_externo/config.php` with your database credentials

5. **Environment Configuration**
   - Copy `arcusx/.env.example` to `arcusx/.env` (if exists)
   - Update API URLs and Supabase credentials
   - Configure JWT secret in `backend_externo/config.php`

6. **Start Development Server**
   ```bash
   # Frontend
   cd arcusx
   npm run dev

   # Backend
   # Configure your PHP server to serve backend_externo/
   ```

## ⚙️ Configuration

### Frontend Configuration

Update `arcusx/src/config/database.ts`:
```typescript
export const API_URL = import.meta.env.DEV 
  ? 'http://arcusx.one/api'  // Development
  : 'https://arcusx.one/api'; // Production
```

Update `arcusx/src/config/supabase.ts` with your Supabase credentials.

### Backend Configuration

Update `backend_externo/config.php`:
```php
$db_config = [
    'host' => 'localhost',
    'user' => 'your_user',
    'password' => 'your_password',
    'database' => 'arcusxon_users'
];

$jwt_secret = "your_jwt_secret_key";
```

### Stellar Network

Currently configured for **Testnet**. To switch to Mainnet:

Update `arcusx/src/hooks/useWallet.ts`:
```typescript
network: WalletNetwork.MAINNET // Change from TESTNET
```

Update Horizon server URL in `arcusx/src/services/stellarEscrowService.ts`:
```typescript
return new Horizon.Server('https://horizon.stellar.org'); // Mainnet
```

## 📖 Usage

### Creating a Task

1. Log in to ArcusX
2. Navigate to "Create Task"
3. Fill in task details (title, description, budget in XLM)
4. Select category and difficulty
5. Submit the task

### Applying to a Task

1. Browse available tasks
2. Click "Apply" on a task
3. Connect your Freighter wallet
4. Submit your proposal with portfolio link
5. Wait for client selection

### Creating Escrow

1. Client selects a proposal
2. Connect Freighter wallet
3. Create escrow account (2.5 XLM required)
4. Fund escrow with task amount
5. Work begins

### Completing Work and Payment

1. Freelancer completes work and marks as done
2. Client reviews and approves
3. Both parties confirm completion
4. Freelancer withdraws funds (both signatures required)
5. Payment processed in 3-5 seconds

## 📁 Project Structure

### Frontend Components

- `App.tsx` - Main application router
- `Dashboard.tsx` - Main dashboard with task listings
- `CreateTask.tsx` - Task creation form
- `ApplyTask.tsx` - Application form
- `ProposalReview.tsx` - Proposal review and escrow creation
- `SuperviseTask.tsx` - Task supervision and fund withdrawal
- `EscrowProcessPopup.tsx` - Interactive escrow creation flow

### Services

- `stellarEscrowService.ts` - Stellar blockchain operations
- `authService.ts` - Authentication services
- `adminService.ts` - Admin panel services

### Hooks

- `useAuth.ts` - Authentication state management
- `useWallet.ts` - Freighter wallet integration

### Backend Endpoints

Key API endpoints:
- `/api/auth/login.php` - User login
- `/api/auth/register.php` - User registration
- `/api/auth/create_task.php` - Create task
- `/api/auth/apply_task.php` - Apply to task
- `/api/auth/create_escrow.php` - Register escrow
- `/api/auth/save_pending_transaction.php` - Save transaction XDR
- `/api/auth/submit_complete_transaction.php` - Submit transaction

See `docs/api/` for complete API documentation.

## 🔒 Security

- **Multisig Escrow**: Requires both parties to approve fund release
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: All inputs validated on frontend and backend
- **Stellar Security**: Leverages Stellar's battle-tested blockchain
- **No Centralized Control**: Platform cannot freeze or seize funds

## 📊 Current Status

### ✅ Completed
- Full authentication system (Email/Password + OAuth)
- Task creation and management
- Proposal/application system
- Freighter wallet integration
- Stellar escrow system (2-of-2 multisig)
- Escrow creation, funding, and withdrawal
- Transaction pending system (XDR storage)
- Real-time messaging
- Admin dashboard

### 🚧 In Progress
- Migration to Stellar Mainnet
- Code cleanup and optimization

### 📋 Roadmap
- Dispute resolution system
- Rating and review system
- Advanced analytics dashboard
- Mobile app development
- Multi-asset support (USDC, EURT, etc.)

## 🤝 Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

### Development Guidelines

- Follow TypeScript best practices
- Write meaningful commit messages
- Add comments for complex logic
- Test thoroughly before submitting PR
- Update documentation as needed

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔗 Links

- **Stellar Documentation**: https://developers.stellar.org/
- **Freighter Wallet**: https://www.freighter.app/
- **Stellar SDK**: https://github.com/stellar/js-stellar-sdk
- **Horizon API**: https://horizon-testnet.stellar.org/

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

<div align="center">

**Built with ❤️ on Stellar from Chile**

*Decentralizing the Future of Freelancing*

</div>
