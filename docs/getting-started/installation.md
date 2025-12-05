# Installation

This guide will help you set up the ArcusX development environment.

## Prerequisites

Before you begin, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **npm** or **yarn**
- **PHP** (v7.4 or higher)
- **Composer** (PHP dependency manager)
- **MySQL** or **MariaDB** (v10.3 or higher)
- **Git**

## Frontend Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd ArcusX
```

### 2. Install Dependencies

```bash
cd arcusx
npm install
```

### 3. Configure Environment

Create a `.env` file in the `arcusx` directory:

```env
VITE_API_URL=http://localhost/api
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 4. Start Development Server

```bash
npm run dev
```

The frontend will be available at `http://localhost:5173`

## Backend Setup

### 1. Install PHP Dependencies

```bash
cd backend_externo
composer install
```

### 2. Configure Database

Edit `backend_externo/config.php`:

```php
$db_config = [
    'host' => 'localhost',
    'user' => 'your_db_user',
    'password' => 'your_db_password',
    'database' => 'arcusxon_users'
];

$jwt_secret = "your_jwt_secret_key";
```

### 3. Create Database

```sql
CREATE DATABASE arcusxon_users;

USE arcusxon_users;

-- Create users table
CREATE TABLE users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    wallet_address VARCHAR(255) NULL,
    supabase_user_id VARCHAR(255) NULL,
    completed_tasks_count INT DEFAULT 0,
    tasks_today INT DEFAULT 0,
    tasks_this_week INT DEFAULT 0,
    last_task_created DATETIME NULL,
    cooldown_until DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email),
    INDEX idx_wallet_address (wallet_address),
    INDEX idx_supabase_user_id (supabase_user_id)
);

-- Create tasks table
CREATE TABLE tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    subtitle VARCHAR(255) NULL,
    description TEXT NOT NULL,
    price DECIMAL(18, 8) NOT NULL,
    currency VARCHAR(10) NOT NULL,
    difficulty VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    user_id INT NOT NULL,
    accepted_applicant_id INT NULL,
    status VARCHAR(20) DEFAULT 'open',
    client_accepted_completion TINYINT(1) DEFAULT 0,
    worker_accepted_completion TINYINT(1) DEFAULT 0,
    files TEXT NULL,
    escrow_id VARCHAR(255) NULL,
    escrow_status VARCHAR(20) NULL,
    escrow_created_at DATETIME NULL,
    escrow_completed_at DATETIME NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME NULL,
    INDEX idx_user_id (user_id),
    INDEX idx_status (status),
    INDEX idx_accepted_applicant_id (accepted_applicant_id),
    INDEX idx_escrow_id (escrow_id),
    INDEX idx_escrow_status (escrow_status),
    INDEX idx_created_at (created_at)
);

-- Create applications table
CREATE TABLE applications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    applicant_id INT NOT NULL,
    message TEXT NOT NULL,
    portfolio_url VARCHAR(500) NULL,
    worker_wallet_address VARCHAR(255) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_task_id (task_id),
    INDEX idx_applicant_id (applicant_id),
    INDEX idx_status (status),
    UNIQUE KEY unique_task_applicant (task_id, applicant_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (applicant_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create messages table
CREATE TABLE messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    sender_id INT NOT NULL,
    receiver_id INT NOT NULL,
    message TEXT NOT NULL,
    is_read TINYINT(1) DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    INDEX idx_task_id (task_id),
    INDEX idx_sender_id (sender_id),
    INDEX idx_receiver_id (receiver_id),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Create pending_transactions table
CREATE TABLE pending_transactions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    task_id INT NOT NULL,
    signed_tx_xdr TEXT NULL,
    complete_tx_xdr TEXT NULL,
    signer_role VARCHAR(20) NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_task_id (task_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
);
```

### 4. Configure Web Server

Point your web server to the `backend_externo` directory. For Apache, create a `.htaccess`:

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
```

## Stellar Configuration

### 1. Set Network

Edit `arcusx/src/hooks/useWallet.ts`:

```typescript
network: WalletNetwork.TESTNET // Change to MAINNET for production
```

### 2. Horizon Server

The default Horizon server is configured in `arcusx/src/services/stellarEscrowService.ts`:

```typescript
export function getHorizonServer(): Horizon.Server {
  return new Horizon.Server('https://horizon-testnet.stellar.org');
}
```

## Verify Installation

### Frontend

1. Start the dev server: `npm run dev`
2. Open `http://localhost:5173`
3. You should see the ArcusX homepage

### Backend

1. Test an endpoint: `curl http://localhost/api/auth/get_tasks.php`
2. You should receive a JSON response

### Database

1. Connect to MySQL: `mysql -u your_user -p arcusxon_users`
2. Check tables: `SHOW TABLES;`
3. All tables should be present

## Troubleshooting

### Frontend Issues

- **Port already in use**: Change port in `vite.config.ts`
- **Module not found**: Run `npm install` again
- **Build errors**: Check Node.js version (should be v18+)

### Backend Issues

- **Database connection failed**: Check `config.php` credentials
- **Composer errors**: Run `composer update`
- **CORS errors**: Check CORS headers in PHP files

### Stellar Issues

- **Wallet not connecting**: Ensure Freighter extension is installed
- **Network errors**: Check Horizon server URL
- **Transaction failures**: Verify you're on Testnet with test XLM

## Next Steps

- [Configuration](configuration.md) - Configure the application
- [First Steps](first-steps.md) - Create your first task
- [Development](../development/README.md) - Developer documentation

---

**Next**: [Configuration →](configuration.md)

