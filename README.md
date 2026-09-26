# AlSafwa Medical Group - Invoice Management System
## (الصفوة ميديكال جروب - نظام إدارة الفواتير)

Production-ready Cloud Invoice & Sales Management System built with React, Vite, Tailwind CSS, React Router, Supabase PostgreSQL, and Supabase Auth. Prepared for Vercel deployment.

---

## 🌟 Key Architecture & Stack

* **Frontend Framework**: React 18 + TypeScript + Vite
* **Styling**: Tailwind CSS (Minimal, professional, sky blue accent palette, RTL ready)
* **Icons & UI**: Lucide React
* **Cloud Database**: Supabase PostgreSQL
* **Authentication**: Supabase Auth (JWT session persistence, protected routes)
* **Deployment Target**: Vercel SPA (`vercel.json` rewrite configuration)

---

## 🗄️ Database Architecture & Tables

The system uses 5 normalized Cloud PostgreSQL tables with foreign key constraints, indexes, triggers, and Row Level Security (RLS) policies:

1. `profiles`
   - Linked to `auth.users(id)` via automatic PostgreSQL signup trigger
   - Stores `full_name`, `email`, `role` (`admin`, `manager`, `staff`)
2. `products`
   - Stores `product_code` (unique), `name`, `category`, and numeric `price`
3. `customers`
   - Stores hospital and client details (`name`, `phone`, `email`, `address`)
4. `invoices`
   - Stores header info: `invoice_number` (`INV-000001` format via PostgreSQL sequence), `customer_name_snapshot`, `subtotal`, `discount_percentage`, `discount_amount`, `final_total`, `created_by`
5. `invoice_items`
   - Stores immutable item snapshots: `product_name_snapshot`, `quantity`, `unit_price`, `total`
   - *Snapshot Principle*: Old invoices retain original product names and prices even if catalog prices change later.

---

## ⚡ Quick Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Set Up Supabase Database
1. Go to your [Supabase Dashboard](https://supabase.com/dashboard) and create a new project.
2. In the left navigation, open the **SQL Editor**.
3. Copy the contents of [`supabase/schema.sql`](file:///f:/Safwa/supabase/schema.sql) and paste into the editor.
4. Click **Run** to execute the script. This creates all 5 tables, the `INV-000001` sequence generator, triggers, RLS policies, indexes, and initial sample data.

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```



### 4. Run Development Server
```bash
npm run dev
```

---

## 🚀 Vercel Deployment

1. Push your repository to GitHub or GitLab.
2. Import the project into Vercel.
3. Set the Environment Variables in Vercel project settings (`VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
4. Vercel will automatically detect Vite and use `vercel.json` for SPA routing (prevents 404 on page refresh).

---

## 📂 Project Structure Overview

```
src/
├── assets/         # Dynamic brand assets & icons
├── components/
│   ├── auth/       # ProtectedRoute component
│   ├── common/     # Button, Card, Input, Badge, LoadingSpinner, SupabaseNotice
│   └── layout/     # Header, Sidebar, MobileNav, MainLayout
├── context/
│   ├── AuthContext.tsx       # Auth session & Supabase state
│   └── LanguageContext.tsx   # RTL / English / Arabic switcher
├── hooks/          # useAuth, useLanguage
├── lib/
│   ├── database.types.ts     # TypeScript schema interfaces
│   └── supabase.ts           # Supabase client singleton
├── services/       # Database API layer
│   ├── authService.ts
│   ├── productsService.ts
│   ├── customersService.ts
│   ├── invoicesService.ts
│   └── profilesService.ts
├── pages/          # Login, Dashboard, Invoices, CreateInvoice, Customers, Products, StockOrder, Settings
├── utils/          # Currency formatters (EGP), Date formatters, Constants
├── App.tsx         # React Router setup
├── index.css       # Global styles & typography
└── main.tsx        # React root render
```
