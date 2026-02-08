# Couponify - Shopify App

## Project Overview
Shopify app that allows merchants to create coupons/discount codes for customer use. Built with Remix, Prisma, Polaris, and Shopify Functions.

## Tech Stack & Versions
- **Framework**: Remix 2.16.1 + TypeScript 5.2
- **UI**: Shopify Polaris 12.x + App Bridge React 4.x
- **Database**: SQLite (dev) / PostgreSQL (prod) via Prisma 6.x
- **Discount Logic**: Shopify Functions (Wasm) — in `extensions/`
- **APIs**: Shopify GraphQL Admin API (v2025-01)
- **Build**: Vite 6.x
- **Runtime**: Node.js >=22.12 (use nvm 22.13.0)

## Node.js Requirement
```
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22.13.0
```

## Build / Dev / Lint Commands
- `npm run dev` — start dev server (runs `shopify app dev` with Cloudflare tunnel)
- `npm run build` — production build (`remix vite:build`)
- `npm run start` — serve production build (`remix-serve`)
- `npm run lint` — ESLint with cache
- `npm run setup` — generate Prisma client + apply migrations

## Database Conventions
- Schema: `prisma/schema.prisma`
- Migrations: `prisma/migrations/`
- After schema changes: `npx prisma generate && npx prisma migrate dev --name <description>`
- All queries via Prisma client (`app/db.server.ts`) — no raw SQL
- Data is shop-scoped: always filter by `shop` field to isolate merchant data
- Coupon codes are unique per shop: `@@unique([shop, code])`
- CouponUsage cascades on delete with parent Coupon

## API Patterns
- Auth: every loader/action calls `authenticate.admin(request)` from `app/shopify.server.ts`
- GraphQL: use `admin.graphql()` from the auth result — handles tokens automatically
- Scopes: `write_discounts, read_discounts, read_products, read_customers` (in `shopify.app.toml`)
- Always check `userErrors` in GraphQL mutation responses

## File Structure
```
app/
  db.server.ts          — Prisma client singleton
  shopify.server.ts     — Shopify app config (auth, API version, scopes)
  root.tsx              — Root layout
  routes/
    app.tsx             — App shell (Polaris provider, NavMenu, AppBridge)
    app._index.tsx      — Main dashboard page
    app.*.tsx            — Additional admin pages (nested under app layout)
    auth.$.tsx          — OAuth catch-all handler
    auth.login/         — Login page
    webhooks.*.tsx      — Webhook handlers
extensions/             — Shopify Function extensions (discount logic)
prisma/
  schema.prisma         — Database schema
  migrations/           — Migration history
```

## Known Gotchas
- Node version: must be >=22.12, use nvm (v22.2.0 will fail `npm install`)
- Prisma: schema changes need BOTH `prisma generate` AND `prisma migrate dev`
- Shopify CLI interactive prompts: use `--flavor`, `--template` flags in non-interactive envs
- GitHub push: `.github/workflows/` files require `workflow` scope on OAuth tokens
- SQLite: fine for dev/single-instance, switch to PostgreSQL for production
