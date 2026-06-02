export type Status =
  | 'PAID'
  | 'PROCESSING'
  | 'PACKED'
  | 'SHIPPED'
  | 'DELIVERED'
  | 'CANCELLED';
export type Product = {id:string; sku:string; name:string; category:string; price:number; stock:number; image_url:string; accent:string; active:boolean;description?: string | null;};
export type Customer = {id:string; name:string; email:string; phone?:string; city?:string};
export type Order = {id:string; order_no:string; customer_id:string; status:Status; subtotal:number; shipping:number; total:number; payment_method:string; shipping_address?:string; notes?:string; created_at:string; customer?:Customer; order_items?:OrderItem[];discount_code?: string;
discount_amount?: number;
carrier?: string;
tracking_number?: string;
shipped_at?: string;
fulfillment_status?: Status;
financial_status?: 'PAID' | 'PARTIALLY_REFUNDED' | 'REFUNDED';
return_status?: 'RETURN_REQUESTED' | 'RETURN_APPROVED' | 'RETURN_RECEIVED' | 'RETURN_REJECTED' | null;
refunded_amount?: number;
stock_restored?: boolean;};
export type OrderItem = {id:string; order_id:string; product_id:string; sku:string; name:string; qty:number; unit_price:number; line_total:number};
export type AuditLog = {id:string; order_id:string; event:string; actor:string; metadata:any; created_at:string};
export type ReturnRow = {id:string; order_id:string; status:string; reason:string; amount:number; created_at:string};
export type CartItem = {product: Product; qty: number};
