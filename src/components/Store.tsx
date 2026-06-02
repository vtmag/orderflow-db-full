import { useMemo, useState } from 'react';
import { ArrowRight, BadgeCheck, Search, ShoppingBag, SlidersHorizontal, Sparkles, Star } from 'lucide-react';
import type { CartItem, Product } from '../types';
import { money } from '../utils/format';
import { ProductCard } from './ProductCard';
import { ProductModal } from './ProductModal';
import { CartDrawer } from './CartDrawer';

export function Store({
  products,
  cart,
  discounts,
  add,
  changeQty,
  remove,
  clear,
  reload
}:{
  products:Product[];
  cart:CartItem[];
  discounts:any[];
  add:(p:Product)=>void;
  changeQty:(id:string,delta:number)=>void;
  remove:(id:string)=>void;
  clear:()=>void;
  reload:()=>void;
}){
 const [cartOpen,setCartOpen]=useState(false);
 const [selected,setSelected]=useState<Product|null>(null);
 const [category,setCategory]=useState('All');
 const [sort,setSort]=useState('featured');
 const [query,setQuery]=useState('');
 const categories=['All',...Array.from(new Set(products.map(p=>p.category)))];
 const featured=products[0];
 const visible=useMemo(()=>{
  let list=products.filter(p=>(category==='All'||p.category===category) && `${p.name} ${p.sku} ${p.category}`.toLowerCase().includes(query.toLowerCase()));
  if(sort==='price-asc') list=[...list].sort((a,b)=>Number(a.price)-Number(b.price));
  if(sort==='price-desc') list=[...list].sort((a,b)=>Number(b.price)-Number(a.price));
  if(sort==='stock') list=[...list].sort((a,b)=>Number(b.stock)-Number(a.stock));
  return list;
 },[products,category,sort,query]);
 const count=cart.reduce((a,i)=>a+i.qty,0);
 const total=cart.reduce((a,i)=>a+Number(i.product.price)*i.qty,0);
 return <main className="store-shell">
   <section className="shop-hero">
    <div className="hero-copy">
      <div className="eyebrow"><Sparkles size={16}/> New season drop · connected checkout</div>
      <h1>Premium essentials for a modern lifestyle.</h1>
      {/* <p>Ένα πιο αληθινό storefront με curated collections, filters, product details, cart drawer και fake checkout που γράφει πραγματικά orders στη Supabase βάση.</p> */}
      <div className="hero-actions"><button className="primary" onClick={()=>document.getElementById('collection')?.scrollIntoView({behavior:'smooth'})}>Shop collection <ArrowRight size={18}/></button><button className="ghost" onClick={()=>setCartOpen(true)}><ShoppingBag size={18}/> View cart</button></div>
      <div className="trust-row"><span><BadgeCheck/> Secure checkout</span><span><Star/> 4.8 avg. rating</span></div>
    </div>
    <div className="hero-showcase">
      {featured&&<><img src={featured.image_url} alt={featured.name}/><div className="floating-card top"><small>Hero SKU</small><b>{featured.sku}</b></div><div className="floating-card bottom"><small>Live stock</small><b>{featured.stock} units</b></div></>}
    </div>
   </section>

   {/* <section className="promo-strip">
    <div><b>Free delivery</b><span>for demo orders over €100</span></div>
    <div><b>OMS connected</b><span>orders appear in admin</span></div>
    <div><b>Inventory aware</b><span>stock decreases on checkout</span></div>
   </section> */}

   <section id="collection" className="collection-head">
    <div><span className="kicker">Shop</span><h2>Curated collection</h2></div>
    <button className="cart-btn" onClick={()=>setCartOpen(true)}><ShoppingBag/> Cart {count>0&&<b>{count}</b>}<em>{money(total)}</em></button>
   </section>

   <section className="filters">
    <div className="search"><Search size={16}/><input placeholder="Search by product, SKU, category..." value={query} onChange={e=>setQuery(e.target.value)}/></div>
    <div className="chips">{categories.map(c=><button key={c} className={category===c?'selected':''} onClick={()=>setCategory(c)}>{c}</button>)}</div>
    <label className="sort"><SlidersHorizontal size={16}/><select value={sort} onChange={e=>setSort(e.target.value)}><option value="featured">Featured</option><option value="price-asc">Price low to high</option><option value="price-desc">Price high to low</option><option value="stock">Stock availability</option></select></label>
   </section>

   <div className="products pro-grid">{visible.map(p=><ProductCard key={p.id} product={p} add={add} open={()=>setSelected(p)}/>)}</div>
   {!visible.length&&<div className="empty-state">No products found.</div>}
   {selected&&<ProductModal product={selected} close={()=>setSelected(null)} add={add}/>} 
   {cartOpen&&<CartDrawer cart={cart} discounts={discounts} changeQty={changeQty} remove={remove} clear={clear} reload={reload} close={()=>setCartOpen(false)}/>} 
  </main>
}
