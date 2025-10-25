#!/usr/bin/env bash
set -euo pipefail

# === Domeo MVP bootstrap v2 (safer heredocs) ===
APP_NAME="domeo"
NODE_VERSION="20"
POSTGRES_VERSION="16"
DB_NAME="domeo"
DB_USER="domeo"
DB_PASSWORD="domeo"
DB_PORT="5432"

mkdir -p "$APP_NAME"/{app,components,lib,prisma,public,styles,docs}

# package.json
cat > "$APP_NAME/package.json" <<'JSON'
{
  "name": "domeo",
  "private": true,
  "version": "0.1.0",
  "scripts": {
    "dev": "next dev -p 3000",
    "build": "next build",
    "start": "next start -p 3000",
    "lint": "next lint",
    "prisma:generate": "prisma generate",
    "prisma:migrate": "prisma migrate dev --name init",
    "db:push": "prisma db push",
    "postinstall": "prisma generate"
  },
  "dependencies": {
    "@prisma/client": "^5.18.0",
    "next": "14.2.5",
    "react": "18.3.1",
    "react-dom": "18.3.1",
    "zod": "^3.23.8",
    "next-themes": "^0.2.1",
    "lucide-react": "^0.452.0",
    "jsonwebtoken": "^9.0.2",
    "bcryptjs": "^2.4.3"
  },
  "devDependencies": {
    "@types/bcryptjs": "^2.4.2",
    "@types/jsonwebtoken": "^9.0.6",
    "@types/node": "20.14.10",
    "@types/react": "18.3.3",
    "@types/react-dom": "18.3.0",
    "autoprefixer": "10.4.19",
    "eslint": "8.57.0",
    "eslint-config-next": "14.2.5",
    "postcss": "8.4.39",
    "prisma": "^5.18.0",
    "tailwindcss": "3.4.10",
    "typescript": "5.5.4"
  }
}
JSON

# next.config
cat > "$APP_NAME/next.config.mjs" <<'JS'
/** @type {import('next').NextConfig} */
const nextConfig = { reactStrictMode: true };
export default nextConfig;
JS

# tsconfig
cat > "$APP_NAME/tsconfig.json" <<'JSON'
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "es2022"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "baseUrl": ".",
    "paths": { "@/*": ["./*"] }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx"],
  "exclude": ["node_modules"]
}
JSON

# Tailwind
cat > "$APP_NAME/tailwind.config.ts" <<'TS'
import type { Config } from 'tailwindcss'
const config: Config = {
  darkMode: ['class'],
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: { extend: {} },
  plugins: []
}
export default config
TS

cat > "$APP_NAME/postcss.config.js" <<'JS'
module.exports = { plugins: { tailwindcss: {}, autoprefixer: {} } }
JS

cat > "$APP_NAME/styles/globals.css" <<'CSS'
@tailwind base;
@tailwind components;
@tailwind utilities;

:root { --radius: 12px }
CSS

# env
cat > "$APP_NAME/.env.example" <<ENV
DATABASE_URL="postgresql://$DB_USER:$DB_PASSWORD@localhost:$DB_PORT/$DB_NAME?schema=public"
JWT_SECRET="change_me"
ADMIN_EMAIL="admin@domeo.local"
ADMIN_PASSWORD="admin123"
ENV

# Prisma schema
cat > "$APP_NAME/prisma/schema.prisma" <<'PRISMA'
generator client { provider = "prisma-client-js" }

datasource db { provider = "postgresql"; url = env("DATABASE_URL") }

model User {
  id        String   @id @default(cuid())
  email     String   @unique
  password  String
  role      Role     @default(ADMIN)
  createdAt DateTime @default(now())
}

enum Role { ADMIN EDITOR }

model Category {
  id        String   @id @default(cuid())
  slug      String   @unique
  title     String
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
  calculators Calculator[]
}

model Calculator {
  id          String   @id @default(cuid())
  categoryId  String
  title       String
  schemaJson  Json
  rulesJson   Json
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  Category    Category @relation(fields: [categoryId], references: [id])
}

model Product {
  id          String   @id @default(cuid())
  categoryId  String
  sku         String   @unique
  title       String
  basePrice   Decimal  @db.Numeric(12,2)
  propsJson   Json
  images      Image[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
  Category    Category @relation(fields: [categoryId], references: [id])
}

model Image {
  id        String   @id @default(cuid())
  productId String
  url       String
  alt       String?
  Product   Product  @relation(fields: [productId], references: [id])
}

model PriceRule {
  id           String   @id @default(cuid())
  calculatorId String
  name         String
  ruleJson     Json
  active       Boolean  @default(true)
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
  Calculator   Calculator @relation(fields: [calculatorId], references: [id])
}

model Quote {
  id           String   @id @default(cuid())
  calculatorId String
  itemsJson    Json
  total        Decimal  @db.Numeric(12,2)
  metaJson     Json
  createdAt    DateTime @default(now())
  Calculator   Calculator @relation(fields: [calculatorId], references: [id])
}
PRISMA

# DB client
cat > "$APP_NAME/lib/db.ts" <<'TS'
import { PrismaClient } from '@prisma/client'
const globalForPrisma = global as unknown as { prisma: PrismaClient }
export const prisma = globalForPrisma.prisma || new PrismaClient()
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma
TS

# Auth helpers
cat > "$APP_NAME/lib/auth.ts" <<'TS'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { prisma } from './db'

const JWT_SECRET = process.env.JWT_SECRET || 'dev_secret'

export async function seedAdmin() {
  const email = process.env.ADMIN_EMAIL || 'admin@domeo.local'
  const password = process.env.ADMIN_PASSWORD || 'admin123'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (!existing) {
    const hash = await bcrypt.hash(password, 10)
    await prisma.user.create({ data: { email, password: hash, role: 'ADMIN' } })
    console.log(`[seed] Admin created: ${email}`)
  }
}

export async function login(email: string, password: string) {
  const user = await prisma.user.findUnique({ where: { email } })
  if (!user) return null
  const ok = await bcrypt.compare(password, user.password)
  if (!ok) return null
  const token = jwt.sign({ uid: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' })
  return token
}

export function verify(token?: string) {
  try { return jwt.verify(token || '', JWT_SECRET) as any } catch { return null }
}
TS

# App router
cat > "$APP_NAME/app/layout.tsx" <<'TSX'
import './globals.css'
import React from 'react'
export const metadata = { title: 'Domeo', description: 'No‑Code Calculators MVP' }
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru"><body className="min-h-screen bg-neutral-50 text-neutral-900">{children}</body></html>
  )
}
TSX

cat > "$APP_NAME/app/page.tsx" <<'TSX'
export default function Home() {
  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-3xl font-bold">Domeo — No‑Code Calculators</h1>
      <p className="mt-2 text-neutral-600">MVP запущен. Перейдите в <a className="text-blue-600 underline" href="/admin">админку</a> для настройки категорий и правил.</p>
    </main>
  )
}
TSX

mkdir -p "$APP_NAME/app/admin"
cat > "$APP_NAME/app/admin/page.tsx" <<'TSX'
'use client'
import { useEffect, useState } from 'react'

type Category = { id: string; slug: string; title: string }

enum View { Login, Dashboard }

export default function AdminPage() {
  const [token, setToken] = useState<string | null>(null)
  const [email, setEmail] = useState('admin@domeo.local')
  const [password, setPassword] = useState('admin123')
  const [view, setView] = useState<View>(View.Login)
  const [cats, setCats] = useState<Category[]>([])
  const [form, setForm] = useState({ slug: 'doors', title: 'Двери' })

  useEffect(() => {
    const t = localStorage.getItem('jwt')
    if (t) { setToken(t); setView(View.Dashboard); fetchCats(t) }
  }, [])

  async function fetchCats(t: string) {
    const res = await fetch('/api/categories', { headers: { Authorization: `Bearer ${t}` } })
    if (res.ok) setCats(await res.json())
  }

  async function doLogin() {
    const res = await fetch('/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email, password }) })
    if (res.ok) {
      const { token } = await res.json(); localStorage.setItem('jwt', token); setToken(token); setView(View.Dashboard); fetchCats(token)
    }
  }

  async function createCat() {
    const res = await fetch('/api/categories', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(form) })
    if (res.ok) { setForm({ slug: '', title: '' }); fetchCats(token!) }
  }

  if (view === View.Login) return (
    <main className="mx-auto max-w-sm p-8">
      <h1 className="text-2xl font-semibold">Вход в админку</h1>
      <div className="mt-4 space-y-3">
        <input className="w-full rounded-xl border p-2" value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email"/>
        <input className="w-full rounded-xl border p-2" value={password} onChange={e=>setPassword(e.target.value)} placeholder="Пароль" type="password"/>
        <button onClick={doLogin} className="w-full rounded-2xl bg-black px-4 py-2 text-white">Войти</button>
      </div>
    </main>
  )

  return (
    <main className="mx-auto max-w-3xl p-8">
      <h1 className="text-2xl font-semibold">Админка</h1>
      <section className="mt-6 rounded-2xl border bg-white p-4">
        <h2 className="text-lg font-medium">Категории</h2>
        <div className="mt-3 flex gap-2">
          <input className="rounded-xl border p-2" placeholder="slug" value={form.slug} onChange={e=>setForm(f=>({ ...f, slug: e.target.value }))}/>
          <input className="rounded-xl border p-2" placeholder="Название" value={form.title} onChange={e=>setForm(f=>({ ...f, title: e.target.value }))}/>
          <button onClick={createCat} className="rounded-2xl bg-black px-4 py-2 text-white">Добавить</button>
        </div>
        <ul className="mt-4 space-y-2">
          {cats.map(c => <li key={c.id} className="rounded-xl border p-2">{c.slug} — {c.title}</li>)}
        </ul>
      </section>
    </main>
  )
}
TSX

# API routes
mkdir -p "$APP_NAME/app/api/auth/login" "$APP_NAME/app/api/categories"
cat > "$APP_NAME/app/api/auth/login/route.ts" <<'TS'
import { NextRequest, NextResponse } from 'next/server'
import { login, seedAdmin } from '@/lib/auth'

export async function POST(req: NextRequest) {
  const { email, password } = await req.json()
  await seedAdmin()
  const token = await login(email, password)
  if (!token) return NextResponse.json({ error: 'invalid' }, { status: 401 })
  return NextResponse.json({ token })
}
TS

cat > "$APP_NAME/app/api/categories/route.ts" <<'TS'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verify } from '@/lib/auth'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  if (!verify(token)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const categories = await prisma.category.findMany({ orderBy: { createdAt: 'desc' } })
  return NextResponse.json(categories)
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization') || ''
  const token = auth.replace('Bearer ', '')
  if (!verify(token)) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })
  const { slug, title } = await req.json()
  const cat = await prisma.category.create({ data: { slug, title } })
  return NextResponse.json(cat)
}
TS

# Dockerfile
cat > "$APP_NAME/Dockerfile" <<'DOCKER'
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./ 2>/dev/null || true
RUN npm i --legacy-peer-deps

FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app .
EXPOSE 3000
CMD ["npm","run","start"]
DOCKER

# docker-compose
cat > "$APP_NAME/docker-compose.yml" <<'YML'
version: '3.9'
services:
  db:
    image: postgres:16
    restart: unless-stopped
    environment:
      POSTGRES_DB: domeo
      POSTGRES_USER: domeo
      POSTGRES_PASSWORD: domeo
    ports:
      - "5432:5432"
    volumes:
      - db_data:/var/lib/postgresql/data
  adminer:
    image: adminer:4
    restart: unless-stopped
    ports:
      - "8080:8080"
volumes:
  db_data:
YML

# README
cat > "$APP_NAME/README.md" <<'MD'
# Domeo — No‑Code Calculators (MVP)

Быстрый старт:
```bash
bash bootstrap.sh
cd domeo
cp .env.example .env
docker compose up -d db
npm i
npx prisma migrate dev --name init
npm run dev
```
MD

# docs
cat > "$APP_NAME/docs/STATE.md" <<'MD'
# STATE
- init: каркас MVP создан
MD

cat > "$APP_NAME/docs/ROADMAP.md" <<'MD'
# ROADMAP (MVP → Doors)
- [x] Каркас проекта
- [ ] CRUD калькуляторов
MD

cat > "$APP_NAME/docs/ADMIN_GUIDE.md" <<'MD'
# ADMIN GUIDE (черновик)
1) /admin → создать категорию
2) задать schemaJson, rulesJson
MD

# gitignore
cat > "$APP_NAME/.gitignore" <<'GIT'
node_modules
.next
.env
.DS_Store
GIT

# Done message
echo "✅ Bootstrap complete. Next: cd $APP_NAME && cp .env.example .env && docker compose up -d db && npm i && npx prisma migrate dev && npm run dev"
