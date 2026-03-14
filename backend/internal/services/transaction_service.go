package services

import (
	"backend/internal/models"
	"context"
)

type TransactionService struct {
	Repo models.TransactionRepository
}

func NewTransactionService(repo models.TransactionRepository) *TransactionService {
	return &TransactionService{Repo: repo}
}

func (s *TransactionService) GetTransactionByID(ctx context.Context, id uint) (*models.Transaction, error) {
	return s.Repo.GetByID(ctx, id)
}
