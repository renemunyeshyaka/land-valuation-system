# 💳 Payment Integration Guide
## Bank Transfer + Blockchain (USDT) Implementation

**Last Updated:** March 2, 2026  
**Project:** Rwanda Land Valuation System  
**Author:** GitHub Copilot with Claude Sonnet 4.5

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Bank Payment Mode](#bank-payment-mode)
3. [Blockchain Payment Mode](#blockchain-payment-mode)
4. [Environment Configuration](#environment-configuration)
5. [API Endpoints](#api-endpoints)
6. [Frontend Integration](#frontend-integration)
7. [Testing Guide](#testing-guide)
8. [Security Considerations](#security-considerations)
9. [Production Deployment](#production-deployment)

---

## 🎯 Overview

Your Land Valuation System now supports **3 payment methods**:

| Method | Provider | Integration Type | Verification |
|--------|----------|------------------|--------------|
| **Mobile Money** | MTN MoMo, Airtel Money | API (Real-time) | Instant |
| **Bank Transfer** | Equity Bank Rwanda | Manual | Admin Verification |
| **Cryptocurrency** | USDT/USDC/BNB (BEP20) | Blockchain | Automatic via BscScan |

---

## 📲 Mobile Money Webhooks (MTN + Airtel)

### Endpoint
`POST /api/v1/payments/webhook?provider=mtn|airtel`

### Signature Headers
- MTN: `X-Callback-Token`
- Airtel: `X-Signature`

### Required Environment Variables
```bash
MTN_WEBHOOK_SECRET=your_mtn_webhook_secret
AIRTEL_WEBHOOK_SECRET=your_airtel_webhook_secret
```

### MTN Sample Callback
```json
{
  "reference_id": "LVS-123456",
  "status": "SUCCESSFUL",
  "reason": "Payment completed"
}
```

### Airtel Sample Callback
```json
{
  "transaction": {
    "id": "AIRTEL-789",
    "status": "TS",
    "message": "Transaction successful"
  }
}
```

### Expected Responses
- Invalid signature (with secret configured): `401 Unauthorized`
- Valid callback: `200 OK` and transaction status synchronized in DB

### Local Testing Commands
```bash
# MTN callback test (replace token with real secret)
curl -X POST "http://localhost:5000/api/v1/payments/webhook?provider=mtn" \
  -H "Content-Type: application/json" \
  -H "X-Callback-Token: your_mtn_webhook_secret" \
  -d '{"reference_id":"LVS-123456","status":"SUCCESSFUL"}'

# Airtel callback test (replace signature with provider signature)
curl -X POST "http://localhost:5000/api/v1/payments/webhook?provider=airtel" \
  -H "Content-Type: application/json" \
  -H "X-Signature: your_airtel_signature" \
  -d '{"transaction":{"id":"AIRTEL-789","status":"TS"}}'
```

---

## 🏦 Bank Payment Mode

### **How It Works**

```
┌────────────┐     1. Initiate Payment    ┌─────────────┐
│   User     │ ────────────────────────> │   Backend   │
│            │                            │             │
│            │ <────────────────────────  │  Returns    │
│            │  2. Bank Details + Ref#    │  Bank Info  │
└────────────┘                            └─────────────┘
      │
      │ 3. User transfers money to
      │    Equity Bank account
      ▼
┌────────────┐
│ Equity Bank│
│ 4009111... │
└────────────┘
      │
      │ 4. User uploads receipt/proof
      ▼
┌────────────┐     5. Submit Proof       ┌─────────────┐
│   User     │ ────────────────────────> │   Backend   │
│            │                            │             │
│            │                            │  Status:    │
│            │                            │  Pending    │
└────────────┘                            └─────────────┘
                                                │
                                                │ 6. Admin verifies
                                                ▼
                                          ┌─────────────┐
                                          │   Admin     │
                                          │  Dashboard  │
                                          │             │
                                          │  ✅ Approve │
                                          │  ❌ Reject  │
                                          └─────────────┘
```

### **API Flow**

#### **Step 1: Initiate Bank Payment**

**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/payments/bank/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 50000,
    "currency": "RWF",
    "description": "Premium Subscription - 1 Year",
    "subscription_id": 5
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Bank payment initiated successfully",
  "data": {
    "transaction_id": "123",
    "status": "pending_verification",
    "message": "Please transfer funds to the bank account below and submit proof of payment",
    "bank_name": "Equity Bank Rwanda",
    "account_number": "4009111291475",
    "account_name": "Land Valuation System",
    "swift_code": "EQBLRWRWXXX",
    "branch_code": "001",
    "amount": 50000,
    "currency": "RWF",
    "reference_number": "BANK-20260302-143056-1234"
  }
}
```

#### **Step 2: User Makes Bank Transfer**

User goes to their bank (mobile app, USSD, or branch) and transfers:
- **Amount:** 50,000 RWF
- **Account:** 4009111291475
- **Bank:** Equity Bank
- **Reference:** BANK-20260302-143056-1234

#### **Step 3: Submit Payment Proof**

**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/payments/bank/submit-proof \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "transaction_id": "123",
    "bank_reference_id": "EQB20260302TR987654",
    "payment_date": "2026-03-02T14:35:00Z",
    "proof_image_url": "https://storage.example.com/receipts/receipt-123.jpg",
    "sender_account_name": "Jean Rene Munyeshyaka",
    "sender_account_number": "1234567890",
    "notes": "Transferred from my Equity Bank account"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Payment proof submitted successfully. Awaiting admin verification.",
  "data": null
}
```

#### **Step 4: Admin Verifies Payment**

**Request (Admin Dashboard):**
```bash
curl -X POST http://localhost:5000/api/v1/payments/bank/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_JWT_TOKEN" \
  -d '{
    "transaction_id": "123",
    "approved": true,
    "admin_notes": "Payment verified on Equity Bank statement. Reference EQB20260302TR987654 confirmed."
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Payment approved successfully",
  "data": null
}
```

---

## ⛓️ Blockchain Payment Mode (USDT on BNB Smart Chain)

### **How It Works**

```
┌────────────┐   1. Initiate Crypto Payment   ┌─────────────┐
│   User     │ ────────────────────────────> │   Backend   │
│            │                                │             │
│            │ <────────────────────────────  │  Returns    │
│            │  2. Wallet Address + Amount    │  Crypto     │
└────────────┘                                │  Details    │
      │                                        └─────────────┘
      │ 3. User sends USDT from their wallet
      │    (MetaMask, Trust Wallet, OKX, etc.)
      ▼
┌────────────┐
│  Blockchain│
│  BNB Smart │
│  Chain     │
└────────────┘
      │
      │ 4. Transaction confirmed
      │    TX Hash: 0xabc123...
      ▼
┌────────────┐   5. Submit TX Hash         ┌─────────────┐
│   User     │ ────────────────────────> │   Backend   │
│            │                            │             │
│            │                            │  Verifies   │
│            │                            │  via        │
│            │                            │  BscScan    │
└────────────┘                            └─────────────┘
                                                │
                                                │ 6. Auto-verify
                                                ▼
                                          ┌─────────────┐
                                          │  Transaction│
                                          │  Status:    │
                                          │  ✅ Complete│
                                          └─────────────┘
```

### **API Flow**

#### **Step 1: Initiate Blockchain Payment**

**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/payments/crypto/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "amount": 50000,
    "currency": "RWF",
    "token": "USDT",
    "description": "Premium Subscription - 1 Year",
    "subscription_id": 5
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "Blockchain payment initiated successfully",
  "data": {
    "transaction_id": "124",
    "status": "pending_blockchain_confirmation",
    "message": "Send 38.4615 USDT to the wallet address below",
    "wallet_address": "0x2f22a13cce6041c8bf3f0d569bb32a1ce729d599",
    "chain_name": "BNB Smart Chain (BEP20)",
    "token": "USDT",
    "amount_crypto": 38.4615,
    "amount_fiat": 50000,
    "exchange_rate": 0.00077,
    "reference_number": "CRYPTO-20260302-143520-5678",
    "qr_code_data": "ethereum:0x2f22a13cce6041c8bf3f0d569bb32a1ce729d599@56?value=38.4615",
    "expires_at": "2026-03-03T14:35:20Z",
    "blockchain_explorer": "https://bscscan.com/address/0x2f22a13cce6041c8bf3f0d569bb32a1ce729d599"
  }
}
```

#### **Step 2: User Sends Crypto**

User opens their crypto wallet (MetaMask, Trust Wallet, OKX, etc.) and sends:
- **Amount:** 38.4615 USDT
- **Network:** BNB Smart Chain (BEP20)
- **To Address:** `0x2f22a13cce6041c8bf3f0d569bb32a1ce729d599`
- **Token Contract:** `0x55d398326f99059fF775485246999027B3197955` (USDT BEP20)

**Transaction Hash Example:** `0xabc123def456789...`

#### **Step 3: Submit Transaction Hash**

**Request:**
```bash
curl -X POST http://localhost:5000/api/v1/payments/crypto/submit-proof \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -d '{
    "transaction_id": "124",
    "tx_hash": "0xabc123def456789...",
    "from_address": "0x1234567890abcdef1234567890abcdef12345678"
  }'
```

**Backend automatically verifies via BscScan API:**
- ✅ Checks if transaction exists on blockchain
- ✅ Verifies recipient is your wallet
- ✅ Verifies sender matches `from_address`
- ✅ Verifies amount is correct

**Response:**
```json
{
  "success": true,
  "message": "Blockchain payment verified and completed",
  "data": null
}
```

---

## ⚙️ Environment Configuration

### **Update `.env` File**

Add these variables to your `/backend/.env`:

```bash
# ========================================
# Bank Payment Configuration
# ========================================
EQUITY_BANK_ACCOUNT=4009111291475
EQUITY_BANK_NAME=Land Valuation System Rwanda
EQUITY_BANK_SWIFT=EQBLRWRWXXX
EQUITY_BANK_BRANCH=001

# ========================================
# Blockchain Payment Configuration
# ========================================
BLOCKCHAIN_WALLET_ADDRESS=0x2f22a13cce6041c8bf3f0d569bb32a1ce729d599
BSCSCAN_API_KEY=YOUR_BSCSCAN_API_KEY

# Get API key from: https://bscscan.com/apis
# Free tier: 5 calls/second, 100,000 calls/day

# ========================================
# Exchange Rate APIs (Optional)
# ========================================
# For RWF to USD conversion
FOREX_API_KEY=YOUR_FOREX_API_KEY
# Get from: https://currencyapi.com or https://exchangerate-api.com

# For crypto prices (BNB, etc.)
COINGECKO_API_KEY=YOUR_COINGECKO_API_KEY
# Get from: https://www.coingecko.com/en/api
```

### **Get BscScan API Key** (Free)

1. Go to https://bscscan.com/
2. Sign up for free account
3. Navigate to **My API Keys**
4. Create new API key
5. Copy and paste to `.env`

**Rate Limits (Free Tier):**
- 5 calls per second
- 100,000 calls per day
- Perfect for production!

---

## 🚀 API Endpoints Summary

### **Bank Payments**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/payments/bank/initiate` | User | Initiate bank payment |
| POST | `/api/v1/payments/bank/submit-proof` | User | Submit payment proof |
| POST | `/api/v1/payments/bank/verify` | Admin | Verify payment |
| GET | `/api/v1/payments/bank/status/:id` | User | Check payment status |

### **Blockchain Payments**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/v1/payments/crypto/initiate` | User | Initiate crypto payment |
| POST | `/api/v1/payments/crypto/submit-proof` | User | Submit TX hash |
| GET | `/api/v1/payments/crypto/status/:id` | User | Check payment status |

### **General**

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/v1/payments/methods` | Public | Get available payment methods |

---

## 🎨 Frontend Integration

### **Payment Method Selection UI**

```typescript
// React/Next.js Example
const PaymentMethodSelector = () => {
  const [methods, setMethods] = useState([]);
  
  useEffect(() => {
    fetch('/api/v1/payments/methods')
      .then(res => res.json())
      .then(data => setMethods(data.data));
  }, []);
  
  return (
    <div className="payment-methods">
      {/* Mobile Money */}
      <PaymentCard
        icon={<MobileIcon />}
        title="Mobile Money"
        providers={["MTN MoMo", "Airtel Money"]}
        badge="Instant"
        onClick={() => selectMethod('mobile')}
      />
      
      {/* Bank Transfer */}
      <PaymentCard
        icon={<BankIcon />}
        title="Bank Transfer"
        providers={["Equity Bank"]}
        badge="1-2 hours"
        onClick={() => selectMethod('bank')}
      />
      
      {/* Cryptocurrency */}
      <PaymentCard
        icon={<CryptoIcon />}
        title="Cryptocurrency"
        providers={["USDT", "USDC", "BNB"]}
        badge="5-10 mins"
        onClick={() => selectMethod('crypto')}
      />
    </div>
  );
};
```

### **Bank Payment Flow**

```typescript
const BankPaymentFlow = ({ amount, subscriptionId }) => {
  const [step, setStep] = useState(1);
  const [bankDetails, setBankDetails] = useState(null);
  const [proofFile, setProofFile] = useState(null);
  
  // Step 1: Initiate payment
  const initiatePayment = async () => {
    const response = await fetch('/api/v1/payments/bank/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount, currency: 'RWF', subscription_id: subscriptionId })
    });
    
    const data = await response.json();
    setBankDetails(data.data);
    setStep(2);
  };
  
  // Step 2: Upload proof
  const submitProof = async () => {
    // Upload file to storage (S3, Cloudinary, etc.)
    const proofImageUrl = await uploadFile(proofFile);
    
    await fetch('/api/v1/payments/bank/submit-proof', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        transaction_id: bankDetails.transaction_id,
        bank_reference_id: bankReferenceInput,
        payment_date: new Date().toISOString(),
        proof_image_url: proofImageUrl,
        sender_account_name: senderName
      })
    });
    
    setStep(3); // Show success + pending verification
  };
  
  return (
    <>
      {step === 1 && <InitiateButton onClick={initiatePayment} />}
      {step === 2 && <BankDetailsDisplay details={bankDetails} onNext={() => setStep(3)} />}
      {step === 3 && <ProofUpload onSubmit={submitProof} />}
      {step === 4 && <PendingVerification />}
    </>
  );
};
```

### **Blockchain Payment Flow with QR Code**

```typescript
import QRCode from 'qrcode.react';

const CryptoPaymentFlow = ({ amount, currency, subscriptionId }) => {
  const [cryptoDetails, setCryptoDetails] = useState(null);
  const [txHash, setTxHash] = useState('');
  
  const initiateCryptoPayment = async (token) => {
    const response = await fetch('/api/v1/payments/crypto/initiate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ amount, currency, token, subscription_id: subscriptionId })
    });
    
    const data = await response.json();
    setCryptoDetails(data.data);
  };
  
  const submitTxHash = async () => {
    await fetch('/api/v1/payments/crypto/submit-proof', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        transaction_id: cryptoDetails.transaction_id,
        tx_hash: txHash,
        from_address: userWalletAddress
      })
    });
    
    // Payment auto-verified!
    router.push('/payment-success');
  };
  
  return (
    <div>
      {!cryptoDetails ? (
        <TokenSelector onSelect={initiateCryptoPayment} />
      ) : (
        <>
          <QRCode value={cryptoDetails.qr_code_data} size={256} />
          <p>Send <strong>{cryptoDetails.amount_crypto} {cryptoDetails.token}</strong></p>
          <p>To: <code>{cryptoDetails.wallet_address}</code></p>
          <p>Network: <strong>{cryptoDetails.chain_name}</strong></p>
          <input 
            placeholder="Paste transaction hash" 
            value={txHash}
            onChange={(e) => setTxHash(e.target.value)}
          />
          <button onClick={submitTxHash}>Verify Payment</button>
          <a href={`https://bscscan.com/tx/${txHash}`} target="_blank">
            View on BscScan ↗
          </a>
        </>
      )}
    </div>
  );
};
```

---

## 🧪 Testing Guide

### **Test Bank Payment (Development)**

```bash
# 1. Initiate payment
curl -X POST http://localhost:5000/api/v1/payments/bank/initiate \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"amount": 1000, "currency": "RWF", "description": "Test payment"}'

# Save transaction_id from response

# 2. Submit mock proof
curl -X POST http://localhost:5000/api/v1/payments/bank/submit-proof \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "transaction_id": "123",
    "bank_reference_id": "TEST123456",
    "payment_date": "2026-03-02T14:00:00Z",
    "proof_image_url": "https://via.placeholder.com/400x300.png",
    "sender_account_name": "Test User"
  }'

# 3. Admin verifies (use admin token)
curl -X POST http://localhost:5000/api/v1/payments/bank/verify \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer ADMIN_TOKEN" \
  -d '{
    "transaction_id": "123",
    "approved": true,
    "admin_notes": "Test payment verified"
  }'
```

### **Test Blockchain Payment (Testnet)**

For testing without spending real USDT, use **BNB Smart Chain Testnet**:

1. **Get Testnet BNB:**
   - Visit https://testnet.bnbchain.org/faucet-smart
   - Enter your wallet address
   - Receive free testnet BNB

2. **Get Testnet USDT:**
   - Use Pancakeswap Testnet to swap BNB → USDT

3. **Update `.env` for testnet:**
   ```bash
   BLOCKCHAIN_WALLET_ADDRESS=0x2f22a13cce6041c8bf3f0d569bb32a1ce729d599
   BSCSCAN_API_KEY=YOUR_KEY
   BLOCKCHAIN_NETWORK=testnet  # Add this
   ```

4. **Test the flow:**
   ```bash
   # Initiate payment
   curl -X POST http://localhost:5000/api/v1/payments/crypto/initiate \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{"amount": 1000, "currency": "RWF", "token": "USDT"}'
   
   # Send USDT from MetaMask (BNB Testnet)
   # Copy TX hash
   
   # Submit TX hash
   curl -X POST http://localhost:5000/api/v1/payments/crypto/submit-proof \
     -H "Content-Type: application/json" \
     -H "Authorization: Bearer YOUR_TOKEN" \
     -d '{
       "transaction_id": "124",
       "tx_hash": "0xYOUR_TX_HASH",
       "from_address": "0xYOUR_WALLET"
     }'
   ```

---

## 🔒 Security Considerations

### **Bank Payments**

1. **File Upload Security:**
   - Validate file types (only images/PDFs)
   - Scan for malware
   - Limit file size (< 5MB)
   - Store in secure bucket (S3/Cloudinary)

2. **Admin Verification:**
   - Require admin role check
   - Log all verification actions
   - Implement 2FA for admin accounts

3. **Fraud Prevention:**
   - Set minimum/maximum amounts
   - Detect duplicate bank references
   - Flag suspicious patterns (multiple rejects, same account)

### **Blockchain Payments**

1. **Transaction Verification:**
   - Always verify on-chain (don't trust user input)
   - Check transaction confirmations (>= 12 blocks)
   - Verify exact amount (allow 1% tolerance for fees)

2. **Wallet Security:**
   - NEVER store private keys in code
   - Use hardware wallet for receiving wallet
   - Implement multi-sig for large amounts

3. **Smart Contract Risk:**
   - USDT BEP20 is audited and safe
   - Always verify token contract address
   - Monitor for token approval exploits

---

## 🚀 Production Deployment

### **Pre-Launch Checklist**

#### **Bank Payments**
- [ ] Verify Equity Bank account is active
- [ ] Test bank transfer from personal account
- [ ] Set up admin dashboard for verification
- [ ] Configure file upload storage (S3/Cloudinary)
- [ ] Set up email notifications for admins
- [ ] Create verification SOP document for admins

#### **Blockchain Payments**
- [ ] Get BscScan API key (free tier)
- [ ] Test with small mainnet USDT transaction
- [ ] Double-check wallet address (typo = lost funds!)
- [ ] Set up monitoring for incoming transactions
- [ ] Configure exchange rate API (CoinGecko/CurrencyAPI)
- [ ] Test with all tokens (USDT, USDC, BNB)

### **Monitoring & Alerts**

```bash
# Set up cron job to check pending bank payments
0 */2 * * * curl http://localhost:5000/api/v1/admin/payments/pending

# Monitor blockchain wallet balance
0 */6 * * * curl "https://api.bscscan.com/api?module=account&action=tokenbalance&contractaddress=0x55d398326f99059fF775485246999027B3197955&address=0x2f22a13cce6041c8bf3f0d569bb32a1ce729d599&tag=latest&apikey=$BSCSCAN_API_KEY"
```

### **Exchange Rate Updates**

For production, integrate live forex API:

```go
// In blockchain_payment_service.go, update calculateCryptoAmount()

// Get live RWF to USD rate
resp, err := http.Get(fmt.Sprintf(
  "https://api.currencyapi.com/v3/latest?apikey=%s&currencies=USD&base_currency=RWF",
  os.Getenv("FOREX_API_KEY"),
))

// Parse response and use live rate
var result map[string]interface{}
json.NewDecoder(resp.Body).Decode(&result)
rwfToUsd := result["data"].(map[string]interface{})["USD"].(map[string]interface{})["value"].(float64)
```

---

## 📊 Payment Method Comparison

| Feature | Mobile Money | Bank Transfer | Blockchain |
|---------|--------------|---------------|------------|
| **Speed** | Instant | 1-2 hours | 5-10 minutes |
| **Cost** | ~2% fees | Free (bank charges apply) | ~$0.50 gas |
| **Verification** | Automatic | Manual (admin) | Automatic |
| **User Friction** | Low | Medium | High (needs wallet) |
| **Best For** | Small amounts (<$100) | Medium amounts | International, privacy |
| **Refunds** | Easy | Easy | Difficult |

---

## 🎉 Next Steps

1. **Add routes to `routes.go`:**
   ```go
   // In setupPaymentRoutes()
   multiPaymentHandler := handlers.NewMultiPaymentHandler(
       services.NewPaymentService(db),
       services.NewBankPaymentService(db),
       services.NewBlockchainPaymentService(db),
   )
   
   // Bank routes
   router.POST("/bank/initiate", authMiddleware, multiPaymentHandler.InitiateBankPayment)
   router.POST("/bank/submit-proof", authMiddleware, multiPaymentHandler.SubmitBankPaymentProof)
   router.POST("/bank/verify", adminMiddleware, multiPaymentHandler.VerifyBankPayment)
   router.GET("/bank/status/:transaction_id", authMiddleware, multiPaymentHandler.GetBankPaymentStatus)
   
   // Crypto routes
   router.POST("/crypto/initiate", authMiddleware, multiPaymentHandler.InitiateBlockchainPayment)
   router.POST("/crypto/submit-proof", authMiddleware, multiPaymentHandler.SubmitBlockchainProof)
   router.GET("/crypto/status/:transaction_id", authMiddleware, multiPaymentHandler.GetBlockchainPaymentStatus)
   
   // General
   router.GET("/methods", multiPaymentHandler.GetAvailablePaymentMethods)
   ```

2. **Update frontend:**
   - Add payment method selection UI
   - Implement bank proof upload
   - Add crypto wallet integration (MetaMask)
   - Create QR code generator for crypto payments

3. **Admin dashboard:**
   - Add pending payments page
   - Implement payment verification UI
   - Add transaction history with filters

4. **Testing:**
   - Test full bank payment flow
   - Test crypto payment with testnet
   - Load test with 100+ concurrent payments

---

## 📞 Support

**Need Help?**
- BscScan API Docs: https://docs.bscscan.com/
- BNB Chain Docs: https://docs.bnbchain.org/
- Equity Bank Rwanda: https://equitybankgroup.com/rw

**Questions?**
Open an issue or contact the development team.

---

**🎯 You now have a complete multi-payment system supporting Mobile Money, Bank Transfers, and Cryptocurrency! 🚀**
