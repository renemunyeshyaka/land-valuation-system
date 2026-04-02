package services

import (
	"context"
	"testing"

	"backend/internal/models"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
	"gorm.io/driver/sqlite"
	"gorm.io/gorm"
)

func setupMarketplaceServiceTestDB(t *testing.T) *gorm.DB {
	db, err := gorm.Open(sqlite.Open(":memory:"), &gorm.Config{})
	require.NoError(t, err)

	err = db.AutoMigrate(&models.User{}, &models.Property{}, &models.MarketplaceListing{})
	require.NoError(t, err)

	owner := &models.User{
		ID:           1,
		Email:        "owner@example.com",
		Password:     "owner-pass",
		ReferralCode: "OWNER-REF-001",
	}
	require.NoError(t, db.Create(owner).Error)

	nonOwner := &models.User{
		ID:           2,
		Email:        "other@example.com",
		Password:     "other-pass",
		ReferralCode: "OTHER-REF-002",
	}
	require.NoError(t, db.Create(nonOwner).Error)

	property := &models.Property{
		ID:           10,
		District:     "Gasabo",
		Sector:       "Kimironko",
		Title:        "Test Property",
		PropertyType: "residential",
		Status:       "available",
		UPI:          "1/02/03/04/0001",
		LandSize:     500,
		Price:        1000000,
		Currency:     "RWF",
		OwnerID:      1,
	}
	require.NoError(t, db.Create(property).Error)

	return db
}

func TestMarketplaceService_SyncPropertyWithMarketplaces_OwnerAllowed(t *testing.T) {
	db := setupMarketplaceServiceTestDB(t)
	svc := NewMarketplaceService(db)

	result, err := svc.SyncPropertyWithMarketplaces(context.Background(), "10", "1", false)
	require.NoError(t, err)

	resultMap, ok := result.(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, "completed", resultMap["sync_status"])
	assert.Equal(t, uint(10), resultMap["property_id"])
	assert.Equal(t, uint(1), resultMap["owner_id"])
}

func TestMarketplaceService_SyncPropertyWithMarketplaces_NonOwnerDenied(t *testing.T) {
	db := setupMarketplaceServiceTestDB(t)
	svc := NewMarketplaceService(db)

	result, err := svc.SyncPropertyWithMarketplaces(context.Background(), "10", "2", false)
	require.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "do not have permission")
}

func TestMarketplaceService_SyncPropertyWithMarketplaces_AdminAllowed(t *testing.T) {
	db := setupMarketplaceServiceTestDB(t)
	svc := NewMarketplaceService(db)

	result, err := svc.SyncPropertyWithMarketplaces(context.Background(), "10", "2", true)
	require.NoError(t, err)

	resultMap, ok := result.(map[string]interface{})
	require.True(t, ok)
	assert.Equal(t, "completed", resultMap["sync_status"])
	assert.Equal(t, uint(10), resultMap["property_id"])
}

func TestMarketplaceService_SyncPropertyWithMarketplaces_PropertyNotFound(t *testing.T) {
	db := setupMarketplaceServiceTestDB(t)
	svc := NewMarketplaceService(db)

	result, err := svc.SyncPropertyWithMarketplaces(context.Background(), "999", "1", false)
	require.Error(t, err)
	assert.Nil(t, result)
	assert.Contains(t, err.Error(), "property not found")
}

func TestMarketplaceService_GetProperty(t *testing.T) {
	db := setupMarketplaceServiceTestDB(t)
	svc := NewMarketplaceService(db)

	property, err := svc.GetProperty(context.Background(), "10")
	require.NoError(t, err)
	require.NotNil(t, property)
	assert.Equal(t, uint(10), property.ID)

	missing, err := svc.GetProperty(context.Background(), "999")
	require.Error(t, err)
	assert.Nil(t, missing)
	assert.ErrorIs(t, err, ErrMarketplacePropertyNotFound)
}

func TestMarketplaceService_ListProperties(t *testing.T) {
	db := setupMarketplaceServiceTestDB(t)
	svc := NewMarketplaceService(db)

	properties, total, err := svc.ListProperties(context.Background(), 1, 20, "", "available", "Gasabo")
	require.NoError(t, err)
	assert.Equal(t, 1, total)
	require.Len(t, properties, 1)
	assert.Equal(t, "Gasabo", properties[0].District)
}

func TestMarketplaceService_CreateUpdateDeleteProperty(t *testing.T) {
	db := setupMarketplaceServiceTestDB(t)
	svc := NewMarketplaceService(db)

	created, err := svc.CreateProperty(context.Background(), &models.Property{
		District:     "Nyarugenge",
		Sector:       "Gitega",
		Title:        "Service Created Property",
		PropertyType: "residential",
		Status:       "available",
		UPI:          "1/02/03/04/0009",
		LandSize:     250,
		Price:        800000,
		Currency:     "RWF",
		OwnerID:      1,
	})
	require.NoError(t, err)
	require.NotNil(t, created)
	require.NotZero(t, created.ID)

	created.Title = "Updated Service Property"
	updated, err := svc.UpdateProperty(context.Background(), created)
	require.NoError(t, err)
	assert.Equal(t, "Updated Service Property", updated.Title)

	err = svc.DeleteProperty(context.Background(), "999999")
	require.Error(t, err)
	assert.ErrorIs(t, err, ErrMarketplacePropertyNotFound)

	err = svc.DeleteProperty(context.Background(), "11")
	require.NoError(t, err)

	deleted, err := svc.GetProperty(context.Background(), "11")
	require.Error(t, err)
	assert.Nil(t, deleted)
	assert.ErrorIs(t, err, ErrMarketplacePropertyNotFound)
}

func TestMarketplaceService_GetMarketplaceListingsAndGetListingsForProperty(t *testing.T) {
	db := setupMarketplaceServiceTestDB(t)
	svc := NewMarketplaceService(db)

	listings, err := svc.GetMarketplaceListings(context.Background(), "10")
	require.NoError(t, err)
	require.Len(t, listings, 1)
	assert.Equal(t, "internal_marketplace", listings[0]["source"])

	ifaceListings, err := svc.GetListingsForProperty(context.Background(), "10")
	require.NoError(t, err)
	require.Len(t, ifaceListings, 1)
}

func TestMarketplaceService_SyncMarketplaceAPIs(t *testing.T) {
	db := setupMarketplaceServiceTestDB(t)
	svc := NewMarketplaceService(db)

	result, err := svc.SyncMarketplaceAPIs(context.Background(), "10")
	require.NoError(t, err)
	assert.Equal(t, "10", result["property_id"])
	assert.Equal(t, 6, result["successful_syncs"])
	assert.Equal(t, 0, result["failed_syncs"])
	synced := result["synced_apis"].([]string)
	assert.Len(t, synced, 6)
	assert.Contains(t, synced, "Rwanda Real Estate")
	assert.Contains(t, synced, "Kigali Property Market")
	assert.Contains(t, synced, "OLX Rwanda")
	assert.Contains(t, synced, "Jumia House")
	assert.Contains(t, synced, "Rwanda Land Authority")
	assert.Contains(t, synced, "Custom Marketplaces")

	// DB should have 6 marketplace_listing rows for property 10
	var count int64
	require.NoError(t, db.Model(&models.MarketplaceListing{}).Where("property_id = ?", 10).Count(&count).Error)
	assert.EqualValues(t, 6, count)

	// Re-sync should upsert (no duplicate rows)
	_, err = svc.SyncMarketplaceAPIs(context.Background(), "10")
	require.NoError(t, err)
	require.NoError(t, db.Model(&models.MarketplaceListing{}).Where("property_id = ?", 10).Count(&count).Error)
	assert.EqualValues(t, 6, count)

	// Non-existent property returns not-found error
	_, err = svc.SyncMarketplaceAPIs(context.Background(), "9999")
	assert.ErrorIs(t, err, ErrMarketplacePropertyNotFound)
}

func TestMarketplaceService_GetPropertyListingsOnSale(t *testing.T) {
	db := setupMarketplaceServiceTestDB(t)
	svc := NewMarketplaceService(db)

	// No listings yet → empty result
	listings, total, err := svc.GetPropertyListingsOnSale(context.Background(), 1, 20, "")
	require.NoError(t, err)
	assert.Equal(t, 0, total)
	assert.Empty(t, listings)

	// Sync property 10 → creates marketplace_listing rows
	_, err = svc.SyncMarketplaceAPIs(context.Background(), "10")
	require.NoError(t, err)

	listings, total, err = svc.GetPropertyListingsOnSale(context.Background(), 1, 20, "")
	require.NoError(t, err)
	assert.Equal(t, 1, total)
	require.Len(t, listings, 1)
	assert.EqualValues(t, 10, listings[0]["id"])

	// Filter by wrong type → empty
	listings, total, err = svc.GetPropertyListingsOnSale(context.Background(), 1, 20, "commercial")
	require.NoError(t, err)
	assert.Equal(t, 0, total)
	assert.Empty(t, listings)

	// Filter by correct type → 1 result
	listings, total, err = svc.GetPropertyListingsOnSale(context.Background(), 1, 20, "residential")
	require.NoError(t, err)
	assert.Equal(t, 1, total)
	require.Len(t, listings, 1)
}

func TestMarketplaceService_SearchProperties(t *testing.T) {
	db := setupMarketplaceServiceTestDB(t)
	// Add a property with known coordinates
	geo := &models.Property{
		ID:             20,
		District:       "Gasabo",
		Sector:         "Remera",
		Title:          "Geo Property",
		PropertyType:   "commercial",
		Status:         "available",
		UPI:            "1/02/03/04/0002",
		LandSize:       200,
		Price:          500000,
		MarketPriceRWF: 50000000,
		Currency:       "RWF",
		OwnerID:        1,
		Latitude:       -1.9441,
		Longitude:      30.0619,
	}
	require.NoError(t, db.Create(geo).Error)

	svc := NewMarketplaceService(db)

	// No filters → returns all non-deleted properties
	all, err := svc.SearchProperties(context.Background(), 0, 0, 0, "", 0)
	require.NoError(t, err)
	assert.GreaterOrEqual(t, len(all), 2)

	// Filter by propertyType
	commercial, err := svc.SearchProperties(context.Background(), 0, 0, 0, "commercial", 0)
	require.NoError(t, err)
	assert.Len(t, commercial, 1)
	assert.Equal(t, uint(20), commercial[0].ID)

	// Filter by maxPrice (MarketPriceRWF)
	cheap, err := svc.SearchProperties(context.Background(), 0, 0, 0, "", 10000000)
	require.NoError(t, err)
	// property 10 has Price=1000000 which is ≤ 10000000
	for _, p := range cheap {
		assert.True(t, p.Price <= 10000000 || p.MarketPriceRWF <= 10000000)
	}

	// Bounding-box search: centre on geo property, 5 km radius → should include it
	nearby, err := svc.SearchProperties(context.Background(), -1.9441, 30.0619, 5, "", 0)
	require.NoError(t, err)
	var found bool
	for _, p := range nearby {
		if p.ID == 20 {
			found = true
		}
	}
	assert.True(t, found, "geo property should be within bounding box")

	// Bounding-box search far away → geo property excluded
	farAway, err := svc.SearchProperties(context.Background(), 51.5, 0.1, 1, "", 0)
	require.NoError(t, err)
	for _, p := range farAway {
		assert.NotEqual(t, uint(20), p.ID)
	}
}

func TestMarketplaceService_SearchPropertiesPaginated(t *testing.T) {
	db := setupMarketplaceServiceTestDB(t)
	second := &models.Property{
		ID:           21,
		District:     "Gasabo",
		Sector:       "Kacyiru",
		Title:        "Second Residential",
		PropertyType: "residential",
		Status:       "available",
		UPI:          "1/02/03/04/0021",
		LandSize:     300,
		Price:        1100000,
		Currency:     "RWF",
		OwnerID:      1,
	}
	require.NoError(t, db.Create(second).Error)

	svc := NewMarketplaceService(db)

	// With default fixtures there are two properties, both residential and below this max price.
	page1, total, err := svc.SearchPropertiesPaginated(context.Background(), 0, 0, 0, "residential", 2000000, 1, 1)
	require.NoError(t, err)
	assert.Equal(t, 2, total)
	require.Len(t, page1, 1)

	page2, total, err := svc.SearchPropertiesPaginated(context.Background(), 0, 0, 0, "residential", 2000000, 2, 1)
	require.NoError(t, err)
	assert.Equal(t, 2, total)
	require.Len(t, page2, 1)

	// Out-of-range page keeps total but returns empty data.
	emptyPage, total, err := svc.SearchPropertiesPaginated(context.Background(), 0, 0, 0, "residential", 2000000, 999, 1)
	require.NoError(t, err)
	assert.Equal(t, 2, total)
	require.Len(t, emptyPage, 0)
}
