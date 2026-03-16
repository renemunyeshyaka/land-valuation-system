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

# Start backend (terminal 1)
cd backend && go build -o api cmd/api/main.go && ./api

# Start frontend (terminal 2)  
cd frontend && npm install && npm run dev

# Test everything (terminal 3)
./test-auth-debug.sh
```

**Expected:** All ✅ checkmarks = you're good to go!

---

## ✨ What's Working Right Now

| Component | Status | Details |
|-----------|--------|---------|
| Backend API | ✅ Working | Port 5000, all endpoints tested |
| Authentication | ✅ 100% | User must be registered to search |
| Referral System | ✅ Working | Unique 8-char codes, crypto/rand |
| Payment Framework | ✅ Ready | MTN + Airtel integrated (credentials pending) |
| Database | ✅ Operational | PostgreSQL with all migrations |
| Frontend | 🔄 40% | Needs auth UI + payment form |
| Deployment | 🔴 TBD | Scheduled for Week 4 |


---


## 🗓️ Detailed Schedule Plan: Remaining Key Tasks

| Task | Description | Owner | Target Completion |
|------|-------------|-------|------------------|
| **Frontend Auth UI** | Complete user registration, login, and verification flows | Solo Dev | Mar 14 |
| **Payment Form & Integration** | Finalize payment UI, connect to MTN/Airtel APIs | Solo Dev | Mar 15 |
| **Property Listing Management** | Polish Add Property form, dashboard listing management | Solo Dev | Mar 16 |
| **Price Estimation UI** | Refine UPI-based price estimation flow for users | Solo Dev | Mar 17 |
| **Testing & Bug Fixes** | End-to-end tests, fix critical bugs (backend & frontend) | Solo Dev | Mar 18-19 |
| **Documentation Polish** | Finalize README, user guides, API docs | Solo Dev | Mar 19 |
| **Deployment Automation** | Docker, CI/CD, production deploy scripts | Solo Dev | Mar 20 |
| **Launch & Monitoring** | Go live, monitor logs, user feedback | Solo Dev | Apr 13 |

**Notes:**
- Adjust dates as needed based on progress and blockers.
- Prioritize user registration, payment, and price estimation for MVP.
- Revenue features (subscriptions, ad boosts, invoices) can be staged after core launch.

---

## Core Products

### 1. Land Price Estimate Search (Dashboard)
- This feature allows authenticated users to search for land price estimates using UPI codes directly from their dashboard.
- It is a critical workflow: users must be able to enter a UPI code and receive an instant, accurate valuation based on official gazette data and market trends.
- **Note:** Registration is enforced before access; only logged-in users can use this feature from the dashboard.
- The estimate search must always be reliable, fast, and accurate.

### 2. Advertising Land/Properties
- Users can list and advertise their land or properties for sale on the platform.
- Listings are visible to buyers, including diaspora and foreign investors.
- The advertising workflow must be seamless, allowing users to upload property details, images, and set pricing.
- Listings should be discoverable and attract high-quality buyers.

**Emphasis:**
> These two features—Land Price Estimate Search (in dashboards) and Advertising Land/Properties—are the foundation of our platform. They must always work perfectly, with a focus on reliability, user experience, and accuracy. All development and QA efforts should prioritize these workflows.

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

In addition to advertising, users have a simple and user-friendly way to estimate the value of their land or property:

- After logging in, navigate to the price estimation or search section (usually accessible from the main dashboard or navigation menu).
- Enter your land's UPI (Unique Parcel Identifier) in the format: x/xx/xx/xx/xxxx (e.g., 1/03/01/04/3000).
- The system will automatically validate the UPI format and extract the relevant administrative codes (province, district, sector, cell, plot).
- Based on the official gazette data and the presence of key amenities (road, electricity, water, school, health facility, market), the platform will instantly calculate and display the estimated price for your land/property.
- The estimation is transparent, showing which conditions are met and how the price is determined (maximum, weighted average, or minimum value per sqm).

This feature empowers users to make informed decisions about their property, whether they are considering selling, buying, or simply want to know the current market value. The process is designed to be intuitive and accessible to all users.

---

### API Endpoint

- **URL:** `/api/v1/estimate-search`
- **Method:** `POST`
- **Request Body:**
   ```json
   {
      "upi": "1/03/01/04/3000"
   }
   ```
- **Response Example:**
   ```json
   {
      "success": true,
      "message": "Estimate search successful",
      "data": {
         "parcel": { /* parcel details */ },
         "considerations": {
            "road": true,
            "electricity": true,
            "water": false,
            "school": true,
            "health_facility": false,
            "market": true
         },
         "price": 11000000,
         "price_type": "Weighted Average Value Per Sqm"
      }
   }
   ```

---

**User Flow:**
- User must be registered and logged in to perform a search.
- User provides a UPI (Unique Parcel Identifier) code in the format: x/xx/xx/xx/xxxx
  - x: Province
  - xx: District
  - xx: Sector
  - xx: Cell
  - xxxx: Plot (4 digits)

**Algorithm Steps:**
1. **Registration Check:** Ensure the user is registered and authenticated. If not, prompt registration/login.
2. **UPI Format Validation:** Check that the UPI matches the required format and codes for Province, District, Sector, Cell, and Plot.
3. **Gazette Pricing Conditions:** For the provided UPI, extract the administrative codes and evaluate the presence/absence of the six pricing conditions:
   - Road access
   - Electricity
   - Water
   - School nearby
   - Health facility nearby
   - Market nearby
4. **Price Calculation:**
   - If all 6 conditions are met, return **Maximum Value Per Sqm**
   - If 3, 4, or 5 conditions are met, return **Weighted Average Value Per Sqm**
   - If 0, 1, or 2 conditions are met, return **Minimum Value Per Sqm**
5. **Response Construction:** Return a response containing:
   - The administrative location details (from UPI)
   - The status of each of the six conditions
   - The calculated price and price type
6. **Error Handling:**
   - If the UPI is missing or has an invalid format, return a clear error message.
   - If the administrative codes do not exist in the gazette_land_prices table, return a not found error.

**Note:** All price lookups are performed using the `gazette_land_prices` table. Parcel lookup and the `collected_upis` table are no longer used. Multi-field search is not supported.
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

