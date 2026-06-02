# OrderFlow Commerce OS

A modern full-stack eCommerce Storefront and Order Management System (OMS) built with React, TypeScript and Supabase.

OrderFlow combines a customer-facing storefront with a professional operations dashboard inspired by modern commerce platforms such as Shopify and Salesforce Commerce Cloud.

---

## Live Demo

Coming Soon

---

## Overview

OrderFlow was designed to simulate a real-world eCommerce operations environment.

The platform provides both:

- A customer-facing storefront
- A professional Order Management System (OMS)

The goal of the project is to demonstrate modern frontend architecture, order lifecycle management, inventory operations, returns processing and real-time business workflows.

---

## Key Features

### Storefront

- Product catalog
- Product detail modal
- Shopping cart
- Checkout process
- Discount code support
- Real-time inventory visibility
- Responsive user interface

### OMS Admin

- Dashboard analytics
- Order management
- Inventory management
- Customer management
- Returns management
- Discount management
- Audit logs
- Real-time order updates

### Inventory Management

- Create new SKUs
- Stock adjustments
- Product activation
- Product archiving
- Storefront visibility control
- Low stock monitoring

### Returns & Refunds

- Return requests
- Return approval workflow
- Return received processing
- Refund handling
- Revenue adjustments
- Inventory restoration

---

## Order Lifecycle

```text
PAID
↓
PROCESSING
↓
PACKED
↓
SHIPPED
↓
DELIVERED
```

Returns workflow:

```text
DELIVERED
↓
RETURN_REQUESTED
↓
RETURN_APPROVED
↓
RETURN_RECEIVED
↓
REFUNDED
```

---

## Screenshots

### Storefront

![Storefront](screenshots/hero-eshop.png)

### Product Details

![Product Modal](screenshots/product-card.png)

### Checkout

![Checkout](screenshots/checkout.png)

### OMS Dashboard

![Dashboard](screenshots/admin-dashboard.png)

### Orders

![Orders](screenshots/admin-orderlist.png)

### Order Details

![Order Details](screenshots/admin-order.png)

### Inventory

![Inventory](screenshots/admin-inventory.png)

### Returns

![Returns](screenshots/admin-returns.png)

---

## Technology Stack

### Frontend

- React
- TypeScript
- Vite
- React Router
- Recharts
- Lucide React

### Backend

- Supabase
- PostgreSQL
- Realtime Subscriptions
- Row Level Security (RLS)

---

## Routes

| Route | Description |
|---------|-------------|
| / | Storefront |
| /admin | OMS Dashboard |
| /admin/orders | Orders |
| /admin/customers | Customers |
| /admin/inventory | Inventory |
| /admin/returns | Returns |
| /admin/discounts | Discounts |
| /admin/audit | Audit Logs |
| /admin/orders/:id | Order Details |

---

## Installation

### Clone Repository

```bash
git clone https://github.com/vtmag/orderflow-commerce-os.git
cd orderflow-commerce-os
```

### Install Dependencies

```bash
npm install
```

### Configure Environment Variables

Create a `.env.local` file:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Database Setup

Run the SQL script located in:

```text
supabase/schema.sql
```

using the Supabase SQL Editor.

### Start Development Server

```bash
npm run dev
```

Application URLs:

```text
Storefront:
http://localhost:5173

Admin:
http://localhost:5173/admin
```

### Production Build

```bash
npm run build
```

### Preview Production Build

```bash
npm run preview
```

---

## Inventory Features

- SKU creation
- Stock adjustments
- Product archiving
- Product activation
- Storefront visibility control

Archived products remain available for historical orders while being hidden from customers.

---

## Returns & Refunds

- Return requests
- Return approval workflow
- Return received processing
- Refund handling
- Revenue adjustments
- Inventory restoration

---

## Security

Current implementation includes:

- Admin access protection
- Environment variable configuration
- Supabase RLS support

Future production implementation should include:

- Authentication
- User sessions
- Role-based access control

---

## Future Enhancements

- Authentication
- Role-based permissions
- Payment gateway integration
- Shipment tracking integrations
- Email notifications
- Multi-warehouse inventory
- Vendor management
- Advanced analytics

---

## Project Structure

```text
src/
├── components/
├── lib/
├── utils/
├── App.tsx
├── main.tsx
├── styles.css
└── types.ts

supabase/
└── schema.sql
```

---

## Author

**Magdalini Vitsioti**

Built as a portfolio project focused on modern eCommerce operations, order management systems and real-world business workflows.

---

## License

MIT License
