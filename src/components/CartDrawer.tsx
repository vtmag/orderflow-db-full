import { useState } from 'react';
import { CreditCard, Minus, Plus, X } from 'lucide-react';
import type { CartItem } from '../types';
import { money } from '../utils/format';
import { Checkout } from './Checkout';

export function CartDrawer({cart,discounts,changeQty,remove,clear,reload,close}:{cart:CartItem[];discounts:any[];changeQty:(id:string,delta:number)=>void;remove:(id:string)=>void;clear:()=>void;reload:()=>void;close:()=>void}){
 const [checkout,setCheckout]=useState(false);
 const subtotal=cart.reduce((a,i)=>a+Number(i.product.price)*i.qty,0);
 return <div className="drawer-backdrop"><aside className="shop-drawer"><button className="x" onClick={close}>×</button>{checkout?<Checkout cart={cart} discounts={discounts} clear={clear} reload={reload} close={close}/>:<><h2>Your cart</h2><p className="muted">Fake cart, real Supabase checkout.</p><div className="cart-lines">{cart.map(i=><div className="cart-line" key={i.product.id}><img src={i.product.image_url}/><div><b>{i.product.name}</b><small>{i.product.sku}</small><div className="qty"><button onClick={()=>changeQty(i.product.id,-1)}><Minus size={14}/></button><span>{i.qty}</span><button onClick={()=>changeQty(i.product.id,1)}><Plus size={14}/></button><button className="remove" onClick={()=>remove(i.product.id)}><X size={14}/></button></div></div><strong>{money(i.qty*Number(i.product.price))}</strong></div>)}</div>{!cart.length&&<div className="empty-state">Your cart is empty.</div>}<div className="cart-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Shipping</span><b>{money(4.9)}</b></div><div className="grand"><span>Total</span><b>{money(subtotal+4.9)}</b></div></div><button disabled={!cart.length} className="primary wide" onClick={()=>setCheckout(true)}><CreditCard size={18}/> Continue to checkout</button></>}</aside></div>
}
