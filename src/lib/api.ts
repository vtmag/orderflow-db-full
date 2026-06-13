import { supabase, isSupabaseConfigured } from './supabase';
import type { Product, Order, AuditLog, ReturnRow, CartItem, Status } from '../types';

const must = () => { if (!supabase) throw new Error('Supabase is not configured. Create .env.local from .env.example.'); return supabase; };

export async function getProducts() {
  const { data, error } = await must()
    .from('products')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

export async function getOrders(): Promise<Order[]> {
  const { data, error } = await must().from('orders').select('*, customer:customers(*), order_items(*)').order('created_at', { ascending: false });
  if (error) throw error; return data ?? [];
}

export async function getAuditLogs(orderId?: string): Promise<AuditLog[]> {
  let q = must().from('audit_logs').select('*').order('created_at', { ascending: false });
  if (orderId) q = q.eq('order_id', orderId);
  const { data, error } = await q;
  if (error) throw error; return data ?? [];
}

export async function getReturns(): Promise<ReturnRow[]> {
  const { data, error } = await must().from('returns').select('*').order('created_at', { ascending: false });
  if (error) throw error; return data ?? [];
}

export async function createCheckoutOrder(payload: {
  name:string;
  email:string;
  phone:string;
  city:string;
  address:string;
  notes:string;
  cart:CartItem[];
  discount_code?:string;
  discount_amount?:number;
}): Promise<string> {
  const items = payload.cart.map(i => ({ product_id: i.product.id, qty: i.qty }));

  const { data, error } = await must().rpc('create_checkout_order', {
    customer_name: payload.name,
    customer_email: payload.email,
    customer_phone: payload.phone,
    customer_city: payload.city,
    shipping_address: payload.address,
    checkout_notes: payload.notes,
    items,
    discount_code_input: payload.discount_code || null,
    discount_amount_input: payload.discount_amount || 0
  });

  if (error) throw error;

const orderId = data as string;

const total =
  payload.cart.reduce(
    (sum, item) => sum + item.product.price * item.qty,
    0
  ) - (payload.discount_amount || 0);

try {
  await fetch("/api/send-order-email", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      orderId,
      customerEmail: payload.email,
      customerName: payload.name,
      total,
    }),
  });
} catch (emailError) {
  console.error("Failed to send order confirmation email:", emailError);
}

return orderId;
}

export async function updateStatus(id: string, status: Status) {
  const { error } = await must()
    .from('orders')
    .update({
      status,
      fulfillment_status: status
    })
    .eq('id', id);

  if (error) throw error;

  const { error: logError } = await must()
    .from('audit_logs')
    .insert({
      order_id: id,
      event: 'FULFILLMENT_STATUS_CHANGED',
      actor: 'admin',
      metadata: { fulfillment_status: status }
    });

  if (logError) throw logError;
}

export async function requestReturn(orderId: string, reason: string) {
  const { error } = await must().rpc('request_return', { order_id_input: orderId, reason_input: reason, actor_name: 'admin@orderflow' });
  if (error) throw error;
}

export async function approveRefund(returnId: string) {
  const { error } = await must().rpc('approve_refund', { return_id_input: returnId, actor_name: 'admin@orderflow' });
  if (error) throw error;
}

export async function createProduct(input: {
  sku: string;
  name: string;
  category: string;
  price: number;
  stock: number;
  image_url: string;
  accent: string;
  description: string;
}) {
  const { data, error } = await must().rpc('create_product', {
    p_sku: input.sku,
    p_name: input.name,
    p_category: input.category,
    p_price: input.price,
    p_stock: input.stock,
    p_image_url: input.image_url,
    p_accent: input.accent,
    p_description: input.description,
  });

  if (error) throw error;
  return data;
}

export async function adjustStock(productId: string, quantity: number) {
  const { error } = await must().rpc('adjust_stock', {
    p_product_id: productId,
    p_quantity: quantity,
  });

  if (error) throw error;
}

export async function archiveProductBySku(sku:string) {
  const { data, error } = await must()
    .from('products')
    .update({ active: false })
    .eq('sku', sku)
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No product was updated by SKU.');
  }

  return data[0];
}

export async function activateProductBySku(sku:string) {
  const { data, error } = await must()
    .from('products')
    .update({ active: true })
    .eq('sku', sku)
    .select('*');

  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('No product was updated by SKU.');
  }

  return data[0];
}
export async function getDiscounts() {
  const { data, error } = await must()
    .from('discounts')
    .select('*, product:products(*)')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function createDiscount(input:any) {
  const { data, error } = await must()
    .from('discounts')
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function getCustomers() {
  const { data, error } = await must()
    .from('customers')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function updateTracking(
  orderId:string,
  carrier:string,
  trackingNumber:string
) {

  const { data, error } = await must()
    .from('orders')
    .update({
      carrier,
      tracking_number: trackingNumber
    })
    .eq('id', orderId)
    .select('*, customer:customers(*), order_items(*)')
    .single();

  if (error) throw error;

  await must()
    .from('audit_logs')
    .insert({
      order_id: orderId,
      event: 'TRACKING_ASSIGNED',
      actor: 'admin',
      metadata: {
        carrier,
        tracking_number: trackingNumber
      }
    });

  return data;
}

export { isSupabaseConfigured };
