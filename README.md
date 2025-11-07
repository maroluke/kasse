# Kasse Monorepo

Monorepo for Android POS built with Capacitor (Android) + React/TypeScript, native Kotlin plugins, and Supabase backend.

## Workspaces

- apps/pos: Capacitor Android app (React + Zustand + Tailwind)
- apps/admin: Next.js admin + KDS
- packages/core: Shared types, pricing math, receipt renderer
- supabase: SQL migrations + RLS

## Prerequisites

- Node 18+
- Yarn Classic (1.x)
- Java 17, Android SDK for Android build
- Supabase CLI

## Quick start

Install deps:

```bash
yarn install
```

Dev servers:

```bash
yarn dev:pos
yarn dev:admin
```

Android studio:

```bash
yarn android:open
```

Run tests:

```bash
yarn test
```

Migrations:

```bash
yarn db:migrate
```

## Env

Copy `.env.example` to `.env` and fill in Supabase creds.

## Structure

See individual app READMEs for more.
