# Land Valuation System (LVS) 🏘️

[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?style=for-the-badge&logo=go)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)

---

## 🚀 Status: MVP in Progress (Week 1 Complete)

| Phase | Status | Completion | ETA |
|-------|--------|-----------|-----|
| **Week 1:** Backend + Auth | ✅ Complete | 95% | Mar 6 ✓ |
| **Week 2:** Frontend + Payments | 🔄 In Progress | 40% | Mar 13 |
| **Week 3:** Testing + Polish | 📅 Planned | 0% | Mar 20 |
| **Week 4:** Deployment + Launch | 📅 Planned | 0% | Apr 13 |

**🎯 Launch Target:** April 13, 2026 | **Mode:** Solo Developer (40-50 hrs/week)

### 📚 **START HERE:**
- 👉 **[START_HERE.md](docs/START_HERE.md)** — Quick start in 5 minutes
- 📖 **[QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)** — Daily commands & troubleshooting
- 📋 **[PROJECT_STATUS_MARCH_6.md](docs/PROJECT_STATUS_MARCH_6.md)** — What's done/todo
- 📅 **[SOLO_DEV_TASK_SCHEDULE.md](docs/SOLO_DEV_TASK_SCHEDULE.md)** — Your 6-week plan

### ⚡ Quick Start (5 min):
```bash
# Navigate to project
cd /home/sdragon/Desktop/GitHub/land-valuation-system



### 🚩 Price Estimation Process (Strict Multi-Field Search)

**IMPORTANT: The only supported workflow for price estimation is a multi-field search using the following five fields:**

- `province`
- `district`
- `sector`
- `cell`
- `village`

`plot_size_sqm` is **only** used for calculating the total price, **not** for searching or filtering records.

**UPI-based search is deprecated and must NOT be used for price estimation.**

#### API Endpoint

- **URL:** `/api/v1/estimate-search`
- **Method:** `POST`
- **Request Body:**
   ```json
   {
      "province": "Kigali",
      "district": "Gasabo",
      "sector": "Kacyiru",
      "cell": "Biryogo",
      "village": "VillageName",
      "plot_size_sqm": 500
   }
   ```
- **Response Example:**
   ```json
   {
      "success": true,
      "message": "Estimate search successful",
      "data": {
         "province": "Kigali",
         "district": "Gasabo",
         "sector": "Kacyiru",
         "cell": "Biryogo",
         "village": "VillageName",
         "land_use": "Residential",
         "min_value_per_sqm": 10000,
         "weighted_avg_value_per_sqm": 12000,
         "max_value_per_sqm": 15000,
         "total_min_value": 5000000,
         "total_weighted_avg_value": 6000000,
         "total_max_value": 7500000
      }
   }
   ```

**Authoritative Data Source:** All price lookups are performed using the `village_land_values` table (backed by `village_land_values_joined_clean.csv`).

**Summary:**
- Search is always performed using all five location fields (province, district, sector, cell, village).
- `plot_size_sqm` is used only for multiplying the per-sqm values to get total prices.
- UPI-based endpoints are not used for price estimation.
- See [docs/LAND_VALUE_ESTIMATION.md](docs/LAND_VALUE_ESTIMATION.md) for the full workflow and rationale.

---

**User Flow:**
- User must be registered and logged in to perform a search.
- User provides: Province, District, Sector, Cell, Village, and Plot Size (sqm).

**Algorithm Steps:**
1. **Registration Check:** Ensure the user is registered and authenticated. If not, prompt registration/login.
2. **Multi-Field Search:** Query the `village_land_values` table using all provided fields (province, district, sector, cell, village).
3. **Price Calculation:**
   - Use the land value metrics (min, weighted avg, max per sqm) from the matched record.
   - If plot size is provided, multiply each value per sqm by plot size to get total values.
4. **Response Construction:** Return a response containing:
   - The administrative location details
   - Land use
   - Land value metrics (per sqm and total)
5. **Error Handling:**
   - If any field is missing or no match is found, return a clear error message.


**Note:** All price lookups are performed using the `village_land_values` table. UPI-based search is no longer supported for price estimation. Multi-field search is the only supported method.

> These two features—Land Price Estimate Search (in dashboards) and Advertising Land/Properties—are the foundation of our platform. They must always work perfectly, with a focus on reliability, user experience, and accuracy. All development and QA efforts should prioritize these workflows.

---

## ⚠️ Troubleshooting Land Estimate Search

If you see "Failed to fetch estimate" or a 404 error when searching for a land estimate:

- The backend is searching for an exact match in the `village_land_values` table for all five fields: province, district, sector, cell, and village.
- If no row matches **all** these values, the query returns 0 rows and the API returns a 404 or error.

### How to Fix
1. **Check your data:**
   - Make sure a row exists in `village_land_values` with all fields matching exactly (no typos, correct spelling/capitalization).
   - Try running a query like:
     ```sql
     SELECT * FROM village_land_values
     WHERE province ILIKE '%kigali%'
       AND district ILIKE '%nyarugenge%'
       AND sector ILIKE '%gitega%'
       AND cell ILIKE '%akabahizi%'
       AND village ILIKE '%gihanga%';
     ```
2. **If you want fallback/partial match logic (e.g., ignore village if not found), update the backend to try less specific queries if the full match fails.**
3. **Check for alternate spellings or trailing spaces in your data.**

If you need help adding fallback logic or want to log available values for debugging, see the backend handler code or ask for support.

---

---

## 📋 Overview


Land Valuation System (LVS) is a comprehensive platform for accurate land pricing in Rwanda, integrating official gazette data with modern geolocation technology. LVS empowers Rwanda Government Institutions, Certified Valuers, landowners, diaspora investors, and Rwandan/foreign buyers with reliable valuation, registration services, and a secure marketplace for land transactions.


## 🏡 User Registration & Land Advertisement

### User Registration

Users can easily register for an account using the registration page:

- Go to `/auth/register` on the frontend (or click 'Sign Up' in the navigation).
- Fill in your details and complete the registration process.
- After registering, verify your email and log in to access all features.


### Advertise Your Land/Property


Registered users can advertise their land or property for sale on the platform:

- After logging in, navigate to the dashboard or the 'Add Property' section.
- Go to `/properties/add` to access the Add Property form.
- Fill in the required details about your land/property (location, description, price, etc.).
- Submit the form to create a new property listing.
- You can manage your listings from your dashboard (e.g., edit, remove, or promote your ads).


**Note:** Only registered and logged-in users can post land/property advertisements. This ensures trust and accountability on the platform.



### Friendly Price Estimation for Your Land/Property

Users can estimate the value of their land or property by providing the five required location fields (province, district, sector, cell, village) and the plot size in square meters. UPI-based estimation is not supported for price estimation. All calculations use the authoritative `village_land_values` table. See [docs/LAND_VALUE_ESTIMATION.md](docs/LAND_VALUE_ESTIMATION.md) for the full workflow and rationale.

This workflow ensures LVS is robust, user-friendly, and fully independent.

---


### (Deprecated) UPI-Based Search

> **Note:** UPI-based search and estimation logic is deprecated and must not be used for price estimation. All price estimation must use the multi-field search workflow described above. The `gazette_land_prices` and `collected_upis` tables are not used for price estimation. All logic is based on the `village_land_values` table.
            "price": 11000000,
            "price_type": "Weighted Average Value Per Sqm"
         }
      }
      ```
- Go 1.21+
- Node.js 18+
- Docker & Docker Compose
- PostgreSQL 15+
- Redis 7+

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/land-valuation-system.git
   cd land-valuation-system
   ```

2. **Run Tests**
   - Backend: `cd backend && go test ./... -v` | go run ./cmd/api/main.go
   - Frontend: `cd frontend && npm run test`
   - Mobile: `cd mobile && npm run test`

