# AI Coding Agent Instructions

## Project Overview

**My Pet Drive** is a pet transportation booking platform with:
- **Backend**: Express.js + TypeScript API that manages orders and integrates external services
- **Frontend**: Vanilla JS + Vite SPA with multi-step order form
- **Data Flow**: Frontend → Backend → SheetDB (spreadsheet DB) + Telegram notifications + Robokassa payments

## Architecture & Key Components

### Backend (`/backend/src/`)

**Express server** with three main concerns:
- **`app.ts`**: Server setup with CORS and JSON middleware, routes registration
- **`routes/orders.ts`**: Main order creation endpoint (`POST /api/create-order`)
  - Accepts order payload from frontend
  - Persists to SheetDB via `createSheetOrder()`
  - Sends multi-recipient Telegram notifications via `notifyAll()`
- **`routes/payment.ts`**: Robokassa payment link generation (MD5 signature auth)
- **`services/telegram.ts`**: Sends HTML-formatted messages to three recipients: client, drivers, admin
- **`services/sheetdb.ts`**: Wraps SheetDB API (POST for create, GET for search)

**Critical**: Order payload is **NOT validated/sanitized** on backend (TODO: prevent client price manipulation).

### Frontend (`/frontend/src/scripts/drive.js`)

**Single-page multi-step order form**:
1. **Step 1**: Route calculation (geolocation → Nominatim geocoding → Haversine distance)
2. **Step 2**: Pet & trip details (animal type, weight, date, phone)
3. **Step 3**: Tariff selection (eco/opti/maxi) with availability logic
4. **Step 4**: Order summary & review
5. **Step 5**: Success screen with 5-second redirect

**Key patterns**:
- Global `routeData`, `userData`, `selectedTariff` state variables
- All payment logic is **client-side**: costs calculated in JS (acquiring + service fees)
- Tariff availability depends on trip date (see `checkTariffAvailability()`)
- Phone input uses custom mask function (Russian format: +7 (XXX) XXX-XX-XX)

## Development Workflow

### Commands

**Backend**:
```bash
cd backend
npm run dev          # nodemon with ts-node (watches src/, runs on 3000 by default)
npm run build        # TypeScript compilation to dist/
npm run lint         # Biome formatter/linter with --unsafe flag
```

**Frontend**:
```bash
cd frontend
npm run dev          # Vite dev server on port 7772, proxies /api to backend
npm run build        # Vite production build
npm run lint         # Biome formatter/linter
```

### Environment Variables

**Backend** (`.env`):
- `PORT` (default 3000)
- `SHEETDB_URL` - SheetDB endpoint for order persistence
- `BOT_TOKEN` - Telegram bot token
- `DRIVERS_CHAT`, `ADMIN_CHAT` - Telegram chat IDs for notifications
- `ROBOKASSA_LOGIN`, `ROBOKASSA_PASS1` - Payment processor credentials

**Frontend** (proxy in `vite.config.js`):
- Backend API available at `/api` (proxied to http://localhost:3000)

## Code Patterns & Conventions

### Biome (Linter/Formatter)
- Both frontend & backend use **Biome 2.3.7** with git integration
- Run `npm run lint` in either directory (applies unsafe fixes automatically)
- Double quotes for strings, 2-space indent

### TypeScript (Backend Only)
- Target: ES5, Module: CommonJS (specified in `tsconfig.json`)
- `strict: true` - strict null checks enabled
- All external functions use `any` type (loose typing for external APIs)

### Frontend State Management
- **No frameworks** - vanilla JS with global variables
- HTML has inline `onclick` handlers wired to window-scoped functions
- CSS classes toggle visibility (`.hidden`, `.active`, `.disabled`, `.selected`)

### API Contracts

**`POST /api/create-order`** - Order creation
- Input: Full order object (from frontend)
- Output: `{ success: true, order_code, row_number }`
- Side effects: SheetDB write + 3 Telegram notifications

**`POST /api/payment-link`** - Robokassa payment
- Input: `{ amount, orderId }`
- Output: `{ url }` - direct to Robokassa merchant page

### Cost Calculation Logic
- **Base cost** = distance_km × price_per_km (eco: 75, opti: 105, maxi: 150)
- **Below 800₽**: Fixed 800₽ minimum (includes acquiring/service fees)
- **800₽+**: Add 10.5% acquiring + 10.5% service fee
- **Driver gets**: Base cost (no fee deduction)

## Critical Files to Know

| File | Purpose |
|------|---------|
| `backend/src/app.ts` | Server bootstrap & middleware |
| `backend/src/routes/orders.ts` | Order creation logic & flow |
| `backend/src/services/telegram.ts` | Multi-recipient notifications (see message formatting) |
| `frontend/src/scripts/drive.js` | All frontend logic (~800 lines) |
| `frontend/vite.config.js` | Dev proxy config & build setup |

## Known Issues & TODOs

- **Order validation**: No price validation on backend (client can manipulate costs)
- **Row number**: `findOrderRowNumber()` always returns null (SheetDB limitation?)
- **Tariff availability**: Hard-coded logic based on trip date (see `checkTariffAvailability()`)

## Integration Points

1. **SheetDB**: Spreadsheet-based data store (SHEETDB_URL env var)
2. **Telegram Bot**: Three separate chat notifications (client, drivers, admin)
3. **Nominatim API**: Free geolocation/reverse-geocoding (OpenStreetMap)
4. **Robokassa**: Payment processor (Russian-only, MD5 signature required)

## Debugging Tips

- Backend: Enable `--inspect=9229` in `nodemon.json` for Chrome DevTools debugging
- Frontend: Vite dev server at http://localhost:7772 with hot reload
- API calls: Check browser console & backend logs for `/api/create-order` flow
- Telegram: Verify BOT_TOKEN and chat IDs are set (warnings logged if missing)
