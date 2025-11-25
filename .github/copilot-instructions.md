# Copilot Instructions for my-pet-drive

## Project Overview
**my-pet-drive** is a pet transportation booking platform with three primary flows:
1. **Clients** create orders for pet transport via the frontend
2. **Drivers** bid on orders and submit responses
3. **Backend** orchestrates SheetDB (Google Sheets API) as the database and Telegram for real-time notifications

**Architecture**: Monorepo with separate frontend (Vite + vanilla JS) and backend (Express + TypeScript).

---

## Key Data Flow & Critical Patterns

### Order Lifecycle & Status Management
Orders have explicit states managed in SheetDB's `status` field:
- `ОЖИДАНИЕ_ОТКЛИКОВ` (awaiting responses) → drivers can submit bids
- `ОЖИДАНИЕ_ОПЛАТЫ` (awaiting payment) → order locked, driver selected
- `ОПЛАЧЕН` (paid) → completed
- `ОТМЕНА` (cancelled) → no further bids allowed

**Critical**: Validate order status before accepting driver responses in `frontend/src/scripts/order.js` (see `validateOrderStatus()`). Blocked statuses raise alerts without backend calls.

### Data Storage (SheetDB)
- **Single source of truth**: Google Sheets via SheetDB REST API (`SHEETDB_URL` env var)
- **Order fields** (examples): `order_code`, `status`, `driver_cost`, `total_cost`, `driver_responses` (JSON array), `client_name`, `telegram_id`, etc.
- **API pattern**: `/search?order_code=X` for queries; `PATCH order_code/X` for updates; `POST` to create
- **Error handling**: All SheetDB calls wrap errors with context (status + response text) in `backend/src/services/sheetdb.ts`

### Telegram Integration (Real-time Notifications)
Three chat recipients (env vars: `BOT_TOKEN`, `DRIVERS_CHAT`, `ADMIN_CHAT`):
- **Client**: Receives order confirmation with `/route?rowNum-orderCode` link
- **Drivers**: Receive new orders with callback button; receive "+1 response" summaries
- **Admin**: Receives detailed logs with financial breakdowns

**Key calculation in `notifyDriverResponse()`**: Commission is 21% on driver bid:
```js
cost_with_com = Math.round(bid * 1.21)  // Sent to client in notification
```

---

## Developer Workflows

### Running Services
```bash
# Backend (debug mode on port 9229, server on port 3000)
cd backend && npm run dev

# Frontend (Vite dev server on port 7772)
cd frontend && npm run dev
```

**Important**: Backend must run for frontend API calls (`/api/*`) to work. The backend task runs with `nodemon --inspect=9229` for debugging.

### Build & Lint
```bash
# Both packages use Biome for linting/formatting
backend: npm run lint        # --unsafe flag allows unsafe fixes
backend: npm run build       # TypeScript → CommonJS in dist/
frontend: npm run lint
frontend: npm run build      # Vite bundle output
```

---

## Project-Specific Patterns

### TypeScript + CommonJS Backend
- **Config**: `tsconfig.json` targets ES5, CommonJS modules (not ESNext)
- **Services pattern**: `backend/src/services/` are pure utility modules (SheetDB, Telegram) with no Express dependencies—easy to test
- **Routes pattern**: `backend/src/routes/` are Express routers that delegate to services

### Frontend: URL-Based Navigation
- **Order link format**: `/order?rowNum-orderCode` (used in Telegram messages)
- **Route link format**: `/route?rowNum-orderCode` (for driver bid confirmation)
- **Parsing in order.js**: `location.search.replace("?", "").split("-")` extracts rowNum and orderCode
- **Auto-fill feature**: `tryFillDriverFields()` searches all orders for the driver's Telegram ID to repopulate form fields from prior responses

### Commission & Financial Logic
- **Frontend responsibility**: Calculate and store `cost_with_com` when driver submits bid (`order.js`)
- **Backend responsibility**: Include `cost_with_com` in both client and admin Telegram notifications
- **Currency**: All amounts in ₽ (rubles); no currency conversion needed

### Environment Variables (Required)
- `SHEETDB_URL`: SheetDB REST endpoint for the orders spreadsheet
- `BOT_TOKEN`: Telegram bot token
- `DRIVERS_CHAT`, `ADMIN_CHAT`: Telegram chat IDs (fallback to order fields if not set)
- `PORT`: Server port (default 3000)

---

## Code Standards & Tools

### Code Quality
- **Linter/Formatter**: Biome (version 2.3.7) — run `npm run lint` before commits
- **JavaScript style**: Double quotes (Biome config enforced), HTML parse mode for Telegram messages
- **Error logging**: Console logs with status emoji (✓, ✗) for visibility; always log to console AND return JSON errors to client

### Testing & Debugging
- **Backend debugging**: Attach debugger to port 9229 (VS Code launch config or Chrome DevTools)
- **Frontend debugging**: Browser DevTools; check `/api/*` calls in Network tab for backend response status
- **Common issues**:
  - SheetDB returns empty array → order not found (check order_code spelling)
  - Telegram notification fails silently → validate BOT_TOKEN and chat IDs exist

---

## File Organization

```
backend/src/
├── app.ts                    # Express setup, middleware, route imports
├── routes/
│   ├── orders.ts            # POST/GET/PATCH /api/orders* — order CRUD
│   ├── payment.ts           # POST /api/payment-link — Robokassa signature
│   └── telegram.ts          # POST /api/telegram — driver response notifications
└── services/
    ├── sheetdb.ts           # SheetDB fetch wrapper, all CRUD operations
    └── telegram.ts          # Telegram message composition & sending

frontend/src/
├── scripts/
│   ├── order.js             # Driver bid form, order status validation, auto-fill
│   ├── drive.js             # Client order creation (not detailed in analysis)
│   └── route.js             # Order confirmation UI (not detailed in analysis)
└── styles/
    └── *.css                # Linked in HTML files
```

---

## When Adding Features

1. **New order fields?** Update SheetDB schema (Google Sheet columns), then add fetch logic in `sheetdb.ts`
2. **New Telegram notification type?** Add function in `backend/src/services/telegram.ts`, export, and call from appropriate route
3. **New API endpoint?** Create route in `backend/src/routes/`, import in `app.ts`, follow `/api/*` naming pattern
4. **Frontend UI changes?** Modify corresponding `.html` and `.js` in `frontend/src/` (this is vanilla JS, not a framework)
5. **Business rule changes (status, commission)?** Search for hardcoded values and comments (e.g., "21%", "ОЖИДАНИЕ_ОТКЛИКОВ") to find all affected sites

---

## Notes for AI Agents

- **No abstraction over-engineering**: This codebase intentionally uses direct HTTP calls and console logging for simplicity
- **Cyrillic strings are intentional**: UI and status names in Russian—preserve them exactly
- **Robokassa integration** (payment.ts) is currently minimal; payment verification webhook is not implemented
- **Row number fetching disabled**: `findOrderRowNumber()` is coded but commented out; SheetDB row API returns null consistently
- **Frontend is HTML+JS**: No build step for frontend JS—changes in `drive.js`, `order.js`, `route.js` are immediately reflected after browser refresh (Vite in dev mode)
