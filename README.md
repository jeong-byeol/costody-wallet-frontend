# Custody Wallet Frontend

> Secure ETH custody wallet interface for Sepolia testnet with glassmorphism design

## 🎨 Design Features

- **Glassmorphism UI**: Modern frosted glass effect cards
- **Purple/Pink Gradients**: Beautiful gradient backgrounds and buttons
- **Smooth Animations**: Framer Motion powered transitions
- **Responsive Design**: Mobile-first, works on all devices
- **Web3 Integration**: MetaMask wallet connection with wagmi/viem

## 📁 Project Structure

```
src/
├── components/
│   ├── ui/              # shadcn/ui components
│   └── Toaster.tsx      # Global notification system
├── pages/
│   ├── Login.tsx        # Authentication & wallet connect
│   ├── Dashboard.tsx    # Balance overview & quick actions
│   ├── Deposit.tsx      # ETH deposit flow
│   ├── WithdrawSettings.tsx  # Whitelist & daily limit
│   ├── WithdrawRequest.tsx   # Withdrawal request
│   └── Activity.tsx     # Transaction history
├── stores/
│   └── index.ts         # Zustand global state
├── lib/
│   ├── api.ts           # Backend API client
│   ├── wagmi.ts         # Wagmi configuration
│   └── utils.ts         # Utility functions
├── App.tsx              # Main app & routing
└── main.tsx             # Entry point
```

## 🚀 Getting Started

### Prerequisites

- Node.js 18+ 
- MetaMask browser extension
- Sepolia testnet ETH (from faucet)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd custody-wallet-frontend
```

2. Install dependencies:
```bash
npm install
```

3. Configure environment variables (로컬 개발용):
```bash
# .env.local 파일 생성
cat > .env.local << EOF
VITE_API_BASE_URL=http://localhost:3001
VITE_API_TIMEOUT_MS=15000
EOF
```

**Note**: 로컬 개발 시에는 `.env.local` 파일에 백엔드 URL을 설정합니다.
프로덕션(Vercel) 배포 시에는 `vercel.json`의 `rewrites`를 사용하여 프록시를 통해 백엔드와 통신합니다.

4. Run development server:
```bash
npm run dev
```

5. Open browser at `http://localhost:5173`

## 🎯 Features

### 1. Login & Registration
- Email/password authentication
- MetaMask wallet connection
- Automatic Sepolia network switching
- Session management with JWT

### 2. Dashboard
- Real-time balance display
- Recent activity summary
- Quick action buttons
- Health status indicators

### 3. Deposit
- Direct on-chain ETH deposits
- Gas estimation
- Transaction status tracking
- Etherscan integration

### 4. Withdraw Settings
- Whitelist address management
- Daily withdrawal limit configuration
- Real-time policy enforcement
- Circular progress indicators

### 5. Withdraw Request
- Step-up password authentication
- Policy preview (whitelist + limits)
- Auto/manual approval based on amount (≤0.01 ETH = auto)
- Real-time status tracking

### 6. Activity
- Complete transaction history
- Filter by type (deposits, withdrawals, policy)
- Blockchain verification links
- Append-only audit trail

## 🛠️ Tech Stack

- **Framework**: React 18 + TypeScript
- **Build Tool**: Vite
- **Styling**: Tailwind CSS + Custom Glassmorphism
- **UI Components**: shadcn/ui + Radix UI
- **Web3**: wagmi + viem
- **State Management**: Zustand
- **HTTP Client**: Axios
- **Routing**: React Router v6
- **Animations**: Framer Motion + Tailwind

## 🎨 Design System

### Colors
- Primary: Purple (`#667eea`)
- Secondary: Pink (`#f093fb`)
- Accent: Blue (`#4facfe`)
- Background: Cream/Beige gradient

### Typography
- Sans-serif system fonts
- Text gradients for headings
- Monospace for addresses/hashes

### Components
- Glass cards with backdrop blur
- Gradient buttons with hover effects
- Smooth page transitions
- Toast notifications

## 📦 Build for Production

```bash
npm run build
```

Output will be in `dist/` directory.

### Vercel 배포 설정

1. **vercel.json 설정**: 백엔드 URL을 `destination`에 설정
```json
{
  "rewrites": [
    {
      "source": "/api/:path*",
      "destination": "http://your-backend-url.com/:path*"
    }
  ]
}
```

2. **환경 변수 설정 (선택사항)**:
   - Vercel 대시보드에서 환경 변수를 설정할 수 있습니다
   - 기본적으로 `/api`를 사용하여 프록시를 통해 백엔드와 통신합니다

3. **배포**:
```bash
git push origin main
```

Vercel이 자동으로 빌드 및 배포를 시작합니다.

## 🔒 Security Features

- JWT session tokens (stored in sessionStorage)
- Password step-up authentication for withdrawals
- Network validation (Sepolia only)
- Whitelist enforcement
- Daily spending limits
- Frozen account detection

## 🧪 Testing

```bash
npm run lint
```

## 📝 API Integration

This frontend expects a backend API with the following endpoints:

```
POST /auth/register
POST /auth/login
POST /users/keys
GET  /deposits
POST /policy/wl
POST /policy/wl/batch
POST /policy/daily-limit
GET  /status/policy
POST /withdrawals/intent
POST /withdrawals/submit
GET  /withdrawals/:id
GET  /status/vault-balance
GET  /status/health
```

See `backend.md` for complete API specifications.

## 🎯 Environment Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `VITE_API_BASE_URL` | Backend API URL | `http://localhost:3000` |
| `VITE_API_TIMEOUT_MS` | Request timeout | `15000` |
| `VITE_CHAIN_ID` | Sepolia chain ID | `11155111` |
| `VITE_PUBLIC_RPC_URL` | Ethereum RPC endpoint | `https://sepolia.infura.io/v3/...` |
| `VITE_OMNIBUS_VAULT` | Vault contract address | `0x...` |

## 🐛 Troubleshooting

### MetaMask not connecting
- Ensure MetaMask is installed and unlocked
- Check if you're on Sepolia testnet
- Try refreshing the page

### Transactions failing
- Verify you have sufficient Sepolia ETH for gas
- Check if recipient is whitelisted
- Ensure you haven't exceeded daily limit

### API errors
- Verify backend is running
- Check `VITE_API_BASE_URL` in `.env`
- Look at browser console for details

## 📄 License

MIT

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Open a Pull Request

## 📧 Support

For issues and questions, please open a GitHub issue or contact the development team.

---

Built with ❤️ using React, Tailwind, and wagmi
