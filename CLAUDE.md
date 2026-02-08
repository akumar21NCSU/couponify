# Couponify - Shopify App

## Project Overview
Shopify app that allows merchants to create coupons/discount codes for customer use. Built with Remix, Prisma, Polaris, and Shopify Functions.

## Tech Stack
- **Framework**: Remix + TypeScript
- **UI**: Shopify Polaris + App Bridge
- **Database**: SQLite (dev) / PostgreSQL (prod) via Prisma ORM
- **Discount Logic**: Shopify Functions (Wasm)
- **APIs**: Shopify GraphQL Admin API

## Node.js Requirement
This project requires Node.js >=20.19 <22 || >=22.12. Use nvm to switch:
```
export NVM_DIR="$HOME/.nvm" && [ -s "$NVM_DIR/nvm.sh" ] && . "$NVM_DIR/nvm.sh" && nvm use 22.13.0
```
