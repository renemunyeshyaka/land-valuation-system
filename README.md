# Land Valuation System (LVS)

[![Go Version](https://img.shields.io/badge/Go-1.21+-00ADD8?style=for-the-badge&logo=go)](https://golang.org)
[![Next.js](https://img.shields.io/badge/Next.js-14-000000?style=for-the-badge&logo=next.js)](https://nextjs.org/)
[![React Native](https://img.shields.io/badge/React%20Native-0.72-61DAFB?style=for-the-badge&logo=react)](https://reactnative.dev/)
[![License](https://img.shields.io/badge/License-Proprietary-red?style=for-the-badge)](LICENSE)

---

## ⚡ 6-Week MVP Acceleration (18 weeks → 6 weeks)

🎯 **Launch Target:** April 13, 2026 | **Status:** Active Sprint

**Key Documents:**
- 📋 [**ACCELERATION_PLAN.md**](ACCELERATION_PLAN.md) — Complete 6-week strategy, team structure, and success criteria
- 📅 [**SPRINT_TASKS.md**](SPRINT_TASKS.md) — Detailed day-by-day task breakdown for all 4 weeks
- ✅ [**DECISIONS.md**](DECISIONS.md) — MVP scope decisions and feature roadmap

**MVP Scope:**
- ✅ Core land valuation engine (Official Gazette coefficients)
- ✅ User authentication + profiles
- ✅ Property search + interactive map
- ✅ Stripe payment integration
- ✅ 2 subscription tiers (Free + Premium)
- ❌ *Deferred:* Mobile app, RDA API, advanced analytics, white-label
- ❌ *Not in scope:* ML predictions, verified badges, all premium features

**Quick Start:**
```bash
./setup-mvp.sh          # Install deps, setup env vars
docker-compose up -d    # Start local development
cd backend && go run cmd/api/main.go
cd frontend && npm run dev
```

**GitHub Actions:** Auto-test on PR, auto-deploy main to Vercel + staging
- Backend tests: `go test ./...`
- Frontend deploy: Automatic via Vercel

---

## 📋 Overview

Land Valuation System (LVS) is a comprehensive platform for accurate land pricing in Rwanda, integrating official gazette data with modern geolocation technology. LVS empowers landowners, diaspora investors, and foreign buyers with reliable valuation, registration services, and a secure marketplace for land transactions.

### 🎯 Key Features

#### Core Platform Features
- **Official Gazette Integration**: Accurate pricing based on Rwanda government location coefficients.
- **Geolocation Mapping**: Interactive maps with parcel boundaries and zoning information.
- **Real-time Valuation**: Dynamic pricing powered by market trends and historical data.
- **Marketplace**: Securely connect verified buyers and sellers, including diaspora and foreign investors.
- **API Integration**: Aggregate listings from multiple marketplace APIs for comprehensive coverage.
- **Registration Services**: Streamlined land registration and title verification.
- **Subscription Tiers**: Free, Basic, Professional, and Ultimate options to fit every user.

#### User Experience & Monetization
- **Mobile App**: Access LVS on-the-go with push notifications and mobile-first features. Monetize via in-app purchases or subscriptions.
- **Localized Payment Options**: Pay using MTN Mobile Money, Airtel Money (QR Code), or direct bank transfer (Equity Bank Account: 4009111291475, SWIFT Code: EQBLRWRWXXX, Bank Name: EQUITY BANK RWANDA PLC). Flexible codes for different transfer requirements.
- **Referral Program**: Earn discounts and free trial extensions by inviting friends. Drives viral growth and rewards word-of-mouth marketing.
- **Freemium Model**: Enjoy a permanently free tier with essential features. Upgrade for advanced templates, analytics, and unlimited CVs.

#### Advanced & Premium Features
- **Premium Analytics & Reports**: Unlock advanced market insights, property trends, and investment forecasts.
- **Verified Listings & Priority Placement**: Sellers can pay for verified status or premium placement in search results.
- **Agent/Agency Profiles**: Real estate agents/agencies can pay for branded profiles and lead generation tools.
- **Document Automation**: Generate legal documents, contracts, or valuation certificates with paid automation tools.
- **Custom Alerts & Watchlists**: Subscribe for instant alerts on new listings, price drops, or market changes.
- **API Access for Partners**: Monetize API usage for third-party apps, agencies, or government integrations.
- **White-label Solutions**: License the platform to other regions or organizations needing similar land valuation systems.
- **Ad Placement**: Enable targeted advertising for related services (banks, insurance, construction, etc.).
- **Loyalty & Rewards Program**: Earn points for repeat usage and referrals, redeemable for discounts or premium features.

### 🏗️ Architecture

- **Backend**: Go — high-performance, scalable APIs
- **Frontend Web**: Next.js & Tailwind CSS — responsive, dynamic UI
- **Mobile**: React Native — cross-platform iOS/Android app
- **Database**: PostgreSQL with PostGIS — robust geospatial data support
- **Cache**: Redis — fast, reliable caching
- **Search**: Elasticsearch — powerful search capabilities
- **Maps**: Mapbox & Google Maps API — interactive mapping

## 🚀 Getting Started

### Prerequisites

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
   - Backend: `cd backend && go test ./... -v`
   - Frontend: `cd frontend && npm run test`
   - Mobile: `cd mobile && npm run test`

