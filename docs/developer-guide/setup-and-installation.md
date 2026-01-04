# Setup and Installation

This guide will help you set up your development environment to work with ArcusX.

## Prerequisites

### Required Software

- **Node.js**: Version 18 or higher
- **npm**: Comes with Node.js, or install separately
- **PHP**: Version 7.4 or higher
- **Composer**: PHP dependency manager
- **MySQL/MariaDB**: Database server
- **Git**: Version control

### Recommended Tools

- **Code Editor**: VS Code, WebStorm, or similar
- **Postman/Insomnia**: API testing
- **MySQL Workbench**: Database management
- **Browser Extensions**: Freighter wallet for Stellar

## Repository Setup

### Clone the Repository

```bash
git clone https://github.com/yourusername/arcusx.git
cd arcusx
```

### Project Structure

```
ArcusX/
├── arcusx/                    # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/        # React components
│   │   ├── services/          # API services
│   │   ├── hooks/             # Custom React hooks
│   │   ├── config/            # Configuration files
│   │   └── ...
│   └── package.json
├── backend_externo/           # Backend (PHP)
│   ├── *.php                  # API endpoints
│   ├── config.php             # Database and JWT config
│   └── composer.json          # PHP dependencies
└── docs/                      # Documentation
```

## Frontend Setup

### Install Dependencies

```bash
cd arcusx
npm install
```

### Environment Variables

Create a `.env` file in the `arcusx/` directory:

```env
# API Configuration
VITE_API_URL=http://arcusx.pro/api

# Supabase Configuration (for OAuth)
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# Stellar Network
VITE_STELLAR_NETWORK=testnet

# Trustless Work Configuration
VITE_TRUSTLESS_WORK_API_KEY=your_api_key
VITE_TRUSTLESS_WORK_BASE_URL=development
VITE_PLATFORM_WALLET=your_platform_wallet_address
VITE_ADMIN_WALLET=your_admin_wallet_address

# USDC Configuration
VITE_USDC_ISSUER=GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN
```

### Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173` (default Vite port).

### Build for Production

```bash
npm run build
```

## Backend Setup

### Install PHP Dependencies

```bash
cd backend_externo
composer install
```

### Database Configuration

1. Create a MySQL database:

```sql
CREATE DATABASE arcusxon_users CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

2. Update `backend_externo/config.php`:

```php
$db_config = [
    'host' => 'localhost',
    'user' => 'your_database_user',
    'password' => 'your_database_password',
    'database' => 'arcusxon_users'
];

$jwt_secret = "your_secure_jwt_secret_key_here";
```

### Database Schema

Import the database schema. The schema includes tables for:

- `users`: User accounts and authentication
- `tasks`: Task listings and details
- `applications`: Worker proposals
- `messages`: User communications
- `disputes`: Dispute records
- `ratings`: User ratings and reviews
- And more...

### Configure PHP Server

#### Using PHP Built-in Server (Development)

```bash
cd backend_externo
php -S localhost:8000
```

#### Using Apache/Nginx (Production)

Configure your web server to serve the `backend_externo/` directory. Ensure `.htaccess` is configured for proper routing and CORS headers.

### CORS Configuration

CORS is handled in `.htaccess` for Apache. For Nginx, configure CORS headers in your server configuration.

## Stellar Wallet Setup

### Install Freighter Wallet

1. Install Freighter browser extension from https://www.freighter.app/
2. Create or import a wallet
3. Switch to Testnet for development
4. Fund your test wallet with testnet USDC (use Stellar Testnet faucet)

### Get Testnet USDC

1. Use Stellar Testnet Friendbot to get XLM: https://friendbot.stellar.org/
2. Use Stellar Testnet DEX or testnet faucets to get USDC

## Trustless Work Setup

### Get API Key

1. Visit Trustless Work documentation: https://docs.trustlesswork.com/
2. Request an API key for development
3. Add the API key to your `.env` file

### Configure Wallets

You need two Stellar wallets:

1. **Platform Wallet**: Receives platform commissions
2. **Admin Wallet**: Acts as dispute resolver in escrow contracts

Both wallets should be funded and configured in your environment variables.

## Verification

### Test Frontend

1. Start the frontend: `npm run dev`
2. Visit `http://localhost:5173`
3. Verify the application loads correctly

### Test Backend

1. Start the backend server
2. Test an endpoint:

```bash
curl http://localhost:8000/api/auth/get_platform_fee.php
```

### Test Database Connection

Create a simple test script to verify database connectivity.

## Development Workflow

### Local Development

1. Start database server
2. Start backend server (PHP)
3. Start frontend dev server (Vite)
4. Use Freighter wallet connected to Testnet
5. Test features locally

### Code Organization

- **Frontend**: React components in `src/components/`
- **Services**: API services in `src/services/`
- **Backend**: API endpoints in `backend_externo/`
- **Configuration**: Config files in `src/config/`

### Testing

- Test on Stellar Testnet first
- Use test wallets with testnet USDC
- Verify all transactions before Mainnet
- Test error scenarios and edge cases

## Troubleshooting

### Common Issues

**Port Already in Use**
```bash
# Change Vite port
npm run dev -- --port 3000
```

**Database Connection Failed**
- Verify database credentials in `config.php`
- Ensure MySQL service is running
- Check database user permissions

**CORS Errors**
- Verify CORS headers in `.htaccess`
- Check API URL configuration
- Ensure backend server is running

**Wallet Connection Issues**
- Verify Freighter is installed and unlocked
- Check network (Testnet vs Mainnet)
- Ensure wallet is funded

**Trustless Work API Errors**
- Verify API key is correct
- Check network configuration
- Review Trustless Work documentation

## Next Steps

- Read [API Integration Guide](api-integration.md)
- Review [API Reference](../api-reference/overview.md)
- Explore [Stellar Integration](../stellar-network/overview.md)
- Study [Architecture Documentation](../architecture/system-overview.md)

Your development environment is now ready!

