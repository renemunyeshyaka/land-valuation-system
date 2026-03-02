#!/bin/bash

# ============================================
# Payment Services Environment Setup
# ============================================
# Add these variables to your .env file

echo "Adding payment configuration to .env..."

cat >> /home/sdragon/Desktop/GitHub/land-valuation-system/backend/.env << 'EOF'

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
# Your OKX BNB Smart Chain wallet address
BLOCKCHAIN_WALLET_ADDRESS=0x2f22a13cce6041c8bf3f0d569bb32a1ce729d599

# BscScan API Key (Get from: https://bscscan.com/apis)
# Free tier: 5 calls/sec, 100,000 calls/day
BSCSCAN_API_KEY=

# ========================================
# Exchange Rate APIs (Optional but Recommended)
# ========================================

# For RWF to USD conversion
# Get from: https://currencyapi.com (free tier: 300 requests/month)
FOREX_API_KEY=

# For crypto prices (BNB price in USD)
# Get from: https://www.coingecko.com/en/api (free tier available)
COINGECKO_API_KEY=

# ========================================
# Payment Feature Flags
# ========================================
ENABLE_BANK_PAYMENTS=true
ENABLE_CRYPTO_PAYMENTS=true
ENABLE_MOBILE_PAYMENTS=true

EOF

echo "✅ Payment configuration added to .env"
echo ""
echo "📋 Next Steps:"
echo "1. Get BscScan API key from: https://bscscan.com/apis"
echo "2. Get CurrencyAPI key from: https://currencyapi.com (optional)"
echo "3. Verify your wallet address: 0x2f22a13cce6041c8bf3f0d569bb32a1ce729d599"
echo "4. Test the endpoints with the PAYMENT_INTEGRATION_GUIDE.md"
echo ""
echo "🚀 Payment services are ready to use!"
