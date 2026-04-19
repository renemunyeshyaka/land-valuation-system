# Land Valuation System (LVS) 🏘️

[![Go Version](https://img.shields.io/badge/Go-1.23+-00ADD8?style=for-the-badge&logo=go)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-14+-336791?style=for-the-badge&logo=postgresql)](https://postgresql.org/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)

---

## 🚀 Status: MVP in Progress (April 2026 Snapshot)

| Phase | Status | Completion | ETA |
|-------|--------|-----------|-----|
| **Week 1:** Backend + Auth | ✅ Complete | 95% | Mar 6 ✓ |
| **Week 2:** Frontend + Payments | 🔄 In Progress | 70% | Revalidated in April |
| **Week 3:** Testing + Polish | 🔄 In Progress | 45% | Revalidated in April |
| **Week 4:** Deployment + Launch | ⏳ Pending Final Validation | 20% | Launch window under review |

**🎯 Launch Target:** Under active revalidation (April 2026) | **Mode:** Solo Developer (40-50 hrs/week)

### 📚 **START HERE:**
- 👉 **[START_HERE.md](docs/START_HERE.md)** — Quick start in 5 minutes
- 📖 **[QUICK_REFERENCE.md](docs/QUICK_REFERENCE.md)** — Daily commands & troubleshooting
- 📋 **[PROJECT_STATUS_MARCH_6.md](docs/PROJECT_STATUS_MARCH_6.md)** — What's done/todo
- 📅 **[SOLO_DEV_TASK_SCHEDULE.md](docs/SOLO_DEV_TASK_SCHEDULE.md)** — Your 6-week plan

### ⚡ Quick Start (5 min):
```bash
# Navigate to project
cd /home/sdragon/Desktop/GitHub/land-valuation-system
```

## 🤝 Partners & Integrations

Potential and target partners for the Land Valuation System include:

- **Banks & Mortgage Providers:** Bank of Kigali, Equity Bank, and others
- **Real Estate Agencies:** Vibe House, Century Real Estate, etc.
- **Land Surveyors & Valuation Firms**
- **Government Agencies:** Rwanda Land Management and Use Authority (RLMUA), Rwanda Development Board (RDB, for data only)
- **Payment Providers:** MTN Mobile Money, Airtel Money, Paystack
- **Legal Firms:** For land transfer and legal advice
- **Technology Providers:** Cloud, mapping, and AI/ML services
- **NGOs & International Development Orgs:** For land transparency and open data
- **Data Providers:** Satellite imagery, gazette publishers
- **Insurance Companies:** Property insurance partners

We are open to new partnerships that enhance transparency, trust, and value for Rwandan landowners and buyers.

## 🚧 Future Features & Planned Integrations

- Direct mortgage offers from partner banks
- Real estate agency listings and syndication
- Payment gateway expansion (more mobile money, card, and digital payment options)
- Legal and insurance service integrations
- Advanced mapping and satellite data partners
- Automated valuation models (AI/ML)
- API integrations for partner platforms

If you are interested in partnering or integrating with LVS, please contact us via the support channels listed in this repository.




### 🚩 Property & Marketplace APIs

#### Property Management API

- **Base URL:** `/api/v1/properties`
- **Description:** Allows registered users to create, view, update, and delete their property listings. Access and limits can be enforced based on user subscription rights.


**Endpoints:**

- `GET /api/v1/properties` — List all properties owned by the authenticated user (with filters, pagination)
- `POST /api/v1/properties` — Create a new property (requires authentication, checks subscription limits)
- `GET /api/v1/properties/:id` — Get a property by ID (**public**, increments and returns views, interested, sqm, etc.)
- `POST /api/v1/properties/:id/interested` — Mark as interested (**public**, increments and returns interested count)
- `PUT /api/v1/properties/:id` — Update a property (owner or admin only)
- `DELETE /api/v1/properties/:id` — Delete a property (owner or admin only)

**Request Example (POST):**
```json
{
   "title": "Prime Plot in Kacyiru",
   "description": "A beautiful residential plot.",
   "plot_number": "UPI-1234567890",
   "province": "Kigali",
   "district": "Gasabo",
   "sector": "Kacyiru",
   "cell": "Biryogo",
   "village": "VillageName",
   "plot_size_sqm": 500,
   "price": 6000000,
   "images": ["https://example.com/uploads/property1.jpg", "https://example.com/uploads/property2.jpg"]
}
```


**Response Example (GET /api/v1/properties/:id):**
```json
{
   "id": 1,
   "owner_id": 2,
   "title": "Prime Plot in Kacyiru",
   "description": "A beautiful residential plot.",
   "plot_number": "UPI-1234567890",
   "province": "Kigali",
   "district": "Gasabo",
   "sector": "Kacyiru",
   "cell": "Biryogo",
   "village": "VillageName",
   "plot_size_sqm": 500,
   "price": 6000000,
   "status": "for_sale",
   "images": ["https://example.com/uploads/property1.jpg", "https://example.com/uploads/property2.jpg"],
   "created_at": "2026-03-31T12:00:00Z",
   "views": 42,
   "interested": 7,
   "land_size": 500,
   "size_unit": "sqm"
}
```

**Public Property Stats:**
- `views` (integer): Public, persistent view count. Incremented on each GET.
- `interested` (integer): Public, persistent like count. Incremented via POST `/api/v1/properties/:id/interested`.
- `land_size` and `size_unit`: Always shown publicly.

**Note:**
- Both endpoints are public and do not require authentication.
- The frontend always displays views, interested, and sqm for all properties.

**Additional Fields:**
- `plot_number`: Unique plot identifier (e.g., UPI or government-issued number).
- `images`: Array of image URLs. Images should be uploaded via a separate endpoint or as part of a multipart/form-data request. Store only the URLs in the property record.

**Subscription Logic:**
- Users may be limited in the number of active listings based on their subscription plan.
- Premium features (e.g., promoted listings, extra images, image upload) can be restricted to higher tiers.
- All actions require authentication; only owners or admins can modify/delete properties.


#### Marketplace API

- **Base URL:** `/api/v1/marketplace`
- **Description:** Publicly lists all properties available for sale. No authentication required for browsing. All public stats (views, interested, sqm) are always visible.

**Endpoints:**
- `GET /api/v1/marketplace/properties-for-sale` — List all properties for sale (with filters, pagination)

**Response Example (GET):**
```json
[
   {
      "id": 1,
      "title": "Prime Plot in Kacyiru",
      "plot_number": "UPI-1234567890",
      "province": "Kigali",
      "district": "Gasabo",
      "sector": "Kacyiru",
      "cell": "Biryogo",
      "village": "VillageName",
      "plot_size_sqm": 500,
      "price": 6000000,
      "status": "for_sale",
      "images": ["https://example.com/uploads/property1.jpg", "https://example.com/uploads/property2.jpg"]
   }
]
```

---

### 🚩 Price Estimation Process (Strict Multi-Field Search)

**IMPORTANT: The only supported workflow for price estimation is a multi-field search using the following five fields:**

- `province`
- `district`
- `sector`
- `cell`
- `village`

`plot_size_sqm` is **only** used for calculating the total price, **not** for searching or filtering records.

**Village Price Fallback Clarification (Data Completeness Rule):**
- No village with complete location keys (`province`, `district`, `sector`, `cell`, `village`) should be dropped from search datasets.
- If a village record is missing one or more price fields, the system imputes those values using this fallback order:
   1. Same `cell` (sibling village/cell aggregate)
   2. Same `sector`
   3. Same `district`
- This rule ensures estimate search and add-property workflows keep full village coverage while preserving consistent pricing behavior.

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


### How it works


The Land Valuation System guides users through a seamless process for land price estimation, property advertisement, and secure transactions:

1. **User Registration:** Sign up and verify your account to access all features.
2. **Land Price Estimation:** Use the dashboard to estimate your land/property value by providing province, district, sector, cell, village, and plot size. The system uses official gazette data for accurate results.
3. **Advertise Property:** Registered users can list properties for sale by filling out the Add Property form. Listings are managed from the user dashboard.
4. **Marketplace Browsing:** All advertised properties appear in the Marketplace, where buyers can browse, search, and filter listings.
5. **Secure Transactions:** The platform supports secure payments and transaction tracking (coming soon).

For a detailed walkthrough of each feature and system flow, visit our [online documentation](docs/START_HERE.md).


### Advertise Your Land/Property


Registered users can advertise their land or property for sale on the platform:

- After logging in, navigate to the dashboard or the 'Add Property' section.
- Go to `/properties/add` to access the Add Property form.
- Fill in the required details about your land/property (location, description, price, etc.).
- Submit the form to create a new property listing.
- You can manage your listings from your dashboard (e.g., edit, remove, or promote your ads).


**Note:** Only registered and logged-in users can post land/property advertisements. This ensures trust and accountability on the platform.

### Marketplace


All properties listed by users are displayed on the `/marketplace` page.

- The Marketplace shows 16 properties per page, with pagination controls (Previous, page numbers, Next) for easy navigation.
- Properties are displayed in a responsive grid (4 columns on large screens, 3 on medium, 2 on small, 1 on mobile).
- Users can browse, search, and view property details directly from the Marketplace.

Only registered and logged-in users can add or manage property listings. The Marketplace is open for all users to browse available properties.

### Friendly Price Estimation for Your Land/Property

Users can estimate the value of their land or property by providing the five required location fields (province, district, sector, cell, village) and the plot size in square meters. UPI-based estimation is not supported for price estimation. All calculations use the authoritative `village_land_values` table. See [docs/LAND_VALUE_ESTIMATION.md](docs/LAND_VALUE_ESTIMATION.md) for the full workflow and rationale.

This workflow ensures LVS is robust, user-friendly, and fully independent.

---


### (Deprecated) UPI-Based Search

> **Note:** UPI-based search and estimation logic is deprecated and must not be used for price estimation. All price estimation must use the multi-field search workflow described above. The `gazette_land_prices` and `collected_upis` tables are not used for price estimation. All logic is based on the `village_land_values` table.

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
   - Backend: `cd backend && go test ./... -v` | go run ./cmd/api | go build ./cmd/api && ./api

   Note: `backend/main.go` is a deprecated shim and should not be used as a runtime entrypoint.
   - Frontend: `cd frontend && npm run test` | rm -rf .next && npm run dev | npm run build && npm run start
   - In another `terminal type`: cd mobile && npx expo start
   - Mobile: `cd mobile && npm run test` | emulator -list-avds && emulator -avd test_avd 
                                          or
                                          emulator -avd test_avd -gpu swiftshader_indirect

 If you see "Unable to connect to adb daemon on port: 5037": adb start-server

### VPS Auth/MFA Deploy Preflight

To keep authentication and MFA working when VPS pulls from GitHub, validate config before deploy:

1. Validate production template in CI/local:
   ```bash
   cd backend
   ./preflight_auth_env.sh .env.production.example --template
   ```
2. Validate real VPS env file before restart:
   ```bash
   cd /path/to/repo/backend
   ./preflight_auth_env.sh /path/to/production.env
   ```
3. Required auth keys must be present: `PORT`, `BACKEND_URL`, `FRONTEND_URL`, `JWT_SECRET`, `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `SMTP_HOST`, `SMTP_PORT`, `EMAIL_USER`, `EMAIL_PASS`, `SMTP_FROM`.
4. Run focused auth tests before deploy:
   ```bash
   cd backend
   go test ./internal/services ./internal/api/middleware ./internal/api/routes
   ```

