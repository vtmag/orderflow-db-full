-- OrderFlow full Supabase schema + seed
-- Run this entire file in Supabase SQL Editor.

create extension if not exists pgcrypto;

drop table if exists audit_logs cascade;
drop table if exists returns cascade;
drop table if exists order_items cascade;
drop table if exists orders cascade;
drop table if exists customers cascade;
drop table if exists products cascade;

drop type if exists order_status cascade;
drop type if exists return_status cascade;
create type order_status as enum ('NEW','PAID','PROCESSING','PACKED','SHIPPED','DELIVERED','RETURN_REQUESTED','REFUNDED','CANCELLED');
create type return_status as enum ('REQUESTED','APPROVED','REJECTED','REFUNDED');

create table products (
  id uuid primary key default gen_random_uuid(),
  sku text unique not null,
  name text not null,
  category text not null,
  price numeric(10,2) not null check (price >= 0),
  stock integer not null default 0 check (stock >= 0),
  image_url text not null,
  accent text not null default '#8b5cf6',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table customers (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  email text not null,
  phone text,
  city text,
  created_at timestamptz not null default now()
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  order_no text unique not null default ('OF-' || to_char(now(),'YYMMDD') || '-' || upper(substr(gen_random_uuid()::text,1,6))),
  customer_id uuid references customers(id) on delete set null,
  status order_status not null default 'NEW',
  subtotal numeric(10,2) not null default 0,
  shipping numeric(10,2) not null default 0,
  total numeric(10,2) not null default 0,
  payment_method text not null default 'Fake Checkout',
  shipping_address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id uuid references products(id) on delete set null,
  sku text not null,
  name text not null,
  qty integer not null check (qty > 0),
  unit_price numeric(10,2) not null,
  line_total numeric(10,2) not null
);

create table returns (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  status return_status not null default 'REQUESTED',
  reason text not null,
  amount numeric(10,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references orders(id) on delete cascade,
  event text not null,
  actor text not null default 'system',
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger orders_touch before update on orders for each row execute function touch_updated_at();
create trigger returns_touch before update on returns for each row execute function touch_updated_at();

drop function if exists public.create_checkout_order(text,text,text,text,text,text,jsonb);

create or replace function create_checkout_order(
  customer_name text,
  customer_email text,
  customer_phone text,
  customer_city text,
  shipping_address text,
  checkout_notes text,
  items jsonb
) returns uuid language plpgsql security definer as $$
declare
  c_id uuid;
  o_id uuid;
  item jsonb;
  p record;
  calculated_subtotal numeric := 0;
  shipping_fee numeric := 4.90;
begin
  if jsonb_array_length(items) = 0 then raise exception 'Cart is empty'; end if;
  insert into customers(name,email,phone,city) values(customer_name, customer_email, customer_phone, customer_city) returning id into c_id;
  insert into orders(customer_id,status,shipping,shipping_address,notes) values(c_id,'PAID',shipping_fee,shipping_address,checkout_notes) returning id into o_id;
  for item in select * from jsonb_array_elements(items) loop
    select * into p from products where id = (item->>'product_id')::uuid and active = true for update;
    if p.id is null then raise exception 'Product not found'; end if;
    if p.stock < (item->>'qty')::int then raise exception 'Not enough stock for %', p.sku; end if;
    update products set stock = stock - (item->>'qty')::int where id = p.id;
    insert into order_items(order_id, product_id, sku, name, qty, unit_price, line_total)
    values(o_id, p.id, p.sku, p.name, (item->>'qty')::int, p.price, p.price * (item->>'qty')::int);
    calculated_subtotal := calculated_subtotal + p.price * (item->>'qty')::int;
  end loop;
  update orders set subtotal = calculated_subtotal, total = calculated_subtotal + shipping_fee where id = o_id;
  insert into audit_logs(order_id,event,actor,metadata) values(o_id,'ORDER_CREATED_FROM_STOREFRONT','checkout', jsonb_build_object('subtotal',calculated_subtotal,'shipping',shipping_fee));
  insert into audit_logs(order_id,event,actor) values(o_id,'PAYMENT_CAPTURED_FAKE','fake-gateway');
  return o_id;
end $$;

create or replace function update_order_status(order_id_input uuid, new_status order_status, actor_name text default 'admin') returns void language plpgsql security definer as $$
declare old_status order_status;
begin
  select status into old_status from orders where id = order_id_input;
  update orders set status = new_status where id = order_id_input;
  insert into audit_logs(order_id,event,actor,metadata) values(order_id_input,'STATUS_CHANGED',actor_name,jsonb_build_object('from',old_status,'to',new_status));
end $$;

create or replace function request_return(order_id_input uuid, reason_input text, actor_name text default 'customer') returns uuid language plpgsql security definer as $$
declare r_id uuid; amount numeric;
begin
  select total into amount from orders where id=order_id_input;
  insert into returns(order_id, reason, amount) values(order_id_input, reason_input, amount) returning id into r_id;
  update orders set status='RETURN_REQUESTED' where id=order_id_input;
  insert into audit_logs(order_id,event,actor,metadata) values(order_id_input,'RETURN_REQUESTED',actor_name,jsonb_build_object('reason',reason_input,'amount',amount));
  return r_id;
end $$;

create or replace function approve_refund(return_id_input uuid, actor_name text default 'admin') returns void language plpgsql security definer as $$
declare o_id uuid; item record;
begin
  select order_id into o_id from returns where id=return_id_input;
  update returns set status='REFUNDED' where id=return_id_input;
  update orders set status='REFUNDED' where id=o_id;
  for item in select product_id, qty from order_items where order_id=o_id loop
    update products set stock = stock + item.qty where id=item.product_id;
  end loop;
  insert into audit_logs(order_id,event,actor) values(o_id,'REFUND_APPROVED_AND_STOCK_RESTORED',actor_name);
end $$;

alter table products enable row level security;
alter table customers enable row level security;
alter table orders enable row level security;
alter table order_items enable row level security;
alter table returns enable row level security;
alter table audit_logs enable row level security;

create policy "public read products" on products for select using (true);
create policy "public read customers" on customers for select using (true);
create policy "public read orders" on orders for select using (true);
create policy "public read order_items" on order_items for select using (true);
create policy "public read returns" on returns for select using (true);
create policy "public read audit_logs" on audit_logs for select using (true);

insert into products(sku,name,category,price,stock,image_url,accent) values
('SK-ALPHA','Aurelia Knit Hoodie','Apparel',79.90,42,'https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=900&q=80','#a855f7'),
('SK-NOVA','Nova Running Sneaker','Footwear',119.00,25,'https://images.unsplash.com/photo-1542291026-7eec264c27ff?auto=format&fit=crop&w=900&q=80','#22c55e'),
('SK-LUMA','Luma Smart Bottle','Accessories',34.90,88,'https://images.unsplash.com/photo-1602143407151-7111542de6e8?auto=format&fit=crop&w=900&q=80','#06b6d4'),
('SK-ORBIT','Orbit Travel Backpack','Bags',96.50,17,'https://images.unsplash.com/photo-1553062407-98eeb64c6a62?auto=format&fit=crop&w=900&q=80','#f97316'),
('SK-MONO','Mono Desk Lamp','Home',54.00,9,'https://images.unsplash.com/photo-1507473885765-e6ed057f782c?auto=format&fit=crop&w=900&q=80','#eab308'),
('SK-VELO','Velo Steel Watch','Accessories',149.00,13,'https://images.unsplash.com/photo-1523275335684-37898b6baf30?auto=format&fit=crop&w=900&q=80','#64748b');
