package repository

import (
	"backend/internal/models"
	"context"

	"gorm.io/gorm"
)

type CurrencyRepository struct {
	db *gorm.DB
}

func NewCurrencyRepository(db *gorm.DB) *CurrencyRepository {
	return &CurrencyRepository{db: db}
}

// GetAllActive returns all active currencies
func (r *CurrencyRepository) GetAllActive(ctx context.Context) ([]models.Currency, error) {
	var currencies []models.Currency
	err := r.db.WithContext(ctx).Where("is_active = ?", true).Order("id ASC").Find(&currencies).Error
	return currencies, err
}

// GetByCode returns a currency by its ISO code
func (r *CurrencyRepository) GetByCode(ctx context.Context, code string) (*models.Currency, error) {
	var currency models.Currency
	err := r.db.WithContext(ctx).Where("iso_code = ?", code).First(&currency).Error
	if err != nil {
		return nil, err
	}
	return &currency, nil
}

// GetBaseCurrency returns the base currency (RWF)
func (r *CurrencyRepository) GetBaseCurrency(ctx context.Context) (*models.Currency, error) {
	var currency models.Currency
	err := r.db.WithContext(ctx).Where("is_base = ?", true).First(&currency).Error
	if err != nil {
		return nil, err
	}
	return &currency, nil
}

// UpdateExchangeRate updates the exchange rate for a currency
func (r *CurrencyRepository) UpdateExchangeRate(ctx context.Context, code string, rate float64) error {
	return r.db.WithContext(ctx).Model(&models.Currency{}).
		Where("iso_code = ?", code).
		Updates(map[string]interface{}{
			"exchange_rate_to_rwf": rate,
			"last_synced_at":       gorm.Expr("CURRENT_TIMESTAMP"),
		}).Error
}

// UpdateAllExchangeRates updates all exchange rates in a batch
func (r *CurrencyRepository) UpdateAllExchangeRates(ctx context.Context, rates map[string]float64) error {
	for code, rate := range rates {
		if err := r.UpdateExchangeRate(ctx, code, rate); err != nil {
			return err
		}
	}
	return nil
}

// GetByRegion returns active currencies for a region
func (r *CurrencyRepository) GetByRegion(ctx context.Context, region string) ([]models.Currency, error) {
	var currencies []models.Currency
	err := r.db.WithContext(ctx).
		Where("region = ? AND is_active = ?", region, true).
		Find(&currencies).Error
	return currencies, err
}
