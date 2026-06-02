# OrderFlow — Full Supabase OMS + Storefront

Ολοκληρωμένο full-stack demo project με:

- μοντέρνο React/Vite storefront
- cart και fake checkout
- πραγματική δημιουργία order σε Supabase/Postgres
- inventory deduction
- OMS admin dashboard
- order status flow
- returns/refunds με stock restore
- audit logs/timeline
- analytics charts
- Supabase SQL schema + seed data + RPC functions

## 1. Install

```bash
npm install
```

## 2. Supabase setup

1. Μπες στο Supabase και φτιάξε νέο project.
2. Άνοιξε **SQL Editor**.
3. Κάνε copy όλο το αρχείο:

```bash
supabase/schema.sql
```

4. Πάτησε **Run**.

Αυτό θα δημιουργήσει tables, enum types, seed products και functions:

- `create_checkout_order`
- `update_order_status`
- `request_return`
- `approve_refund`

## 3. Environment variables

Κάνε copy:

```bash
cp .env.example .env.local
```

Βάλε μέσα:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

Τα βρίσκεις στο Supabase: **Project Settings → API**.

## 4. Run locally

```bash
npm run dev
```

Άνοιξε:

```bash
http://localhost:5173
```

## 5. Πώς δουλεύει το fake checkout

Στο Storefront:

1. Add products στο cart.
2. Άνοιξε cart.
3. Πάτα **Pay with fake gateway**.

Δεν γίνεται πραγματική πληρωμή. Το app καλεί Supabase RPC `create_checkout_order`, που:

- δημιουργεί customer
- δημιουργεί order
- δημιουργεί order_items
- μειώνει product stock
- γράφει audit logs
- επιστρέφει order id

## 6. OMS Admin

Στο tab **OMS Admin** βλέπεις:

- revenue
- orders
- products
- low stock
- sales chart
- inventory chart
- orders table
- status dropdown
- return request
- approve refund
- audit stream
- order detail drawer

## 7. Portfolio pitch

> Built a full-stack commerce operations platform with a custom storefront, fake checkout, Supabase/Postgres order persistence, inventory deduction, returns/refunds, audit logs and an OMS admin dashboard.

## 8. Deployment

Για Vercel/Netlify:

1. Push στο GitHub.
2. Import project.
3. Πρόσθεσε τα ίδια environment variables.
4. Deploy.



## Storefront upgrade
This version includes a more realistic e-commerce storefront: hero section, promo strip, categories, search, sorting, product details modal, cart drawer, multi-step fake checkout, and Supabase-backed order creation.
