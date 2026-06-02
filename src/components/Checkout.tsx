import { useState } from 'react';
import { CheckCircle2, ChevronLeft, ChevronRight } from 'lucide-react';
import type { CartItem } from '../types';
import { createCheckoutOrder } from '../lib/api';
import { money } from '../utils/format';

export function Checkout({cart,discounts,clear,reload,close}:{cart:CartItem[];discounts:any[];clear:()=>void;reload:()=>void;close:()=>void}){
 const [form,setForm]=useState({
  name:'Maria Demo',
  email:'maria@example.com',
  phone:'6900000000',
  city:'Thessaloniki',
  address:'Tsimiski 10, Thessaloniki',
  notes:'Leave at reception',
  discountCode:''
 });

 const [appliedDiscount,setAppliedDiscount]=useState<any|null>(null);
 const [discountError,setDiscountError]=useState('');
 const [done,setDone]=useState('');
 const [error,setError]=useState('');
 const [step,setStep]=useState(1);

 const subtotal=cart.reduce((a,i)=>a+Number(i.product.price)*i.qty,0);
 const shipping=4.9;

 function calculateDiscount(discount:any) {
  if(!discount) return 0;

  if(discount.minimum_order_amount && subtotal < Number(discount.minimum_order_amount)) {
   return 0;
  }

  if(discount.level === 'ORDER') {
   if(discount.type === 'PERCENTAGE') return subtotal * (Number(discount.value) / 100);
   return Number(discount.value);
  }

  if(discount.level === 'PRODUCT') {
   const matchingItem = cart.find(i=>i.product.id === discount.product_id);
   if(!matchingItem) return 0;

   const productTotal = Number(matchingItem.product.price) * matchingItem.qty;

   if(discount.type === 'PERCENTAGE') return productTotal * (Number(discount.value) / 100);
   return Number(discount.value);
  }

  return 0;
 }

 const discountAmount = Math.min(calculateDiscount(appliedDiscount), subtotal);
 const finalTotal = subtotal + shipping - discountAmount;

 function applyDiscount() {
  setDiscountError('');

  const code = form.discountCode.trim().toUpperCase();

  const discount = discounts.find(d =>
   d.code.toUpperCase() === code
  );

  if(!discount) {
   setAppliedDiscount(null);
   setDiscountError('Discount code not found.');
   return;
  }

  if(!discount.active) {
   setAppliedDiscount(null);
   setDiscountError('This discount is inactive.');
   return;
  }

  if(discount.expires_at && new Date(discount.expires_at) < new Date()) {
   setAppliedDiscount(null);
   setDiscountError('This discount has expired.');
   return;
  }

  if(discount.minimum_order_amount && subtotal < Number(discount.minimum_order_amount)) {
   setAppliedDiscount(null);
   setDiscountError(`Minimum order amount is ${money(Number(discount.minimum_order_amount))}.`);
   return;
  }

  if(discount.level === 'PRODUCT') {
   const hasProduct = cart.some(i=>i.product.id === discount.product_id);
   if(!hasProduct) {
    setAppliedDiscount(null);
    setDiscountError('This code applies to a specific product that is not in your cart.');
    return;
   }
  }

  setAppliedDiscount(discount);
 }

 async function submit(){
  setError('');

  try{
   const id=await createCheckoutOrder({
    ...form,
    cart,
    discount_code: appliedDiscount?.code || null,
    discount_amount: discountAmount
   });

   setDone(id);
   clear();
   reload();
  }catch(e:any){
   setError(e.message);
  }
 }

 if(done) return <div className="success">
  <CheckCircle2 size={54}/>
  <h2>Order confirmed</h2>
  <p>Order ID: {done}</p>
  <button className="primary" onClick={close}>Close</button>
 </div>;

 return <div className="checkout-flow">
  <h2>Checkout</h2>

  <div className="steps">
   <span className={step===1?'on':''}>1 Customer</span>
   <span className={step===2?'on':''}>2 Delivery</span>
   <span className={step===3?'on':''}>3 Payment</span>
  </div>

  {step===1&&<div className="form-grid">
   <label>Name<input value={form.name} onChange={e=>setForm({...form,name:e.target.value})}/></label>
   <label>Email<input value={form.email} onChange={e=>setForm({...form,email:e.target.value})}/></label>
   <label>Phone<input value={form.phone} onChange={e=>setForm({...form,phone:e.target.value})}/></label>
   <button className="primary wide" onClick={()=>setStep(2)}>Continue <ChevronRight size={16}/></button>
  </div>}

  {step===2&&<div className="form-grid">
   <label>City<input value={form.city} onChange={e=>setForm({...form,city:e.target.value})}/></label>
   <label>Shipping address<input value={form.address} onChange={e=>setForm({...form,address:e.target.value})}/></label>
   <label>Notes<input value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})}/></label>
   <div className="two">
    <button className="ghost" onClick={()=>setStep(1)}><ChevronLeft size={16}/> Back</button>
    <button className="primary" onClick={()=>setStep(3)}>Review order</button>
   </div>
  </div>}

  {step===3&&<aside>
   {cart.map(i=><div className="line" key={i.product.id}>
    <span>{i.qty}× {i.product.name}</span>
    <b>{money(i.qty*Number(i.product.price))}</b>
   </div>)}

   <div className="discount-box">
    <label>Discount code</label>

    <div className="discount-row">
     <input
      value={form.discountCode}
      onChange={e=>setForm({...form,discountCode:e.target.value})}
      placeholder="SUMMER20"
     />
     <button type="button" onClick={applyDiscount}>Apply</button>
    </div>

    {appliedDiscount && (
     <p className="discount-success">
      Applied: {appliedDiscount.code}
     </p>
    )}

    {discountError && (
     <p className="error">{discountError}</p>
    )}
   </div>

   <hr/>

   <div className="line"><span>Subtotal</span><b>{money(subtotal)}</b></div>

   {discountAmount > 0 && (
    <div className="line discount-line">
     <span>Discount {appliedDiscount?.code}</span>
     <b>-{money(discountAmount)}</b>
    </div>
   )}

   <div className="line"><span>Shipping</span><b>{money(shipping)}</b></div>

   <div className="line total"><span>Total</span><b>{money(finalTotal)}</b></div>

   {error&&<p className="error">{error}</p>}

   <div className="two">
    <button className="ghost" onClick={()=>setStep(2)}><ChevronLeft size={16}/> Back</button>
    <button disabled={!cart.length} onClick={submit} className="primary">Complete order</button>
   </div>
  </aside>}
 </div>
}