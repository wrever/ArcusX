<div align="center">

<img src="./arcusx/src/images/arcus-logo.png" alt="ArcusX Logo" width="200"/>

**The Future of Freelancing on Blockchain**

Empowering freelancers with fast, secure, and borderless crypto payments on Stellar from Chile.

[![Stellar](https://img.shields.io/badge/Stellar-Testnet-blue)](https://www.stellar.org/)
[![React](https://img.shields.io/badge/React-19.0.0-61dafb)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7.2-3178c6)](https://www.typescriptlang.org/)
[![License](https://img.shields.io/badge/License-MIT-green)](LICENSE)

</div>

---

## 📋 Table of Contents

- [Changelog](#changelog)
- [Releases (guía)](./docs/RELEASING.md)
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

## Changelog

Los cambios notables están en **[CHANGELOG.md](./CHANGELOG.md)**.

- **Publicar una versión:** [Guía de releases](./docs/RELEASING.md).
- **Historial etiquetado:** [Releases en GitHub](https://github.com/wrever/ArcusX/releases) (crear el release asociado al tag `v*`).

## 🎯 Overview

ArcusX is a decentralized freelancing platform built on the Stellar blockchain that connects clients with freelancers through secure, trustless escrow contracts powered by Trustless Work. By leveraging Stellar's fast, low-cost transactions and Freighter wallet integration, ArcusX eliminates intermediaries and provides a transparent, efficient marketplace for freelance work.

### Key Benefits

- **Ultra-Low Fees**: Only 0.5% commission (vs 10-20% on traditional platforms)
- **Instant Payments**: 3-5 second transaction finality
- **Secure Escrow**: Trustless Work escrow system with milestone-based payments
- **Global Access**: No banking restrictions or geographic limitations
- **Transparent**: All transactions verifiable on the Stellar blockchain
- **Dispute Resolution**: Built-in dispute management system

## ✨ Features

### For Clients
- Create unlimited tasks with flexible budgets in XLM
- Review freelancer proposals and portfolios
- Secure escrow system protects funds until work is approved
- Instant payment processing
- Transparent transaction history on blockchain

### For Freelancers
- Browse and apply to tasks globally
- Secure payment guarantee through Trustless Work escrow
- Fast payment processing (3-5 seconds)
- Low platform fees (0.5% vs 10-20% industry standard)
- Direct wallet-to-wallet payments via Freighter
- Automatic task deletion after 24 hours of completion

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
- **Escrow**: Trustless Work (single-release escrow contracts)
- **Currency**: USDC on Stellar
- **Escrow Service**: Trustless Work API integration

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

ArcusX uses **Trustless Work** for secure escrow management on Stellar:

1. **Escrow Creation**: Trustless Work contract is initialized for each task
2. **Funding**: Client funds the escrow with the task amount in USDC
3. **Work Completion**: Freelancer marks milestone as completed
4. **Approval**: Client approves the completed milestone
5. **Fund Release**: Client releases funds to the freelancer
6. **Payment**: Funds are instantly transferred to the freelancer (minus 0.5% platform fee)
7. **Dispute Resolution**: Built-in dispute system for conflict resolution

The platform fee (0.5%) is automatically deducted and sent to the configured treasury address.

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
   # → http://localhost:5173

   # Backend (PHP built-in example)
   cd backend_externo
   php -S localhost:8080
   # Point VITE_API_URL=http://localhost:8080 in arcusx/.env for local API
   ```

7. **Backend secrets (required)**
   - Copy `backend_externo/.env.example` values into server env or Apache `SetEnv` (see `.htaccess` template).
   - Never commit real `ARCUSX_JWT_SECRET` or DB passwords.

### Hero public stats

The landing page shows **open tasks**, **registered users**, and **completed volume (USDC)**:

- With **Supabase** configured (`VITE_SUPABASE_URL`), stats come from RPCs (preferred).
- Otherwise **`GET /auth/get_landing_market_stats.php`** (public JSON, no JWT).

### Week 3 reviewer docs

- API list: [`docs/api/ENDPOINTS.md`](./docs/api/ENDPOINTS.md)
- Testnet demo script: [`docs/demo/E2E_TESTNET.md`](./docs/demo/E2E_TESTNET.md)
- Sprint changelog: [`docs/sprints/week-03-changelog-and-architecture.md`](./docs/sprints/week-03-changelog-and-architecture.md)
- InstaAwards: Week 3 [`instaawards-week3.md`](./docs/sprints/instaawards-week3.md) · Week 4 close [`instaawards-week4.md`](./docs/sprints/instaawards-week4.md) · checklist [`week-04-plan-and-checklist.md`](./docs/sprints/week-04-plan-and-checklist.md)
- **ArcusX Guard + agentic payments:** [`docs/agentic-payments/arcusx-guard/`](./docs/agentic-payments/arcusx-guard/) — escrow agéntico + IA protectora
- **ArcusX Deals (acuerdos modulares):** [`docs/agreement-deals/`](./docs/agreement-deals/) — plantillas + link de pago (alquiler, P2P, coaching…)
- Escrow nativo Soroban: [`docs/escrow-native/`](./docs/escrow-native/)

## ⚙️ Configuration

### Frontend Configuration

Update `arcusx/src/config/database.ts`:
```typescript
export const API_URL = import.meta.env.DEV 
  ? 'http://arcusx.pro/api'  // Development
  : 'https://arcusx.pro/api'; // Production
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

Update Trustless Work environment in `arcusx/src/config/trustlessWork.ts`:
```typescript
export const TRUSTLESS_WORK_BASE_URL = 'https://api.trustlesswork.com'; // Mainnet
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
3. Trustless Work escrow contract is created automatically
4. Client funds the escrow with task amount in USDC
5. Work begins

### Completing Work and Payment

1. Freelancer completes work and marks milestone as completed
2. Client reviews and approves the milestone
3. Client releases funds to the freelancer
4. Payment processed in 3-5 seconds (0.5% platform fee deducted automatically)
5. Task is automatically scheduled for deletion after 24 hours

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

- `trustlessWorkEscrowService.ts` - Trustless Work escrow operations
- `platformFeeService.ts` - Platform fee management
- `authService.ts` - Authentication services
- `adminService.ts` - Admin panel services
- `disputeService.ts` - Dispute management

### Hooks

- `useAuth.ts` - Authentication state management
- `useWallet.ts` - Freighter wallet integration

### Backend Endpoints

Key API endpoints:
- `/api/auth/login.php` - User login
- `/api/auth/register.php` - User registration
- `/api/auth/create_task.php` - Create task
- `/api/auth/apply_task.php` - Apply to task
- `/api/auth/select_proposal.php` - Select proposal and create escrow
- `/api/auth/complete_task.php` - Mark task as completed
- `/api/auth/create_dispute.php` - Create dispute
- `/api/auth/admin.php` - Admin panel operations
- `/api/auth/delete_scheduled_tasks.php` - Scheduled task deletion

See `docs/api/` for complete API documentation.

## 🔒 Security

- **Trustless Work Escrow**: Secure escrow contracts managed by Trustless Work
- **JWT Authentication**: Secure token-based authentication
- **Input Validation**: All inputs validated on frontend and backend
- **Stellar Security**: Leverages Stellar's battle-tested blockchain
- **No Centralized Control**: Platform cannot freeze or seize funds
- **Dispute Resolution**: Built-in dispute management with admin oversight
- **Automatic Task Cleanup**: Completed tasks automatically deleted after 24 hours

## 📊 Current Status

### ✅ Completed
- Full authentication system (Email/Password + OAuth)
- Task creation and management
- Proposal/application system
- Freighter wallet integration
- **Trustless Work escrow integration** (fully migrated from multisig)
- Escrow creation, funding, milestone management, and fund release
- **Dispute resolution system** with admin management
- Real-time messaging
- Admin dashboard with fee management (0.5% platform fee)
- Treasury address configuration
- Automatic task deletion (24 hours after completion)
- Platform fee management (configurable via admin panel)
- Escrow status monitoring and verification

### 🚧 In Progress
- Migration to Stellar Mainnet
- Code cleanup and optimization

### 📋 Roadmap
- Rating and review system
- Advanced analytics dashboard
- Mobile app development
- Multi-asset support (additional Stellar assets)
- Referral system implementation

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

- **Website**: https://arcusx.pro/
- **Documentation**: https://docs.arcusx.pro/
- **Stellar Documentation**: https://developers.stellar.org/
- **Freighter Wallet**: https://www.freighter.app/
- **Trustless Work**: https://trustlesswork.com/
- **Stellar SDK**: https://github.com/stellar/js-stellar-sdk
- **Horizon API**: https://horizon-testnet.stellar.org/

## 📧 Contact

For questions or support, please open an issue on GitHub.

---

<div align="center">

**Built with ❤️ on Stellar from Chile**

*Decentralizing the Future of Freelancing*

</div>
