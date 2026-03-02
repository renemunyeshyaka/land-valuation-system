#!/bin/bash

# ============================================
# Payment Services Test Script
# Tests all 3 payment methods: Mobile, Bank, Crypto
# ============================================

set -e

BASE_URL="http://localhost:5000"
API_URL="$BASE_URL/api/v1"

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "════════════════════════════════════════════════════════════"
echo "  🔧 Payment Services Test Suite"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if backend is running
echo -e "${BLUE}Checking if backend is running...${NC}"
if ! curl -s "$BASE_URL/health" > /dev/null 2>&1; then
    echo -e "${RED}❌ Backend is not running on port 5000${NC}"
    echo "Start it with: cd backend && go run ./cmd/api/main.go"
    exit 1
fi
echo -e "${GREEN}✅ Backend is running${NC}"
echo ""

# Register test user
echo -e "${BLUE}Creating test user...${NC}"
REGISTER_RESPONSE=$(curl -s -X POST "$API_URL/auth/register" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "payment-test@example.com",
    "password": "TestPass123!",
    "full_name": "Payment Test User",
    "phone": "250788999888"
  }')

echo "$REGISTER_RESPONSE" | jq .
echo ""

# Login to get JWT token
echo -e "${BLUE}Logging in...${NC}"
LOGIN_RESPONSE=$(curl -s -X POST "$API_URL/auth/login" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "payment-test@example.com",
    "password": "TestPass123!"
  }')

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.data.access_token')

if [ "$TOKEN" == "null" ] || [ -z "$TOKEN" ]; then
    echo -e "${RED}❌ Failed to get JWT token${NC}"
    echo "$LOGIN_RESPONSE" | jq .
    exit 1
fi

echo -e "${GREEN}✅ Logged in successfully${NC}"
echo -e "Token: ${TOKEN:0:20}...${TOKEN: -10}"
echo ""

# ============================================
# TEST 1: Get Available Payment Methods
# ============================================
echo "════════════════════════════════════════════════════════════"
echo -e "${BLUE}TEST 1: Get Available Payment Methods (Public)${NC}"
echo "════════════════════════════════════════════════════════════"

METHODS_RESPONSE=$(curl -s -X GET "$API_URL/payments/methods")
echo "$METHODS_RESPONSE" | jq .
echo ""

# Check if all 3 methods are enabled
MOBILE_ENABLED=$(echo "$METHODS_RESPONSE" | jq -r '.data.mobile_money.enabled')
BANK_ENABLED=$(echo "$METHODS_RESPONSE" | jq -r '.data.bank_transfer.enabled')
CRYPTO_ENABLED=$(echo "$METHODS_RESPONSE" | jq -r '.data.cryptocurrency.enabled')

if [ "$MOBILE_ENABLED" == "true" ]; then
    echo -e "${GREEN}✅ Mobile Money: Enabled${NC}"
else
    echo -e "${RED}❌ Mobile Money: Disabled${NC}"
fi

if [ "$BANK_ENABLED" == "true" ]; then
    echo -e "${GREEN}✅ Bank Transfer: Enabled${NC}"
else
    echo -e "${RED}❌ Bank Transfer: Disabled${NC}"
fi

if [ "$CRYPTO_ENABLED" == "true" ]; then
    echo -e "${GREEN}✅ Cryptocurrency: Enabled${NC}"
else
    echo -e "${RED}❌ Cryptocurrency: Disabled${NC}"
fi
echo ""

# ============================================
# TEST 2: Bank Payment Flow
# ============================================
echo "════════════════════════════════════════════════════════════"
echo -e "${BLUE}TEST 2: Bank Payment Flow${NC}"
echo "════════════════════════════════════════════════════════════"

echo -e "${YELLOW}Step 1: Initiate bank payment...${NC}"
BANK_INIT_RESPONSE=$(curl -s -X POST "$API_URL/payments/bank/initiate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 50000,
    "currency": "RWF",
    "description": "Test Bank Payment - Premium Subscription"
  }')

echo "$BANK_INIT_RESPONSE" | jq .
BANK_TXN_ID=$(echo "$BANK_INIT_RESPONSE" | jq -r '.data.transaction_id')
BANK_REFERENCE=$(echo "$BANK_INIT_RESPONSE" | jq -r '.data.reference_number')
BANK_ACCOUNT=$(echo "$BANK_INIT_RESPONSE" | jq -r '.data.account_number')

if [ "$BANK_TXN_ID" != "null" ]; then
    echo -e "${GREEN}✅ Bank payment initiated${NC}"
    echo -e "   Transaction ID: $BANK_TXN_ID"
    echo -e "   Reference: $BANK_REFERENCE"
    echo -e "   Bank Account: $BANK_ACCOUNT"
else
    echo -e "${RED}❌ Failed to initiate bank payment${NC}"
fi
echo ""

if [ "$BANK_TXN_ID" != "null" ]; then
    echo -e "${YELLOW}Step 2: Submit payment proof...${NC}"
    BANK_PROOF_RESPONSE=$(curl -s -X POST "$API_URL/payments/bank/submit-proof" \
      -H "Content-Type: application/json" \
      -H "Authorization: Bearer $TOKEN" \
      -d "{
        \"transaction_id\": \"$BANK_TXN_ID\",
        \"bank_reference_id\": \"EQB20260302TEST123\",
        \"payment_date\": \"$(date -u +"%Y-%m-%dT%H:%M:%SZ")\",
        \"proof_image_url\": \"https://via.placeholder.com/400x300.png\",
        \"sender_account_name\": \"Payment Test User\",
        \"sender_account_number\": \"1234567890\",
        \"notes\": \"Test payment from automated script\"
      }")
    
    echo "$BANK_PROOF_RESPONSE" | jq .
    
    if echo "$BANK_PROOF_RESPONSE" | jq -e '.success' > /dev/null; then
        echo -e "${GREEN}✅ Payment proof submitted${NC}"
    else
        echo -e "${RED}❌ Failed to submit proof${NC}"
    fi
    echo ""
    
    echo -e "${YELLOW}Step 3: Check payment status...${NC}"
    BANK_STATUS_RESPONSE=$(curl -s -X GET "$API_URL/payments/bank/status/$BANK_TXN_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "$BANK_STATUS_RESPONSE" | jq .
    BANK_STATUS=$(echo "$BANK_STATUS_RESPONSE" | jq -r '.data.status')
    echo -e "   Current Status: ${YELLOW}$BANK_STATUS${NC}"
    echo ""
fi

# ============================================
# TEST 3: Blockchain Payment Flow
# ============================================
echo "════════════════════════════════════════════════════════════"
echo -e "${BLUE}TEST 3: Blockchain Payment Flow${NC}"
echo "════════════════════════════════════════════════════════════"

echo -e "${YELLOW}Step 1: Initiate crypto payment (USDT)...${NC}"
CRYPTO_INIT_RESPONSE=$(curl -s -X POST "$API_URL/payments/crypto/initiate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 50000,
    "currency": "RWF",
    "token": "USDT",
    "description": "Test Crypto Payment - Premium Subscription"
  }')

echo "$CRYPTO_INIT_RESPONSE" | jq .
CRYPTO_TXN_ID=$(echo "$CRYPTO_INIT_RESPONSE" | jq -r '.data.transaction_id')
CRYPTO_WALLET=$(echo "$CRYPTO_INIT_RESPONSE" | jq -r '.data.wallet_address')
CRYPTO_AMOUNT=$(echo "$CRYPTO_INIT_RESPONSE" | jq -r '.data.amount_crypto')
CRYPTO_TOKEN=$(echo "$CRYPTO_INIT_RESPONSE" | jq -r '.data.token')

if [ "$CRYPTO_TXN_ID" != "null" ]; then
    echo -e "${GREEN}✅ Crypto payment initiated${NC}"
    echo -e "   Transaction ID: $CRYPTO_TXN_ID"
    echo -e "   Send: $CRYPTO_AMOUNT $CRYPTO_TOKEN"
    echo -e "   To: $CRYPTO_WALLET"
    echo -e "   Network: BNB Smart Chain (BEP20)"
else
    echo -e "${RED}❌ Failed to initiate crypto payment${NC}"
fi
echo ""

if [ "$CRYPTO_TXN_ID" != "null" ]; then
    echo -e "${YELLOW}Step 2: Check payment status...${NC}"
    CRYPTO_STATUS_RESPONSE=$(curl -s -X GET "$API_URL/payments/crypto/status/$CRYPTO_TXN_ID" \
      -H "Authorization: Bearer $TOKEN")
    
    echo "$CRYPTO_STATUS_RESPONSE" | jq .
    CRYPTO_STATUS=$(echo "$CRYPTO_STATUS_RESPONSE" | jq -r '.data.status')
    echo -e "   Current Status: ${YELLOW}$CRYPTO_STATUS${NC}"
    echo ""
    
    echo -e "${YELLOW}Note: To complete crypto payment:${NC}"
    echo "   1. Send $CRYPTO_AMOUNT USDT to: $CRYPTO_WALLET"
    echo "   2. Use BNB Smart Chain (BEP20) network"
    echo "   3. Get the transaction hash from BscScan"
    echo "   4. Submit proof with:"
    echo ""
    echo "   curl -X POST $API_URL/payments/crypto/submit-proof \\"
    echo "     -H \"Authorization: Bearer $TOKEN\" \\"
    echo "     -d '{\"transaction_id\": \"$CRYPTO_TXN_ID\", \"tx_hash\": \"0xYOUR_TX_HASH\", \"from_address\": \"0xYOUR_WALLET\"}'"
    echo ""
fi

# ============================================
# TEST 4: Mobile Money Payment (Existing)
# ============================================
echo "════════════════════════════════════════════════════════════"
echo -e "${BLUE}TEST 4: Mobile Money Payment (Existing)${NC}"
echo "════════════════════════════════════════════════════════════"

echo -e "${YELLOW}Initiating MTN MoMo payment...${NC}"
MOBILE_RESPONSE=$(curl -s -X POST "$API_URL/payments/mobile-money" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{
    "amount": 50000,
    "currency": "RWF",
    "phone_number": "250788999888",
    "payment_provider": "mtn_momo",
    "description": "Test Mobile Payment"
  }')

echo "$MOBILE_RESPONSE" | jq .

if echo "$MOBILE_RESPONSE" | jq -e '.data.transaction_id' > /dev/null; then
    echo -e "${GREEN}✅ Mobile money payment initiated${NC}"
else
    echo -e "${YELLOW}⚠️  Mobile money payment may require API credentials${NC}"
fi
echo ""

# ============================================
# Summary
# ============================================
echo "════════════════════════════════════════════════════════════"
echo -e "${GREEN}✅ Payment Services Test Complete!${NC}"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "Summary:"
echo "  • Mobile Money:    MTN MoMo & Airtel Money (API integration)"
echo "  • Bank Transfer:   Equity Bank (Manual verification)"
echo "  • Cryptocurrency:  USDT/USDC/BNB on BNB Smart Chain"
echo ""
echo "Next Steps:"
echo "  1. Review PAYMENT_INTEGRATION_GUIDE.md for full documentation"
echo "  2. Get BscScan API key: https://bscscan.com/apis"
echo "  3. Test with real payments on testnet/sandbox"
echo "  4. Implement frontend payment UI"
echo ""
echo "Happy coding! 🚀"
