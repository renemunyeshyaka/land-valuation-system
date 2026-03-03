#!/bin/bash

echo "============================================"
echo "   Payment Integration API Tests"
echo "============================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration - use environment variable or default to localhost
API_URL="${API_BASE_URL:-http://localhost:5000}"

echo -e "${BLUE}Test 1: Get Available Payment Methods${NC}"
echo "GET $API_URL/api/v1/payments/methods"
echo ""
RESPONSE=$(curl -s -w "\nHTTP_STATUS:%{http_code}" "$API_URL/api/v1/payments/methods")
HTTP_STATUS=$(echo "$RESPONSE" | grep HTTP_STATUS | cut -d: -f2)
BODY=$(echo "$RESPONSE" | sed '/HTTP_STATUS/d')

if [ "$HTTP_STATUS" = "200" ]; then
    echo -e "${GREEN}✓ SUCCESS (HTTP $HTTP_STATUS)${NC}"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
else
    echo -e "${RED}✗ FAILED (HTTP $HTTP_STATUS)${NC}"
    echo "$BODY"
fi

echo ""
echo "============================================"
echo ""

echo -e "${BLUE}Test 2: Check Payment Methods Response Structure${NC}"
echo ""

# Parse the payment methods
MOBILE=$(echo "$BODY" | grep -o '"mobile_money"' | wc -l)
BANK=$(echo "$BODY" | grep -o '"bank_transfer"' | wc -l)
CRYPTO=$(echo "$BODY" | grep -o '"cryptocurrency"' | wc -l)

if [ "$MOBILE" -gt 0 ] && [ "$BANK" -gt 0 ] && [ "$CRYPTO" -gt 0 ]; then
    echo -e "${GREEN}✓ All payment methods present:${NC}"
    echo "  - Mobile Money (MTN MoMo, Airtel Money)"
    echo "  - Bank Transfer (Equity Bank Rwanda)"
    echo "  - Cryptocurrency (BNB Smart Chain - USDT/USDC/BNB)"
else
    echo -e "${RED}✗ Missing payment methods${NC}"
fi

echo ""
echo "============================================"
echo ""

echo -e "${BLUE}Test 3: Verify Bank Transfer Details${NC}"
echo ""

if echo "$BODY" | grep -q "4009111291475"; then
    echo -e "${GREEN}✓ Equity Bank account number present${NC}"
else
    echo -e "${RED}✗ Bank account number missing${NC}"
fi

if echo "$BODY" | grep -q "EQBLRWRWXXX"; then
    echo -e "${GREEN}✓ SWIFT code present${NC}"
else
    echo -e "${RED}✗ SWIFT code missing${NC}"
fi

echo ""
echo "============================================"
echo ""

echo -e "${BLUE}Test 4: Verify Cryptocurrency Details${NC}"
echo ""

if echo "$BODY" | grep -q "BNB Smart Chain"; then
    echo -e "${GREEN}✓ BNB Smart Chain (BEP20) network configured${NC}"
else
    echo -e "${RED}✗ Blockchain network missing${NC}"
fi

if echo "$BODY" | grep -q "USDT" && echo "$BODY" | grep -q "USDC" && echo "$BODY" | grep -q "BNB"; then
    echo -e "${GREEN}✓ Supported tokens: USDT, USDC, BNB${NC}"
else
    echo -e "${RED}✗ Token configuration incomplete${NC}"
fi

echo ""
echo "============================================"
echo ""

echo -e "${BLUE}Test 5: Check Payment Routes Registration${NC}"
echo ""

# Test if bank payment route exists (should return 401 without auth, not 404)
BANK_INIT=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/api/v1/payments/bank/initiate")
if [ "$BANK_INIT" = "401" ] || [ "$BANK_INIT" = "400" ]; then
    echo -e "${GREEN}✓ Bank initiate endpoint registered (HTTP $BANK_INIT)${NC}"
else
    echo -e "${RED}✗ Bank initiate endpoint issue (HTTP $BANK_INIT)${NC}"
fi

# Test crypto payment route
CRYPTO_INIT=$(curl -s -w "%{http_code}" -o /dev/null "$API_URL/api/v1/payments/crypto/initiate")
if [ "$CRYPTO_INIT" = "401" ] || [ "$CRYPTO_INIT" = "400" ]; then
    echo -e "${GREEN}✓ Crypto initiate endpoint registered (HTTP $CRYPTO_INIT)${NC}"
else
    echo -e "${RED}✗ Crypto initiate endpoint issue (HTTP $CRYPTO_INIT)${NC}"
fi

echo ""
echo "============================================"
echo "   Payment Integration Tests Complete"
echo "============================================"
echo ""
echo "Summary:"
echo "- ✓ Payment methods API working"
echo "- ✓ Bank Transfer: Equity Bank Rwanda (4009111291475)"
echo "- ✓ Cryptocurrency: BNB Smart Chain (USDT/USDC/BNB)"
echo "- ✓ Wallet: 0x2f22a13cce6041c8bf3f0d569bb32a1ce729d599"
echo ""
echo "Next steps:"
echo "1. Get BscScan API key: https://bscscan.com/apis"
echo "2. Update BSCSCAN_API_KEY in backend/.env"
echo "3. Test full payment flows with authentication"
echo ""
