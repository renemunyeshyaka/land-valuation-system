package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"strings"
	"time"

	"backend/internal/models"
	"backend/internal/repository"

	"gorm.io/gorm"
)

// BlockchainPaymentService handles cryptocurrency payments (USDT on BNB Smart Chain)
type BlockchainPaymentService struct {
	db              *gorm.DB
	transactionRepo *repository.TransactionRepository
	// Blockchain configuration
	walletAddress  string // Your OKX BNB Smart Chain wallet
	chainName      string // BNB Smart Chain
	acceptedTokens []string
	bscscanAPIKey  string
	httpClient     *http.Client
}

func NewBlockchainPaymentService(db *gorm.DB) *BlockchainPaymentService {
	return &BlockchainPaymentService{
		db:              db,
		transactionRepo: repository.NewTransactionRepository(db),
		walletAddress:   os.Getenv("BLOCKCHAIN_WALLET_ADDRESS"), // 0x2f22a13cce6041c8bf3f0d569bb32a1ce729d599
		chainName:       "BNB Smart Chain (BEP20)",
		acceptedTokens:  []string{"USDT", "USDC", "BNB"},
		bscscanAPIKey:   os.Getenv("BSCSCAN_API_KEY"), // Get from https://bscscan.com/apis
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// BlockchainPaymentRequest represents a crypto payment initiation
type BlockchainPaymentRequest struct {
	UserID         uint    `json:"user_id" binding:"required"`
	Amount         float64 `json:"amount" binding:"required,gt=0"`
	Currency       string  `json:"currency" binding:"required"` // RWF or USD
	Token          string  `json:"token" binding:"required"`    // USDT, USDC, BNB
	Description    string  `json:"description"`
	SubscriptionID *uint   `json:"subscription_id,omitempty"`
	PropertyID     *uint   `json:"property_id,omitempty"`
}

// BlockchainPaymentProofRequest represents proof of crypto payment
type BlockchainPaymentProofRequest struct {
	TransactionID string `json:"transaction_id" binding:"required"`
	TxHash        string `json:"tx_hash" binding:"required"`      // Blockchain transaction hash
	FromAddress   string `json:"from_address" binding:"required"` // Sender's wallet address
}

// BlockchainPaymentResponse contains payment details
type BlockchainPaymentResponse struct {
	TransactionID      string  `json:"transaction_id"`
	Status             string  `json:"status"`
	Message            string  `json:"message"`
	WalletAddress      string  `json:"wallet_address"`
	ChainName          string  `json:"chain_name"`
	Token              string  `json:"token"`
	AmountCrypto       float64 `json:"amount_crypto"` // Amount in crypto (e.g., 10.50 USDT)
	AmountFiat         float64 `json:"amount_fiat"`   // Amount in RWF/USD
	ExchangeRate       float64 `json:"exchange_rate"` // Crypto to Fiat rate
	ReferenceNumber    string  `json:"reference_number"`
	QRCodeData         string  `json:"qr_code_data"` // For mobile wallet scanning
	ExpiresAt          string  `json:"expires_at"`
	BlockchainExplorer string  `json:"blockchain_explorer"` // BscScan URL
}

// TokenContract addresses on BNB Smart Chain
var tokenContracts = map[string]string{
	"USDT": "0x55d398326f99059fF775485246999027B3197955", // Tether USD (BEP20)
	"USDC": "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d", // USD Coin (BEP20)
	"BNB":  "0x0000000000000000000000000000000000000000", // Native BNB (not a token)
}

// InitiateBlockchainPayment creates a pending crypto payment
func (s *BlockchainPaymentService) InitiateBlockchainPayment(ctx context.Context, req *BlockchainPaymentRequest) (*BlockchainPaymentResponse, error) {
	// Validate request
	if err := s.validateBlockchainPaymentRequest(req); err != nil {
		return nil, err
	}

	// Get current crypto exchange rate (RWF/USD to USDT)
	cryptoAmount, exchangeRate, err := s.calculateCryptoAmount(ctx, req.Amount, req.Currency, req.Token)
	if err != nil {
		return nil, fmt.Errorf("failed to calculate crypto amount: %w", err)
	}

	// Generate reference number
	referenceNumber := s.generateCryptoReference()

	// Create transaction record with pending status
	transaction := &models.Transaction{
		UserID:           req.UserID,
		AmountRWF:        req.Amount,
		Currency:         req.Currency,
		PaymentProvider:  "blockchain_bnb_chain",
		PaymentMethod:    fmt.Sprintf("crypto_%s", strings.ToLower(req.Token)),
		Status:           "pending_blockchain_confirmation",
		PaymentStatus:    "awaiting_transaction",
		Description:      req.Description,
		PaymentReference: referenceNumber,
		OfferDate:        &time.Time{},
	}

	// Store crypto payment details in Documents field
	cryptoData := map[string]interface{}{
		"token":             req.Token,
		"crypto_amount":     cryptoAmount,
		"exchange_rate":     exchangeRate,
		"wallet_address":    s.walletAddress,
		"chain_name":        s.chainName,
		"token_contract":    tokenContracts[req.Token],
		"payment_initiated": time.Now(),
		"expires_at":        time.Now().Add(24 * time.Hour), // 24h expiry
	}
	transaction.Documents = models.JSON(cryptoData)

	// Link to subscription or property
	if req.SubscriptionID != nil {
		transaction.SubscriptionID = *req.SubscriptionID
	}
	if req.PropertyID != nil {
		transaction.PropertyID = *req.PropertyID
	}

	// Save to database
	if _, err := s.transactionRepo.Create(ctx, transaction); err != nil {
		return nil, fmt.Errorf("failed to create transaction: %w", err)
	}

	// Generate QR code data for mobile wallets (BEP-681 URI scheme)
	qrCodeData := fmt.Sprintf("ethereum:%s@56?value=%f", s.walletAddress, cryptoAmount)
	if req.Token != "BNB" {
		// For ERC20 tokens, use transfer method
		qrCodeData = fmt.Sprintf("ethereum:%s@56/transfer?address=%s&uint256=%f",
			tokenContracts[req.Token], s.walletAddress, cryptoAmount)
	}

	return &BlockchainPaymentResponse{
		TransactionID:      fmt.Sprintf("%d", transaction.ID),
		Status:             "pending_blockchain_confirmation",
		Message:            fmt.Sprintf("Send %.4f %s to the wallet address below", cryptoAmount, req.Token),
		WalletAddress:      s.walletAddress,
		ChainName:          s.chainName,
		Token:              req.Token,
		AmountCrypto:       cryptoAmount,
		AmountFiat:         req.Amount,
		ExchangeRate:       exchangeRate,
		ReferenceNumber:    referenceNumber,
		QRCodeData:         qrCodeData,
		ExpiresAt:          time.Now().Add(24 * time.Hour).Format(time.RFC3339),
		BlockchainExplorer: "https://bscscan.com/address/" + s.walletAddress,
	}, nil
}

// SubmitBlockchainProof allows user to submit transaction hash after sending crypto
func (s *BlockchainPaymentService) SubmitBlockchainProof(ctx context.Context, req *BlockchainPaymentProofRequest) error {
	// Get transaction
	transaction, err := s.transactionRepo.GetByID(ctx, 0) // TODO: Parse transaction ID
	if err != nil {
		return fmt.Errorf("transaction not found: %w", err)
	}

	// Verify transaction is in correct status
	if transaction.Status != "pending_blockchain_confirmation" {
		return errors.New("transaction is not awaiting blockchain confirmation")
	}

	// Verify the blockchain transaction using BscScan API
	verified, amount, err := s.verifyBlockchainTransaction(ctx, req.TxHash, req.FromAddress)
	if err != nil {
		return fmt.Errorf("blockchain verification failed: %w", err)
	}

	if !verified {
		return errors.New("transaction not found on blockchain or invalid")
	}

	// Extract crypto details from Documents field
	docs := transaction.Documents
	expectedAmount := docs["crypto_amount"].(float64)

	// Check if amount matches (allow 1% tolerance for gas fees)
	if amount < expectedAmount*0.99 {
		return fmt.Errorf("amount mismatch: expected %.4f, received %.4f", expectedAmount, amount)
	}

	// Update transaction with blockchain proof
	transaction.ProviderTransactionID = req.TxHash
	transaction.Status = "completed"
	transaction.PaymentStatus = "blockchain_confirmed"
	now := time.Now()
	transaction.CompletionDate = &now
	transaction.AcceptanceDate = &now

	// Update Documents with proof
	docs["tx_hash"] = req.TxHash
	docs["from_address"] = req.FromAddress
	docs["confirmed_at"] = time.Now()
	docs["blockchain_verified"] = true
	docs["received_amount"] = amount
	transaction.Documents = models.JSON(docs)

	// Update transaction
	if err := s.transactionRepo.Update(ctx, transaction); err != nil {
		return fmt.Errorf("failed to update transaction: %w", err)
	}

	// TODO: Trigger notification to user for successful payment
	// s.notificationService.NotifyUserBlockchainPaymentConfirmed(transaction)

	return nil
}

// verifyBlockchainTransaction uses BscScan API to verify the transaction
func (s *BlockchainPaymentService) verifyBlockchainTransaction(ctx context.Context, txHash string, fromAddress string) (bool, float64, error) {
	if s.bscscanAPIKey == "" {
		// For development: skip verification
		return true, 10.0, nil // Mock verification
	}

	// BscScan API: Get transaction receipt
	url := fmt.Sprintf(
		"https://api.bscscan.com/api?module=proxy&action=eth_getTransactionByHash&txhash=%s&apikey=%s",
		txHash, s.bscscanAPIKey,
	)

	resp, err := s.httpClient.Get(url)
	if err != nil {
		return false, 0, fmt.Errorf("BscScan API request failed: %w", err)
	}
	defer resp.Body.Close()

	body, _ := io.ReadAll(resp.Body)
	var result map[string]interface{}
	if err := json.Unmarshal(body, &result); err != nil {
		return false, 0, fmt.Errorf("failed to parse BscScan response: %w", err)
	}

	// Check if transaction exists
	if result["result"] == nil {
		return false, 0, errors.New("transaction not found on blockchain")
	}

	txData := result["result"].(map[string]interface{})

	// Verify recipient is our wallet
	toAddress := txData["to"].(string)
	if !strings.EqualFold(toAddress, s.walletAddress) {
		return false, 0, errors.New("transaction recipient is not our wallet")
	}

	// Verify sender matches
	from := txData["from"].(string)
	if !strings.EqualFold(from, fromAddress) {
		return false, 0, errors.New("sender address mismatch")
	}

	// Get amount (value is in Wei for BNB, need to decode for tokens)
	// For simplicity, return mock amount
	// TODO: Implement proper Wei to USDT conversion using decimals
	amount := 10.0 // Placeholder

	return true, amount, nil
}

// calculateCryptoAmount converts fiat (RWF/USD) to crypto (USDT)
func (s *BlockchainPaymentService) calculateCryptoAmount(ctx context.Context, fiatAmount float64, fiatCurrency string, token string) (float64, float64, error) {
	// For USDT: 1 USDT ≈ 1 USD
	// Convert RWF to USD, then to USDT

	var usdAmount float64
	var exchangeRate float64

	if fiatCurrency == "USD" {
		usdAmount = fiatAmount
		exchangeRate = 1.0
	} else if fiatCurrency == "RWF" {
		// Current rate: 1 USD ≈ 1,300 RWF (use live API in production)
		// TODO: Integrate with forex API (e.g., https://currencyapi.com)
		rwfToUsd := 0.00077 // 1 RWF = 0.00077 USD (1/1300)
		usdAmount = fiatAmount * rwfToUsd
		exchangeRate = rwfToUsd
	} else {
		return 0, 0, errors.New("unsupported currency")
	}

	// For USDT/USDC: 1:1 with USD
	// For BNB: need to fetch current BNB price
	var cryptoAmount float64
	switch token {
	case "USDT", "USDC":
		cryptoAmount = usdAmount
	case "BNB":
		// TODO: Fetch current BNB price from API (e.g., CoinGecko, Binance)
		// For now, assume 1 BNB = 300 USD
		bnbPrice := 300.0
		cryptoAmount = usdAmount / bnbPrice
	default:
		return 0, 0, errors.New("unsupported token")
	}

	return cryptoAmount, exchangeRate, nil
}

// CheckBlockchainPaymentStatus queries blockchain for transaction status
func (s *BlockchainPaymentService) CheckBlockchainPaymentStatus(ctx context.Context, transactionID string) (*BlockchainPaymentResponse, error) {
	// Get transaction from database
	transaction, err := s.transactionRepo.GetByID(ctx, 0) // TODO: Parse transaction ID
	if err != nil {
		return nil, fmt.Errorf("transaction not found: %w", err)
	}

	// Extract crypto details
	docs := transaction.Documents

	return &BlockchainPaymentResponse{
		TransactionID:   transactionID,
		Status:          transaction.Status,
		Message:         s.getBlockchainStatusMessage(transaction.Status),
		WalletAddress:   s.walletAddress,
		ChainName:       s.chainName,
		Token:           docs["token"].(string),
		AmountCrypto:    docs["crypto_amount"].(float64),
		AmountFiat:      transaction.AmountRWF,
		ReferenceNumber: transaction.PaymentReference,
	}, nil
}

// Helper functions

func (s *BlockchainPaymentService) validateBlockchainPaymentRequest(req *BlockchainPaymentRequest) error {
	if req.UserID == 0 {
		return errors.New("user_id is required")
	}
	if req.Amount <= 0 {
		return errors.New("amount must be greater than 0")
	}
	if req.Currency != "RWF" && req.Currency != "USD" {
		return errors.New("currency must be RWF or USD")
	}

	// Check if token is supported
	validToken := false
	for _, token := range s.acceptedTokens {
		if req.Token == token {
			validToken = true
			break
		}
	}
	if !validToken {
		return fmt.Errorf("token %s not supported. Accepted: %v", req.Token, s.acceptedTokens)
	}

	if s.walletAddress == "" {
		return errors.New("blockchain wallet not configured")
	}

	return nil
}

func (s *BlockchainPaymentService) generateCryptoReference() string {
	return fmt.Sprintf("CRYPTO-%s-%d", time.Now().Format("20060102-150405"), time.Now().UnixNano()%10000)
}

func (s *BlockchainPaymentService) getBlockchainStatusMessage(status string) string {
	messages := map[string]string{
		"pending_blockchain_confirmation": "Awaiting blockchain transaction",
		"completed":                       "Payment confirmed on blockchain",
		"expired":                         "Payment window expired",
		"cancelled":                       "Payment cancelled",
	}
	if msg, ok := messages[status]; ok {
		return msg
	}
	return "Unknown status"
}
