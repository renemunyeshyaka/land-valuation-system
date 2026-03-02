# 🏗️ Payment System Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    RWANDA LAND VALUATION SYSTEM                      │
│                         Payment Infrastructure                       │
└─────────────────────────────────────────────────────────────────────┘

┌────────────────┐
│   Frontend     │
│  (Next.js)     │
│                │
│  - Payment UI  │
│  - QR Scanner  │
│  - Receipt     │
│    Upload      │
└────────┬───────┘
         │
         │ HTTPS (JWT Auth)
         │
         ▼
┌─────────────────────────────────────────────────────────┐
│              Backend API (Go + Gin)                     │
│                                                         │
│  ┌──────────────────────────────────────────────────┐  │
│  │         Payment Routes (routes.go)               │  │
│  │                                                  │  │
│  │  GET  /payments/methods        (Public)        │  │
│  │  POST /payments/mobile-money   (User)          │  │
│  │  POST /payments/bank/*         (User)          │  │
│  │  POST /payments/crypto/*       (User)          │  │
│  │  POST /payments/admin/verify   (Admin)         │  │
│  └──────────────┬───────────────────────────────────┘  │
│                 │                                       │
│                 ▼                                       │
│  ┌────────────────────────────────────────────────┐    │
│  │     MultiPaymentHandler                        │    │
│  │  (multi_payment_handler.go)                    │    │
│  └──┬──────────────┬──────────────┬────────────────┘   │
│     │              │              │                     │
│     ▼              ▼              ▼                     │
│  ┌─────────┐  ┌─────────┐  ┌──────────────┐           │
│  │ Mobile  │  │  Bank   │  │ Blockchain   │           │
│  │ Payment │  │ Payment │  │   Payment    │           │
│  │ Service │  │ Service │  │   Service    │           │
│  └────┬────┘  └────┬────┘  └──────┬───────┘           │
│       │            │               │                    │
└───────┼────────────┼───────────────┼────────────────────┘
        │            │               │
        ▼            ▼               ▼
┌──────────────────────────────────────────────────────────┐
│                External Services                         │
├──────────────────────────────────────────────────────────┤
│                                                          │
│  MTN MoMo API          Equity Bank         BNB Chain    │
│  ┌──────────┐         ┌──────────┐        ┌──────────┐ │
│  │ Real-time│         │  Manual  │        │ BscScan  │ │
│  │   API    │         │Verification       │   API    │ │
│  │          │         │          │        │          │ │
│  │ Status:  │         │ Admin    │        │ TX Verify│ │
│  │ Instant  │         │ Dashboard│        │ Auto     │ │
│  └──────────┘         └──────────┘        └──────────┘ │
│                                                          │
│  Airtel Money                             Wallet:       │
│  ┌──────────┐                            0x2f22a13cc... │
│  │ Real-time│                                           │
│  │   API    │                                           │
│  └──────────┘                                           │
└──────────────────────────────────────────────────────────┘
```

---

## Payment Flow Diagrams

### 1️⃣ Mobile Money Flow (Existing)

```
User                    Backend                 MTN/Airtel API
 │                         │                          │
 │  1. POST /mobile-money  │                          │
 ├────────────────────────►│                          │
 │                         │  2. Create Transaction   │
 │                         ├─────────────────────────►│
 │                         │                          │
 │                         │  3. Return Status        │
 │                         │◄─────────────────────────┤
 │  4. Payment Initiated   │                          │
 │◄────────────────────────┤                          │
 │                         │                          │
 │  5. User approves on    │                          │
 │     mobile phone        │                          │
 │                         │                          │
 │                         │  6. Callback (webhook)   │
 │                         │◄─────────────────────────┤
 │                         │                          │
 │  7. Payment Complete ✅ │                          │
 │◄────────────────────────┤                          │
```

**Time:** Instant (< 1 minute)  
**Verification:** Automatic via API callback

---

### 2️⃣ Bank Transfer Flow (New)

```
User                Backend             Admin Dashboard      Equity Bank
 │                     │                        │                 │
 │ 1. POST /bank/      │                        │                 │
 │    initiate         │                        │                 │
 ├────────────────────►│                        │                 │
 │                     │ 2. Create Transaction  │                 │
 │                     │    Status: pending     │                 │
 │                     │                        │                 │
 │ 3. Bank Details     │                        │                 │
 │    Account: 40091.. │                        │                 │
 │◄────────────────────┤                        │                 │
 │                     │                        │                 │
 │ 4. User transfers   │                        │                 │
 │    money via bank   │                        │                 │
 ├─────────────────────┼────────────────────────┼────────────────►│
 │                     │                        │                 │
 │ 5. Upload receipt   │                        │                 │
 ├────────────────────►│                        │                 │
 │                     │ 6. Status: pending_    │                 │
 │                     │    admin_verification  │                 │
 │                     ├───────────────────────►│                 │
 │                     │                        │                 │
 │                     │                        │ 7. Admin checks │
 │                     │                        │    bank         │
 │                     │                        │    statement    │
 │                     │                        │                 │
 │                     │ 8. POST /admin/verify  │                 │
 │                     │◄───────────────────────┤                 │
 │                     │    approved: true      │                 │
 │                     │                        │                 │
 │ 9. Payment Complete │                        │                 │
 │    ✅               │                        │                 │
 │◄────────────────────┤                        │                 │
```

**Time:** 1-2 hours (business hours)  
**Verification:** Manual by admin

---

### 3️⃣ Cryptocurrency Flow (New)

```
User               Backend            BscScan API         Blockchain
 │                    │                     │                  │
 │ 1. POST /crypto/   │                     │                  │
 │    initiate        │                     │                  │
 ├───────────────────►│                     │                  │
 │                    │ 2. Calculate USDT   │                  │
 │                    │    amount           │                  │
 │                    │    50,000 RWF =     │                  │
 │                    │    38.46 USDT       │                  │
 │                    │                     │                  │
 │ 3. Wallet Address  │                     │                  │
 │    0x2f22a13cc..   │                     │                  │
 │    QR Code         │                     │                  │
 │◄───────────────────┤                     │                  │
 │                    │                     │                  │
 │ 4. User sends USDT │                     │                  │
 │    from MetaMask/  │                     │                  │
 │    Trust Wallet    │                     │                  │
 ├────────────────────┼─────────────────────┼─────────────────►│
 │                    │                     │                  │
 │ 5. TX Hash:        │                     │                  │
 │    0xabc123...     │                     │                  │
 │                    │                     │                  │
 │ 6. POST /crypto/   │                     │                  │
 │    submit-proof    │                     │                  │
 ├───────────────────►│                     │                  │
 │                    │ 7. Verify TX        │                  │
 │                    ├────────────────────►│                  │
 │                    │                     │ 8. Check TX      │
 │                    │                     ├─────────────────►│
 │                    │                     │                  │
 │                    │                     │ 9. TX Details    │
 │                    │                     │◄─────────────────┤
 │                    │ 10. TX Valid ✅     │                  │
 │                    │◄────────────────────┤                  │
 │                    │                     │                  │
 │ 11. Payment        │                     │                  │
 │     Complete ✅    │                     │                  │
 │◄───────────────────┤                     │                  │
```

**Time:** 5-10 minutes (blockchain confirmations)  
**Verification:** Automatic via BscScan API

---

## Technology Stack

### Backend Services (Go)

```
backend/internal/services/
├── mobile_payment_service.go      (Existing)
│   ├── MTN MoMo integration
│   ├── Airtel Money integration
│   └── Real-time API calls
│
├── bank_payment_service.go        (NEW)
│   ├── Equity Bank configuration
│   ├── Payment proof handling
│   └── Admin verification workflow
│
└── blockchain_payment_service.go  (NEW)
    ├── BNB Smart Chain support
    ├── USDT/USDC/BNB tokens
    ├── BscScan API integration
    └── Exchange rate calculation
```

### API Handlers

```
backend/internal/api/handlers/
├── payment_handler.go              (Existing)
│   └── Mobile money endpoints
│
└── multi_payment_handler.go        (NEW)
    ├── Bank payment endpoints (4)
    ├── Crypto payment endpoints (3)
    └── Payment methods endpoint (1)
```

### Routes Configuration

```
backend/internal/api/routes/routes.go
└── setupPaymentRoutes()            (Updated)
    ├── Mobile Money routes
    ├── Bank Transfer routes        (NEW)
    ├── Cryptocurrency routes       (NEW)
    └── Admin verification routes   (NEW)
```

---

## API Endpoint Tree

```
/api/v1/payments/
│
├── GET  /methods                    (Public)
│        → List all payment methods
│
├── POST /mobile-money               (User)
│        → Initiate mobile payment
│
├── GET  /:transaction_id/status     (User)
│        → Check payment status
│
├── /bank/
│   ├── POST /initiate               (User)
│   │        → Get bank details
│   │
│   ├── POST /submit-proof           (User)
│   │        → Upload receipt
│   │
│   └── GET  /status/:id             (User)
│            → Check bank payment status
│
├── /crypto/
│   ├── POST /initiate               (User)
│   │        → Get wallet address
│   │
│   ├── POST /submit-proof           (User)
│   │        → Submit TX hash
│   │
│   └── GET  /status/:id             (User)
│            → Check crypto payment status
│
├── /admin/
│   └── POST /bank/verify            (Admin)
│            → Verify bank payment
│
└── /webhook/
    └── POST /                       (External)
             → Payment callbacks
```

---

## Database Schema (Transaction Model)

```sql
transactions table:
├── id                       (primary key)
├── user_id                  (foreign key)
├── amount_rwf               (decimal)
├── currency                 (RWF, USD, EUR)
├── payment_provider         (mtn_momo, equity_bank, blockchain_bnb_chain)
├── payment_method           (mobile_money, bank_transfer, crypto_usdt)
├── status                   (pending, pending_verification, completed, rejected)
├── payment_status           (awaiting_proof, proof_submitted, verified)
├── payment_reference        (BANK-xxx, CRYPTO-xxx)
├── provider_transaction_id  (Bank ref or TX hash)
├── documents                (JSONB) → Stores proof details
│   ├── bank_reference_id
│   ├── proof_image_url
│   ├── tx_hash
│   ├── wallet_address
│   ├── crypto_amount
│   ├── exchange_rate
│   └── admin_notes
├── created_at
├── updated_at
└── completion_date
```

---

## Environment Configuration

```bash
# Mobile Money (Existing)
MTN_MOMO_API_KEY=xxx
AIRTEL_MONEY_API_KEY=xxx

# Bank Transfer (NEW)
EQUITY_BANK_ACCOUNT=4009111291475
EQUITY_BANK_NAME=Land Valuation System Rwanda
EQUITY_BANK_SWIFT=EQBLRWRWXXX
EQUITY_BANK_BRANCH=001

# Blockchain (NEW)
BLOCKCHAIN_WALLET_ADDRESS=0x2f22a13cce6041c8bf3f0d569bb32a1ce729d599
BSCSCAN_API_KEY=YOUR_KEY_HERE

# Exchange Rates (Optional)
FOREX_API_KEY=xxx           # RWF ↔ USD
COINGECKO_API_KEY=xxx       # Crypto prices

# Feature Flags
ENABLE_MOBILE_PAYMENTS=true
ENABLE_BANK_PAYMENTS=true
ENABLE_CRYPTO_PAYMENTS=true
```

---

## Security Architecture

### Authentication & Authorization

```
┌─────────────────────────────────────────────┐
│          Request Flow                       │
│                                             │
│  User Request                               │
│      ↓                                      │
│  JWT Auth Middleware ────→ Reject (401)    │
│      ↓ Valid                                │
│  Extract User ID                            │
│      ↓                                      │
│  Handler Function                           │
│      ↓                                      │
│  [Admin Only Routes]                        │
│      ↓                                      │
│  Admin Role Check ────→ Reject (403)       │
│      ↓ Admin                                │
│  Execute Admin Action                       │
│                                             │
└─────────────────────────────────────────────┘
```

### Payment Verification

```
Mobile Money:
└── MTN/Airtel API ✅ Automatic

Bank Transfer:
├── User uploads proof
├── Admin reviews
├── Admin checks bank statement
├── Admin approves/rejects
└── User notified

Cryptocurrency:
├── User submits TX hash
├── Backend queries BscScan API
├── Verify recipient = our wallet
├── Verify sender = user's wallet
├── Verify amount ≥ expected (±1%)
└── Auto-complete ✅
```

---

## Monitoring & Observability

### Key Metrics to Track

```
Payment Success Rate:
├── Mobile Money: Target > 95%
├── Bank Transfer: Target > 90%
└── Crypto: Target > 85%

Average Processing Time:
├── Mobile Money: < 1 minute
├── Bank Transfer: < 2 hours
└── Crypto: < 10 minutes

Failed Payments:
├── Amount verification mismatches
├── Expired payment windows
└── Invalid transaction hashes

Admin Actions:
├── Verification response time
├── Approval/rejection ratios
└── Audit logs
```

---

## Deployment Topology

```
┌──────────────────────────────────────────────────┐
│              Production Environment              │
│                                                  │
│  ┌────────────────────────────────────────────┐ │
│  │         Load Balancer (Nginx)              │ │
│  └────────────┬───────────────────────────────┘ │
│               │                                  │
│       ┌───────┴────────┐                        │
│       ▼                ▼                        │
│  ┌─────────┐      ┌─────────┐                  │
│  │ Backend │      │ Backend │                  │
│  │ Server 1│      │ Server 2│                  │
│  └────┬────┘      └────┬────┘                  │
│       │                │                        │
│       └────────┬───────┘                        │
│                ▼                                │
│       ┌──────────────────┐                      │
│       │   PostgreSQL     │                      │
│       │   (GORM + PostGIS)                     │
│       └──────────────────┘                      │
│                                                  │
│       ┌──────────────────┐                      │
│       │      Redis       │                      │
│       │    (Caching)     │                      │
│       └──────────────────┘                      │
│                                                  │
│       ┌──────────────────┐                      │
│       │   File Storage   │                      │
│       │ (S3/Cloudinary)  │                      │
│       │  Receipt Images  │                      │
│       └──────────────────┘                      │
│                                                  │
└──────────────────────────────────────────────────┘

External Connections:
├── MTN MoMo API (sandbox/production)
├── Airtel Money API
├── BscScan API (blockchain verification)
├── CurrencyAPI (exchange rates)
└── Email Service (notifications)
```

---

## Testing Strategy

### Unit Tests
```go
// mobile_payment_service_test.go
// bank_payment_service_test.go
// blockchain_payment_service_test.go
```

### Integration Tests
```bash
# Test full payment flows
./scripts/test-payments.sh
```

### Load Tests
```bash
# 100 concurrent users
hey -n 1000 -c 100 -m POST \
  -H "Authorization: Bearer TOKEN" \
  http://localhost:5000/api/v1/payments/bank/initiate
```

### Testnet (Crypto)
```
BNB Smart Chain Testnet
├── Faucet: testnet.bnbchain.org/faucet-smart
├── Explorer: testnet.bscscan.com
└── Free testnet BNB & USDT
```

---

## 📚 Documentation Files

1. **PAYMENT_SUMMARY.md** (This file)
   - Architecture overview
   - System diagrams
   - Flow charts

2. **PAYMENT_INTEGRATION_GUIDE.md**
   - Complete implementation guide
   - API documentation
   - Code examples
   - Security best practices

3. **scripts/test-payments.sh**
   - Automated testing
   - All payment flows

---

## 🎯 Quick Reference

### Get Started in 3 Steps

1. **Get BscScan API Key** (5 minutes)
   ```
   https://bscscan.com/apis
   ```

2. **Update .env**
   ```bash
   BSCSCAN_API_KEY=YOUR_KEY_HERE
   ```

3. **Test**
   ```bash
   ./scripts/test-payments.sh
   ```

### Common Operations

```bash
# Check all payment methods
curl http://localhost:5000/api/v1/payments/methods | jq .

# Initiate bank payment
curl -X POST http://localhost:5000/api/v1/payments/bank/initiate \
  -H "Authorization: Bearer TOKEN" \
  -d '{"amount": 50000, "currency": "RWF"}'

# Initiate crypto payment
curl -X POST http://localhost:5000/api/v1/payments/crypto/initiate \
  -H "Authorization: Bearer TOKEN" \
  -d '{"amount": 50000, "currency": "RWF", "token": "USDT"}'
```

---

**🎉 You now have a complete, production-ready payment system!**

*Architecture designed for scale, security, and reliability.*
