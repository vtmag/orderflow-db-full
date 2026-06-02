import React, { useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { supabase } from './lib/supabase';
import {
  ArrowRight, BadgeCheck, BarChart3, Boxes, CheckCircle2, ChevronLeft, ChevronRight,
  CircleDollarSign, ClipboardList, CreditCard, Filter, Heart, Layers3, Minus, PackageCheck,
  Plus, RefreshCcw, Search, ShieldCheck, ShoppingBag, SlidersHorizontal, Sparkles, Star,
  Truck, X, Zap
} from 'lucide-react';
import { LineChart, Line, ResponsiveContainer, XAxis, YAxis, Tooltip, BarChart, Bar } from 'recharts';
import './styles.css';
import type { CartItem, Order, Product, ReturnRow, Status } from './types';
import { approveRefund, createCheckoutOrder, getAuditLogs, getOrders, getProducts, getReturns, getCustomers, isSupabaseConfigured, requestReturn, updateStatus, createProduct, adjustStock,getDiscounts,
createDiscount,updateTracking } from './lib/api';

const statuses: Status[] = ['PAID','PROCESSING','PACKED','SHIPPED','DELIVERED','CANCELLED'];
const money = (n:number) => new Intl.NumberFormat('el-GR',{style:'currency',currency:'EUR'}).format(Number(n || 0));
const statusClass = (s:string) => `pill ${String(s).toLowerCase()}`;
const ratingFor = (sku:string) => 4.4 + ((sku.charCodeAt(sku.length-1) % 6) / 10);

function App(){
  const [view,setView]=useState<'store'|'admin'>('store');
  const [products,setProducts]=useState<Product[]>([]);
  const [orders,setOrders]=useState<Order[]>([]);
  const [returns,setReturns]=useState<ReturnRow[]>([]);
  const [logs,setLogs]=useState<any[]>([]);
  const [cart,setCart]=useState<CartItem[]>([]);
  const [loading,setLoading]=useState(false);
  const [err,setErr]=useState('');
const [newOrderToast,setNewOrderToast]=useState(false);
const [discounts,setDiscounts]=useState<any[]>([]);
const [customers,setCustomers]=useState<any[]>([]);

 async function load(){
  if(!isSupabaseConfigured){
    setErr('Λείπει Supabase config. Φτιάξε .env.local και τρέξε το schema.sql.');
    return;
  }

  setLoading(true);
  setErr('');

  try{

    const [p,o,r,l,d,c] = await Promise.all([
  getProducts(),
  getOrders(),
  getReturns(),
  getAuditLogs(),
  getDiscounts(),
  getCustomers()
]);

  setProducts(p);
  setOrders(o);
  setReturns(r);
  setLogs(l);
  setDiscounts(d);
  setCustomers(c);

  }
  catch(e:any){
    setErr(e.message);
  }
  finally{
    setLoading(false);
  }
}
  useEffect(()=>{load()},[]);

useEffect(() => {
  if (!isSupabaseConfigured) return;

  const mustClient = () => {
  if (!supabase) throw new Error('Supabase is not configured');
  return supabase;
};

  const channel = mustClient()
    .channel('orders-realtime')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'orders'
      },
      async () => {
        await load();

        if (view === 'admin') {
          setNewOrderToast(true);

          setTimeout(() => {
            setNewOrderToast(false);
          }, 5000);
        }
      }
    )
    .subscribe();

  return () => {
    mustClient().removeChannel(channel);
  };
}, [view]);

  const add=(p:Product)=>setCart(c=>{const ex=c.find(x=>x.product.id===p.id);return ex?c.map(x=>x.product.id===p.id?{...x,qty:x.qty+1}:x):[...c,{product:p,qty:1}]});
  const changeQty=(id:string,delta:number)=>setCart(c=>c.map(x=>x.product.id===id?{...x,qty:Math.max(1,x.qty+delta)}:x).filter(x=>x.qty>0));
  const remove=(id:string)=>setCart(c=>c.filter(x=>x.product.id!==id));
  const clear=()=>setCart([]);

  return <>
    <nav className="nav">
      <div className="brand"><span><Layers3 size={20}/></span>OrderFlow<span className="tag">Commerce OS</span></div>
      <div className="nav-actions"><button onClick={()=>setView('store')} className={view==='store'?'active':''}>Storefront</button><button onClick={()=>setView('admin')} className={view==='admin'?'active':''}>OMS Admin</button><button onClick={load}><RefreshCcw size={16}/> Sync DB</button></div>
    </nav>
    {err&&<div className="banner"><ShieldCheck/> {err}</div>}
    {view==='store'?<Store products={products}
    cart={cart}
    discounts={discounts}
    add={add}
    changeQty={changeQty}
    remove={remove}
    clear={clear}
    reload={load}
  /> :<Admin orders={orders}
    products={products}
    returns={returns}
    logs={logs}
    discounts={discounts}
    customers={customers}
    reload={load}
    loading={loading}
  />} 
    {newOrderToast && (
  <div className="shopify-toast">
    <b>One new order</b>
    <span>Orders updated in real time.</span>
  </div>
)}
  </>
}

function Store({
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

function ProductCard({product,add,open}:{product:Product;add:(p:Product)=>void;open:()=>void}){
 const rating=ratingFor(product.sku);
 return <article className="product pro-card">
  <button className="heart"><Heart size={18}/></button>
  <div className="image-wrap" onClick={open}><img src={product.image_url} alt={product.name}/><span className="stock-badge">{product.stock < 15 ? 'Low stock' : 'In stock'}</span></div>
  <div className="product-info"><span style={{background:product.accent}}>{product.category}</span><h3 onClick={open}>{product.name}</h3><p>{product.sku}</p><div className="rating"><Star size={15}/><b>{rating.toFixed(1)}</b><em>({Math.floor(rating*37)} reviews)</em></div><footer><b>{money(product.price)}</b><button onClick={()=>add(product)}>Add to cart</button></footer></div>
 </article>
}

function ProductModal({product,close,add}:{product:Product;close:()=>void;add:(p:Product)=>void}){
 return <div className="modal"><div className="product-modal"><button className="x" onClick={close}>×</button><div className="pd-image"><img src={product.image_url} alt={product.name}/></div><div className="pd-info"><span className="kicker">{product.category}</span><h2>{product.name}</h2><div className="rating"><Star size={16}/><b>{ratingFor(product.sku).toFixed(1)}</b><em>Verified demo reviews</em></div><p>Premium product page experience με SKU, stock visibility, delivery promise και clear add-to-cart CTA. Ιδανικό για να δείχνει σαν πραγματικό e-commerce και όχι σαν απλή λίστα προϊόντων.</p><div className="pd-meta"><div><small>SKU</small><b>{product.sku}</b></div><div><small>Stock</small><b>{product.stock}</b></div><div><small>Price</small><b>{money(product.price)}</b></div></div><button className="primary wide" onClick={()=>{add(product); close();}}>Add to cart</button></div></div></div>
}

function CartDrawer({cart,discounts,changeQty,remove,clear,reload,close}:{cart:CartItem[];discounts:any[];changeQty:(id:string,delta:number)=>void;remove:(id:string)=>void;clear:()=>void;reload:()=>void;close:()=>void}){
 const [checkout,setCheckout]=useState(false);
 const subtotal=cart.reduce((a,i)=>a+Number(i.product.price)*i.qty,0);
 return <div className="drawer-backdrop"><aside className="shop-drawer"><button className="x" onClick={close}>×</button>{checkout?<Checkout cart={cart} discounts={discounts} clear={clear} reload={reload} close={close}/>:<><h2>Your cart</h2><p className="muted">Fake cart, real Supabase checkout.</p><div className="cart-lines">{cart.map(i=><div className="cart-line" key={i.product.id}><img src={i.product.image_url}/><div><b>{i.product.name}</b><small>{i.product.sku}</small><div className="qty"><button onClick={()=>changeQty(i.product.id,-1)}><Minus size={14}/></button><span>{i.qty}</span><button onClick={()=>changeQty(i.product.id,1)}><Plus size={14}/></button><button className="remove" onClick={()=>remove(i.product.id)}><X size={14}/></button></div></div><strong>{money(i.qty*Number(i.product.price))}</strong></div>)}</div>{!cart.length&&<div className="empty-state">Your cart is empty.</div>}<div className="cart-summary"><div><span>Subtotal</span><b>{money(subtotal)}</b></div><div><span>Shipping</span><b>{money(4.9)}</b></div><div className="grand"><span>Total</span><b>{money(subtotal+4.9)}</b></div></div><button disabled={!cart.length} className="primary wide" onClick={()=>setCheckout(true)}><CreditCard size={18}/> Continue to checkout</button></>}</aside></div>
}

function Checkout({cart,discounts,clear,reload,close}:{cart:CartItem[];discounts:any[];clear:()=>void;reload:()=>void;close:()=>void}){
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
function InventoryManager({products,reload}:{products:Product[];reload:()=>void}) {
 const [modal,setModal]=useState<'create'|'stock'|null>(null);
 const [msg,setMsg]=useState('');
 const [q,setQ]=useState('');

 const lowStock = products.filter(p=>Number(p.stock) < 15).length;
 const totalStock = products.reduce((a,p)=>a+Number(p.stock || 0),0);
 const filtered = products
  .filter(p=>`${p.sku} ${p.name} ${p.category}`.toLowerCase().includes(q.toLowerCase()))
  .slice(0,5);

 return (
  <section className="panel stock-panel">
   <div className="stock-hero">
    <div>
     <span className="kicker">Inventory control</span>
     <h2>Stock & SKU management</h2>
     <p>Manage product availability, create SKUs and keep your storefront inventory updated.</p>
    </div>

    <div className="stock-actions">
     <button className="ghost" onClick={()=>setModal('stock')}>
      <Plus size={16}/> Add stock
     </button>
     <button className="primary" onClick={()=>setModal('create')}>
      <PackageCheck size={16}/> Create SKU
     </button>
    </div>
   </div>

   <div className="stock-stats">
    <div><small>Total SKUs</small><b>{products.length}</b></div>
    <div><small>Total units</small><b>{totalStock}</b></div>
    <div><small>Low stock</small><b>{lowStock}</b></div>
   </div>

   {msg && <div className="banner">{msg}</div>}

   <div className="stock-search">
    <Search size={16}/>
    <input
     placeholder="Search SKU, product or category..."
     value={q}
     onChange={e=>setQ(e.target.value)}
    />
   </div>

   <div className="mini-stock-list">
    {filtered.map(p=>
     <div className="mini-stock-row" key={p.id}>
      <img src={p.image_url} alt={p.name}/>
      <div>
       <b>{p.sku}</b>
       <span>{p.name}</span>
      </div>
      <em>{p.category}</em>
      <strong className={Number(p.stock) < 15 ? 'low-stock' : ''}>
       {p.stock} units
      </strong>
     </div>
    )}
   </div>

   {modal==='create' && (
    <CreateSkuModal
     close={()=>setModal(null)}
     reload={reload}
     done={()=>{
      setMsg('SKU created successfully.');
      setModal(null);
     }}
    />
   )}

   {modal==='stock' && (
    <AddStockModal
     products={products}
     close={()=>setModal(null)}
     reload={reload}
     done={()=>{
      setMsg('Stock updated successfully.');
      setModal(null);
     }}
    />
   )}
  </section>
 );
}

function CreateSkuModal({close,reload,done}:{close:()=>void;reload:()=>void;done:()=>void}) {
const [form,setForm]=useState({
  sku:'',
  name:'',
  category:'Accessories',
  price:'29.90',
  stock:'10',
  description:'',
  image_url:'https://images.unsplash.com/photo...',
  accent:'#7c3aed'
});
 const [error,setError]=useState('');

 async function submit(e:React.FormEvent){
  e.preventDefault();
  setError('');

  try {
   await createProduct({
  sku: form.sku,
  name: form.name,
  category: form.category,
  price: Number(form.price),
  stock: Number(form.stock),
  description: form.description,
  image_url: form.image_url,
  accent: form.accent

});

   await reload();
   done();
  } catch(e:any) {
   setError(e.message);
  }
 }

 return (
  <div className="modal">
   <div className="product-modal sku-modal">
    <button className="x" onClick={close}>×</button>

    <div className="pd-info">
     <span className="kicker">Inventory</span>
     <h2>Create new SKU</h2>
     <p className="muted">Add a new product to the storefront and inventory.</p>

     <form className="form-grid" onSubmit={submit}>
      <label>SKU
       <input value={form.sku} onChange={e=>setForm({...form,sku:e.target.value})} required placeholder="SKU-LUNA-001"/>
      </label>

      <label>Product name
       <input value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required placeholder="Luna Crossbody Bag"/>
      </label>

      <label>Category
       <input value={form.category} onChange={e=>setForm({...form,category:e.target.value})} required/>
      </label>

      <label>Price
       <input type="number" step="0.01" value={form.price} onChange={e=>setForm({...form,price:e.target.value})} required/>
      </label>

      <label>Initial stock
       <input type="number" value={form.stock} onChange={e=>setForm({...form,stock:e.target.value})} required/>
      </label>
<label>Description
  <textarea
    value={form.description}
    onChange={e=>setForm({...form,description:e.target.value})}
    placeholder="Short product description..."
    required
  />
</label>
      <label>Image URL
       <input value={form.image_url} onChange={e=>setForm({...form,image_url:e.target.value})} required/>
      </label>

      <label>Accent color
       <input value={form.accent} onChange={e=>setForm({...form,accent:e.target.value})}/>
      </label>

      {error && <p className="error">{error}</p>}

      <button className="primary wide" type="submit">Create SKU</button>
     </form>
    </div>
   </div>
  </div>
 );
}

function AddStockModal({products,close,reload,done}:{products:Product[];close:()=>void;reload:()=>void;done:()=>void}) {
 const [selected,setSelected]=useState('');
 const [qty,setQty]=useState('10');
 const [error,setError]=useState('');

 async function submit(e:React.FormEvent){
  e.preventDefault();
  setError('');

  try {
   await adjustStock(selected, Number(qty));
   await reload();
   done();
  } catch(e:any) {
   setError(e.message);
  }
 }

 return (
  <div className="modal">
   <div className="product-modal">
    <button className="x" onClick={close}>×</button>

    <div className="pd-info">
     <span className="kicker">Inventory</span>
     <h2>Add stock</h2>
     <p className="muted">Select an existing SKU and increase available stock.</p>

     <form className="form-grid" onSubmit={submit}>
      <label>Product / SKU
       <select value={selected} onChange={e=>setSelected(e.target.value)} required>
        <option value="">Select product</option>
        {products.map(p=>
         <option key={p.id} value={p.id}>
          {p.sku} — {p.name} | Current stock: {p.stock}
         </option>
        )}
       </select>
      </label>

      <label>Quantity to add
       <input type="number" value={qty} onChange={e=>setQty(e.target.value)} required/>
      </label>

      {error && <p className="error">{error}</p>}

      <button className="primary wide" type="submit">Update stock</button>
     </form>
    </div>
   </div>
  </div>
 );
}

function fulfillmentOf(order: Order): Status {
  return (order.fulfillment_status || order.status) as Status;
}

function canChangeStatus(order: Order, next: Status) {
  const current = fulfillmentOf(order);

  if (current === 'CANCELLED') return false;

  if (next === current) return true;

  if (next === 'CANCELLED') {
    return ['PAID','PROCESSING','PACKED'].includes(current);
  }

  if (current === 'DELIVERED') {
    return false;
  }

  if (next === 'SHIPPED') {
    return (
      current === 'PACKED' &&
      !!order.carrier &&
      !!order.tracking_number
    );
  }

  if (next === 'DELIVERED') {
    return current === 'SHIPPED';
  }

  const flow: Status[] = ['PAID','PROCESSING','PACKED','SHIPPED','DELIVERED'];

  return flow.indexOf(next) === flow.indexOf(current) + 1;
}

function CustomersManager({
  customers,
  orders,
  returns,
  openOrder
}:{
  customers:any[];
  orders:Order[];
  returns:ReturnRow[];
  openOrder:(order:Order)=>void;
}) {
 const [q,setQ]=useState('');
 const [selected,setSelected]=useState<any|null>(null);

 const groupedCustomers = Object.values(
  customers.reduce((acc:any, c:any) => {
    const key = String(c.email || '').trim().toLowerCase();

    if (!acc[key]) {
      acc[key] = {
        ...c,
        ids: [c.id],
      };
    } else {
      acc[key].ids.push(c.id);
    }

    return acc;
  }, {})
);

const customerStats = groupedCustomers.map((c:any)=>{
  const customerOrders = orders.filter(o =>
    c.ids.includes(o.customer_id) ||
    c.ids.includes(o.customer?.id)
  );

  const customerReturns = returns.filter(r =>
    customerOrders.some(o=>o.id === r.order_id)
  );

  const lifetimeValue = customerOrders
    .filter(o=>fulfillmentOf(o) !== 'CANCELLED')
    .reduce((a,o)=>a + Math.max(Number(o.total || 0) - Number(o.refunded_amount || 0),0),0);

  const lastOrder = customerOrders[0];

  return {
    ...c,
    orders_count: customerOrders.length,
    returns_count: customerReturns.length,
    lifetime_value: lifetimeValue,
    last_order_at: lastOrder?.created_at || null
  };
});

 const filtered = customerStats.filter(c =>
  `${c.name} ${c.email} ${c.phone} ${c.city}`
   .toLowerCase()
   .includes(q.toLowerCase())
 );

 return <section className="panel customers-panel">
  <div className="table-head">
   <div>
    <h2>Customers</h2>
    <p className="muted">Customer profiles, order history and lifetime value.</p>
   </div>

   <div className="search">
    <Search size={16}/>
    <input
     placeholder="Search customers..."
     value={q}
     onChange={e=>setQ(e.target.value)}
    />
   </div>
  </div>

  <div className="customer-list">
   {filtered.map(c=>
    <button
     key={c.id}
     className="customer-card"
     onClick={()=>setSelected(c)}
    >
     <div className="customer-avatar">
      {String(c.name || '?').slice(0,1).toUpperCase()}
     </div>

     <div>
      <b>{c.name}</b>
      <span>{c.email}</span>
     </div>

     <em>{c.city || '-'}</em>

     <strong>{money(c.lifetime_value)}</strong>

     <small>{c.orders_count} orders · {c.returns_count} returns</small>
    </button>
   )}
  </div>

  {selected && (
<CustomerDrawer
  customer={selected}
  orders={orders.filter(o =>
    selected.ids.includes(o.customer_id) ||
    selected.ids.includes(o.customer?.id)
  )}
  returns={returns}
  close={()=>setSelected(null)}
  openOrder={(order)=>{
    setSelected(null);
    openOrder(order);
  }}
/>
  )}
 </section>
}
function CustomerDrawer({
  customer,
  orders,
  returns,
  close,
  openOrder
}:{
  customer:any;
  orders:Order[];
  returns:ReturnRow[];
  close:()=>void;
  openOrder:(order:Order)=>void;
}) {
 const customerReturns = returns.filter(r=>orders.some(o=>o.id === r.order_id));
 const lifetimeValue = orders
  .filter(o=>fulfillmentOf(o) !== 'CANCELLED' && o.return_status !== 'RETURN_RECEIVED')
  .reduce((a,o)=>a + Math.max(Number(o.total || 0) - Number(o.refunded_amount || 0),0),0);

 return <div className="drawer">
  <button className="x" onClick={close}>×</button>

  <div className="customer-profile">
   <div className="customer-avatar large">
    {String(customer.name || '?').slice(0,1).toUpperCase()}
   </div>

   <h2>{customer.name}</h2>
   <p>{customer.email}</p>
  </div>

  <h3>Customer details</h3>
  <div className="line"><span>Phone</span><b>{customer.phone || '-'}</b></div>
  <div className="line"><span>City</span><b>{customer.city || '-'}</b></div>
  <div className="line"><span>Orders</span><b>{orders.length}</b></div>
  <div className="line"><span>Returns</span><b>{customerReturns.length}</b></div>
  <div className="line total-line"><span>Lifetime value</span><b>{money(lifetimeValue)}</b></div>

  <h3>Order history</h3>
{orders.map(o=>
  <div className="customer-order-row" key={o.id}>
    <div>
      <button
        className="order-link"
        onClick={()=>{
          openOrder(o);
        }}
      >
        {o.order_no}
      </button>

      <span>{new Date(o.created_at).toLocaleString()}</span>
    </div>

    <em className={statusClass(fulfillmentOf(o))}>
      {fulfillmentOf(o)}
    </em>

    <strong>{money(Math.max(Number(o.total || 0) - Number(o.refunded_amount || 0),0))}</strong>
  </div>
)}
  {!orders.length && (
   <div className="empty-state">No orders for this customer.</div>
  )}
 </div>
}


function Admin({
  orders,
  products,
  returns,
  logs,
  discounts,
  customers,
  reload,
  loading
}:{
  orders:Order[];
  products:Product[];
  returns:ReturnRow[];
  logs:any[];
  discounts:any[];
  customers:any[];
  reload:()=>void;
  loading:boolean;
}){
 const [q,setQ]=useState(''); const [selected,setSelected]=useState<Order|null>(null);
 const [page,setPage]=useState(1);
 const [returnsPage,setReturnsPage]=useState(1);
const [logsPage,setLogsPage]=useState(1);
const [returning,setReturning]=useState<Order|null>(null);
const [returnReason,setReturnReason]=useState('');
const [refunding,setRefunding]=useState<{order:Order; returnId?:string}|null>(null);
const [refundAmount,setRefundAmount]=useState('');
const [refundReason,setRefundReason]=useState('');
const [orderView,setOrderView] =
  useState('ALL');

const RETURNS_PER_PAGE = 6;
const LOGS_PER_PAGE = 8;

const totalReturnsPages = Math.ceil(returns.length / RETURNS_PER_PAGE);
const paginatedReturns = returns.slice(
  (returnsPage - 1) * RETURNS_PER_PAGE,
  returnsPage * RETURNS_PER_PAGE
);

const totalLogsPages = Math.ceil(logs.length / LOGS_PER_PAGE);
const paginatedLogs = logs.slice(
  (logsPage - 1) * LOGS_PER_PAGE,
  logsPage * LOGS_PER_PAGE
);

const [section,setSection] = useState<'dashboard'|'orders'|'inventory'|'returns'|'discounts'|'customers'|'audit'>('dashboard');


let visibleOrders = orders;

switch(orderView){
  case 'OPEN':
    visibleOrders = orders.filter(o =>
      !['DELIVERED','CANCELLED'].includes(fulfillmentOf(o))
    );
    break;

  case 'READY_TO_SHIP':
    visibleOrders = orders.filter(o =>
      fulfillmentOf(o) === 'PACKED' && !!o.carrier && !!o.tracking_number
    );
    break;

  case 'TRACKING_REQUIRED':
    visibleOrders = orders.filter(o =>
      fulfillmentOf(o) === 'PACKED' && (!o.carrier || !o.tracking_number)
    );
    break;

  case 'DELIVERED':
    visibleOrders = orders.filter(o => fulfillmentOf(o) === 'DELIVERED');
    break;

  case 'CANCELLED':
    visibleOrders = orders.filter(o => fulfillmentOf(o) === 'CANCELLED');
    break;

  default:
    visibleOrders = orders;
}

const filtered = visibleOrders.filter(o =>
  `${o.order_no} ${o.customer?.name} ${o.customer?.email} ${o.shipping_address} ${fulfillmentOf(o)} ${o.financial_status || ''} ${o.return_status || ''}`
    .toLowerCase()
    .includes(q.toLowerCase())
);

const PER_PAGE = 10;

const totalPages = Math.ceil(filtered.length / PER_PAGE);

const paginated = filtered.slice(
 (page - 1) * PER_PAGE,
 page * PER_PAGE
);
 const revenueStatuses: Status[] = [
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED'
];

const dashboardOrders = orders.filter(
  o =>
    fulfillmentOf(o) !== 'CANCELLED' &&
    o.return_status !== 'RETURN_RECEIVED'
);

const revenueOrders = dashboardOrders;

const revenue = revenueOrders.reduce(
  (a,o)=>a + Math.max(
    Number(o.total || 0) - Number(o.refunded_amount || 0),
    0
  ),
  0
);

const low = products.filter(
  p=>p.stock<15
).length;

const chart = useMemo(()=>

  revenueOrders
    .slice()
    .reverse()
    .map((o,i)=>({
      name:o.order_no || `#${i+1}`,
      revenue:Math.max(Number(o.total || 0) - Number(o.refunded_amount || 0),0),
      orders:i+1
    })),


[revenueOrders]);
function DiscountsManager({discounts,products,reload}:{discounts:any[];products:Product[];reload:()=>void}) {
 const [modal,setModal]=useState(false);
 const activeCount = discounts.filter(d=>d.active && (!d.expires_at || new Date(d.expires_at) > new Date())).length;
 const expiredCount = discounts.filter(d=>d.expires_at && new Date(d.expires_at) < new Date()).length;

 return <section className="panel discounts-panel">
  <div className="table-head">
   <div>
    <h2>Discounts</h2>
    <p className="muted">Create and manage Shopify-style coupon codes.</p>
   </div>

   <button className="primary" onClick={()=>setModal(true)}>
    <Plus size={16}/> Create discount
   </button>
  </div>

  <div className="stock-stats">
   <div><small>Total discounts</small><b>{discounts.length}</b></div>
   <div><small>Active</small><b>{activeCount}</b></div>
   <div><small>Expired</small><b>{expiredCount}</b></div>
  </div>

  <div className="discount-list">
   {discounts.map(d=>{
    const expired = d.expires_at && new Date(d.expires_at) < new Date();
    const status = !d.active ? 'Inactive' : expired ? 'Expired' : 'Active';

    return <div className="discount-card">

  <div>
    <b>{d.code}</b>
    <span>{d.title}</span>
  </div>

  <em>
    {d.type === 'PERCENTAGE'
      ? `${d.value}%`
      : money(Number(d.value))}
  </em>

  <span>
    {d.level === 'ORDER'
      ? 'Order level'
      : `Product: ${d.product?.sku || '-'}`}
  </span>

  <strong className={status.toLowerCase()}>
    {status}
  </strong>

  <small>
    {d.expires_at
      ? new Date(d.expires_at).toLocaleDateString()
      : 'No expiry'}
  </small>

  <button
    className={
      d.active
        ? 'discount-disable'
        : 'discount-enable'
    }
    onClick={async () => {

      if (!supabase) return;

      const { error } = await supabase
        .from('discounts')
        .update({
          active: !d.active
        })
        .eq('id', d.id);

      if(error){
        alert(error.message);
        return;
      }

      await reload();
    }}
  >
    {d.active ? 'Disable' : 'Enable'}
  </button>

</div>
   })}
  </div>

  {modal && (
   <CreateDiscountModal
    products={products}
    close={()=>setModal(false)}
    reload={reload}
   />
  )}
 </section>
}

function CreateDiscountModal({products,close,reload}:{products:Product[];close:()=>void;reload:()=>void}) {
 const [form,setForm]=useState({
  title:'',
  code:'',
  type:'PERCENTAGE',
  level:'ORDER',
  value:'10',
  product_id:'',
  minimum_order_amount:'0',
  active:true,
  expires_at:''
 });

 const [error,setError]=useState('');

 async function submit(e:React.FormEvent){
  e.preventDefault();
  setError('');

  try {
   await createDiscount({
    title: form.title,
    code: form.code.trim().toUpperCase(),
    type: form.type,
    level: form.level,
    value: Number(form.value),
    product_id: form.level === 'PRODUCT' ? form.product_id : null,
    minimum_order_amount: Number(form.minimum_order_amount || 0),
    active: form.active,
    expires_at: form.expires_at ? new Date(form.expires_at).toISOString() : null
   });

   await reload();
   close();
  } catch(e:any) {
   setError(e.message);
  }
 }

 return <div className="modal">
  <div className="product-modal sku-modal">
   <button className="x" onClick={close}>×</button>

   <div className="pd-info">
    <span className="kicker">Promotion</span>
    <h2>Create discount</h2>
    <p className="muted">Create order-level or product-level coupon codes.</p>

    <form className="form-grid" onSubmit={submit}>
     <label>Title
      <input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="Summer Sale" required/>
     </label>

     <label>Code
      <input value={form.code} onChange={e=>setForm({...form,code:e.target.value.toUpperCase()})} placeholder="SUMMER20" required/>
     </label>

     <label>Type
      <select value={form.type} onChange={e=>setForm({...form,type:e.target.value})}>
       <option value="PERCENTAGE">Percentage</option>
       <option value="FIXED">Fixed amount</option>
      </select>
     </label>

     <label>Value
      <input type="number" step="0.01" value={form.value} onChange={e=>setForm({...form,value:e.target.value})} required/>
     </label>

     <label>Scope
      <select value={form.level} onChange={e=>setForm({...form,level:e.target.value})}>
       <option value="ORDER">Entire order</option>
       <option value="PRODUCT">Specific product</option>
      </select>
     </label>

     {form.level === 'PRODUCT' && (
      <label>Product
       <select value={form.product_id} onChange={e=>setForm({...form,product_id:e.target.value})} required>
        <option value="">Select product</option>
        {products.map(p=>
         <option key={p.id} value={p.id}>
          {p.sku} — {p.name}
         </option>
        )}
       </select>
      </label>
     )}

     <label>Minimum order amount
      <input type="number" step="0.01" value={form.minimum_order_amount} onChange={e=>setForm({...form,minimum_order_amount:e.target.value})}/>
     </label>

     <label>Expires at
      <input type="date" value={form.expires_at} onChange={e=>setForm({...form,expires_at:e.target.value})}/>
     </label>

     <label className="checkbox-line">
      <input type="checkbox" checked={form.active} onChange={e=>setForm({...form,active:e.target.checked})}/>
      Active discount
     </label>

     {error && <p className="error">{error}</p>}

     <button className="primary wide" type="submit">
      Create discount
     </button>
    </form>
   </div>
  </div>
 </div>
}
 async function restoreStockForOrder(order:Order){
  if(!supabase) return;
  if(order.stock_restored) return;

  const items = order.order_items || [];

  for (const item of items) {
    await adjustStock(item.product_id, Number(item.qty));
  }

  await supabase
    .from('orders')
    .update({
      stock_restored: true
    })
    .eq('id', order.id);

  await supabase
    .from('audit_logs')
    .insert({
      order_id: order.id,
      event: 'STOCK_RESTORED',
      actor: 'admin',
      metadata: {
        reason: fulfillmentOf(order) === 'CANCELLED'
          ? 'Order cancelled'
          : 'Return received'
      }
    });
 }

 async function status(o:Order,s:Status){
  await updateStatus(o.id,s);

  if(s === 'CANCELLED'){
    await restoreStockForOrder({
      ...o,
      fulfillment_status: 'CANCELLED',
      status: 'CANCELLED'
    });
  }

  await reload();
}

 function remainingRefund(order:Order){
  return Math.max(
    Number(order.total || 0) - Number(order.refunded_amount || 0),
    0
  );
 }

 function canIssueRefund(order:Order){
  return (
    fulfillmentOf(order) !== 'CANCELLED' &&
    order.financial_status !== 'REFUNDED' &&
    remainingRefund(order) > 0
  );
 }

 function openRefund(order:Order, returnId?:string){
  setRefunding({order,returnId});
  setRefundAmount(String(remainingRefund(order)));
  setRefundReason(returnId ? 'Refund for approved return' : 'Manual goodwill refund');
 }

 async function updateReturnStatus(returnId:string, nextReturnStatus:'RETURN_APPROVED'|'RETURN_RECEIVED'|'RETURN_REJECTED'){
  const returnRow = returns.find(r=>r.id===returnId);
  const order = orders.find(o=>o.id===returnRow?.order_id);

  if(!supabase || !order) return;

  const fulfillment = fulfillmentOf(order);

  await supabase
    .from('orders')
    .update({
      status: fulfillment,
      fulfillment_status: fulfillment,
      return_status: nextReturnStatus
    })
    .eq('id', order.id);

  await supabase
    .from('returns')
    .update({
      status:
        nextReturnStatus === 'RETURN_APPROVED' ? 'APPROVED' :
        nextReturnStatus === 'RETURN_RECEIVED' ? 'RECEIVED' :
        'REJECTED'
    })
    .eq('id', returnId);

  await supabase
    .from('audit_logs')
    .insert({
      order_id: order.id,
      event: nextReturnStatus,
      actor: 'admin',
      metadata: {
        return_id: returnId,
        reason: returnRow?.reason || null
      }
    });

  if(nextReturnStatus === 'RETURN_RECEIVED'){
    await restoreStockForOrder({
      ...order,
      return_status: 'RETURN_RECEIVED'
    });
  }

  await reload();
 }

 async function submitRefund(){
  if(!supabase || !refunding) return;

  const order = refunding.order;
  const amount = Number(refundAmount);
  const remaining = remainingRefund(order);

  if(!amount || amount <= 0 || amount > remaining){
    alert(`Refund amount must be between €0.01 and ${money(remaining)}.`);
    return;
  }

  const newRefundedAmount = Number(order.refunded_amount || 0) + amount;
  const total = Number(order.total || 0);

  const financialStatus =
    newRefundedAmount < total
      ? 'PARTIALLY_REFUNDED'
      : 'REFUNDED';

  const fulfillment = fulfillmentOf(order);

  if(refunding.returnId){
    await approveRefund(refunding.returnId);

    await supabase
      .from('returns')
      .update({
        status: 'REFUNDED'
      })
      .eq('id', refunding.returnId);
  }

  await supabase
    .from('orders')
    .update({
      status: fulfillment,
      fulfillment_status: fulfillment,
      financial_status: financialStatus,
      refunded_amount: newRefundedAmount,
      return_status: refunding.returnId
        ? 'RETURN_APPROVED'
        : order.return_status || null
    })
    .eq('id', order.id);

  await supabase
    .from('audit_logs')
    .insert({
      order_id: order.id,
      event: financialStatus,
      actor: 'admin',
      metadata: {
        amount,
        total_refunded: newRefundedAmount,
        reason: refundReason,
        return_id: refunding.returnId || null
      }
    });

  await reload();

  setRefunding(null);
  setRefundAmount('');
  setRefundReason('');
 }
 const activeCustomers = new Set(
  orders
    .map(o => o.customer?.email)
    .filter(Boolean)
).size;

const aov =
  dashboardOrders.length
    ? revenue / dashboardOrders.length
    : 0;

const returnRate =
  dashboardOrders.length
    ? (dashboardOrders.filter(o => !!o.return_status).length / dashboardOrders.length) * 100
    : 0;

const activeDiscounts = discounts.filter(
  d =>
    d.active &&
    (!d.expires_at || new Date(d.expires_at) > new Date())
).length;

 return <main className="admin-layout">

  <aside className="sidebar">

    <div className="sidebar-brand">
      Admin panel
    </div>

    <button
      className={section==='dashboard'?'active':''}
      onClick={()=>setSection('dashboard')}
    >
      Dashboard
    </button>

    <button
      className={section==='orders'?'active':''}
      onClick={()=>setSection('orders')}
    >
      Orders
    </button>

<button
  className={section==='customers'?'active':''}
  onClick={()=>setSection('customers')}
>
  Customers
</button>

    <button
  className={section==='discounts'?'active':''}
  onClick={()=>setSection('discounts')}
>
  Discounts
</button>

    <button
      className={section==='inventory'?'active':''}
      onClick={()=>setSection('inventory')}
    >
      Inventory
    </button>

    <button
      className={section==='returns'?'active':''}
      onClick={()=>setSection('returns')}
    >
      Returns
    </button>

    <button
      className={section==='audit'?'active':''}
      onClick={()=>setSection('audit')}
    >
      Audit Logs
    </button>

  </aside>

  <section className="admin">

    {section==='dashboard' && (
      <>

        <section className="dash-hero">
          <div>
            <div className="eyebrow">
              <Zap size={16}/> Private operations
            </div>

            <h1>Operations dashboard</h1>

            <p>
              Orders, inventory, returns, audit logs and analytics powered by Supabase.
            </p>
          </div>

          <button onClick={reload} className="primary">
            <RefreshCcw size={17}/>
            {loading?'Loading':'Refresh'}
          </button>
        </section>

        <div className="kpis">
  <K icon={<CircleDollarSign/>} label="Revenue" value={money(revenue)}/>

  <K icon={<ClipboardList/>} label="Orders" value={dashboardOrders.length}/>

  <K icon={<CircleDollarSign/>} label="AOV" value={money(aov)}/>

  <K icon={<PackageCheck/>} label="Return Rate" value={`${returnRate.toFixed(1)}%`}/>

  <K icon={<Boxes/>} label="Products" value={products.length}/>

  <K icon={<ShieldCheck/>} label="Customers" value={activeCustomers}/>

  <K icon={<Zap/>} label="Active Discounts" value={activeDiscounts}/>

  <K icon={<PackageCheck/>} label="Low Stock" value={low}/>
</div>

        <div className="panels">

          <section className="panel big">
            <h2>
              <BarChart3/> Sales pulse
            </h2>

            <ResponsiveContainer width="100%" height={230}>
              <LineChart data={chart}>
                <XAxis dataKey="name"/>
                <YAxis/>
                <Tooltip/>
                <Line type="monotone" dataKey="revenue" strokeWidth={3}/>
              </LineChart>
            </ResponsiveContainer>
          </section>

          <section className="panel">
            <h2>
              <Truck/> Inventory
            </h2>

            <ResponsiveContainer width="100%" height={230}>
              <BarChart data={products}>
                <XAxis dataKey="sku"/>
                <Tooltip/>
                <Bar dataKey="stock"/>
              </BarChart>
            </ResponsiveContainer>
          </section>

        </div>

      </>
    )}

    {section==='orders' && (
      <section className="panel">

       <div className="table-head orders-head">

  <h2>Orders</h2>

  <div className="orders-toolbar">
  <div className="search">
      <Search size={16}/>
      <input
        placeholder="Search orders, customers, address, status..."
        value={q}
        onChange={e=>setQ(e.target.value)}
      />
      <Filter size={16}/>
    </div>
    <div className="order-tabs">
      <button className={orderView==='ALL'?'active':''} onClick={()=>setOrderView('ALL')}>All</button>
      <button className={orderView==='OPEN'?'active':''} onClick={()=>setOrderView('OPEN')}>Open</button>
      <button className={orderView==='READY_TO_SHIP'?'active':''} onClick={()=>setOrderView('READY_TO_SHIP')}>Ready To Ship</button>
      <button className={orderView==='DELIVERED'?'active':''} onClick={()=>setOrderView('DELIVERED')}>Delivered</button>
      <button className={orderView==='CANCELLED'?'active':''} onClick={()=>setOrderView('CANCELLED')}>Cancelled</button>
    </div>

  

  </div>

</div>

        <table>

          <thead>
            <tr>
              <th>Order</th>
              <th>Customer</th>
              <th>Address</th>
              <th>Status</th>
              <th>Total</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>

            {paginated.map(o=>

              <tr key={o.id} onClick={()=>setSelected(o)}>

                <td>
   <b>{o.order_no}</b>

                  <small>{o.order_items?.length||0} items</small>
                </td>

                <td>
                  {o.customer?.name}
                  <small>{o.customer?.email}</small>
                </td>

                <td>
                  {o.shipping_address || '-'}
                  <small>{o.notes || ''}</small>
                </td>

                <td>
                  <div className="status-stack">
                    <span className={statusClass(fulfillmentOf(o))}>
                      {fulfillmentOf(o)}
                    </span>

                    {o.financial_status && o.financial_status !== 'PAID' && (
                      <span className={statusClass(o.financial_status)}>
                        {o.financial_status}
                      </span>
                    )}

                    {o.return_status && (
                      <span className={statusClass(o.return_status)}>
                        {o.return_status}
                      </span>
                    )}
                  </div>
                </td>

                <td>
  {money(
    Math.max(
      Number(o.total || 0) - Number(o.refunded_amount || 0),
      0
    )
  )}

  {Number(o.refunded_amount || 0) > 0 && (
    <small>
      Refunded {money(Number(o.refunded_amount))}
    </small>
  )}
</td>

                <td>
                  {new Date(o.created_at).toLocaleString()}
                </td>

                <td>

                  <select
  value={fulfillmentOf(o)}
  disabled={fulfillmentOf(o) === 'CANCELLED'}
  onChange={e=>{
    const next = e.target.value as Status;

    if (!canChangeStatus(o, next)) {
      return;
    }

    status(o,next);
  }}
  onClick={e=>e.stopPropagation()}
>
  {statuses.map(s => {
    const disabled = !canChangeStatus(o, s);

    const shippingLocked =
      s === 'SHIPPED' &&
      (!o.carrier || !o.tracking_number);

    return (
      <option
        key={s}
        value={s}
        disabled={disabled}
      >
        {shippingLocked
          ? 'SHIPPED (tracking required)'
          : s}
      </option>
    );
  })}
</select>
{/* {!o.carrier || !o.tracking_number ? (
  <small className="status-hint">
    Add carrier and tracking number to enable SHIPPED.
  </small>
) : null} */}
                  <button
  disabled={fulfillmentOf(o) !== 'DELIVERED' || !!o.return_status}
  onClick={(e)=>{
    e.stopPropagation();

    if (fulfillmentOf(o) !== 'DELIVERED' || o.return_status) return;

    setReturning(o);
  }}
>
  Return
</button>

                  {canIssueRefund(o) && (
                    <button
                      onClick={(e)=>{
                        e.stopPropagation();
                        openRefund(o);
                      }}
                    >
                      Refund
                    </button>
                  )}

                </td>

              </tr>

            )}

          </tbody>

        </table>

        <div className="pagination">

          <button
            disabled={page===1}
            onClick={()=>setPage(p=>p-1)}
          >
            Previous
          </button>

          <span>
            Page {page} / {totalPages || 1}
          </span>

          <button
            disabled={page===totalPages || totalPages===0}
            onClick={()=>setPage(p=>p+1)}
          >
            Next
          </button>

        </div>

      </section>
    )}
    {section==='customers' && (
  <CustomersManager
  customers={customers}
  orders={orders}
  returns={returns}
  openOrder={(order)=>{
    setSection('orders');
    setSelected(order);
  }}
/>
)}

    {section==='inventory' && (
      <InventoryManager
        products={products}
        reload={reload}
      />
    )}

    {section==='returns' && (
      <section className="panel">

        <h2>Returns</h2>

        {paginatedReturns.map(r=>{
          const order = orders.find(o=>o.id===r.order_id);
          const returnStatus = order?.return_status || 'RETURN_REQUESTED';

          return (
            <div className="return" key={r.id}>

              <div>
                <b>{order?.order_no || 'Unknown order'}</b>
                <small>{order?.customer?.name}</small>
              </div>

              <span>{r.reason}</span>

              <b>{money(Number(r.amount))}</b>

              <div className="status-stack">
                <em className={statusClass(returnStatus)}>
                  {returnStatus}
                </em>

                {order?.financial_status && order.financial_status !== 'PAID' && (
                  <em className={statusClass(order.financial_status)}>
                    {order.financial_status}
                  </em>
                )}
              </div>

              <div className="return-actions">
                {returnStatus === 'RETURN_REQUESTED' && (
                  <>
                    <button onClick={()=>updateReturnStatus(r.id,'RETURN_APPROVED')}>
                      Approve return
                    </button>

                    <button
                      className="danger-soft"
                      onClick={()=>updateReturnStatus(r.id,'RETURN_REJECTED')}
                    >
                      Reject
                    </button>
                  </>
                )}

                {returnStatus === 'RETURN_APPROVED' && (
                  <button onClick={()=>updateReturnStatus(r.id,'RETURN_RECEIVED')}>
                    Mark received
                  </button>
                )}

                {order && canIssueRefund(order) && returnStatus !== 'RETURN_REJECTED' && (
                  <button
                    className="primary"
                    onClick={()=>openRefund(order,r.id)}
                  >
                    Refund
                  </button>
                )}
              </div>

            </div>
          )
        })}

        <div className="pagination">
          <button disabled={returnsPage===1} onClick={()=>setReturnsPage(p=>p-1)}>
            Previous
          </button>

          <span>
            Page {returnsPage} / {totalReturnsPages || 1}
          </span>

          <button disabled={returnsPage===totalReturnsPages || totalReturnsPages===0} onClick={()=>setReturnsPage(p=>p+1)}>
            Next
          </button>
        </div>
      </section>
    )}
{section==='discounts' && (
  <DiscountsManager
    discounts={discounts}
    products={products}
    reload={reload}
  />
)}
    {section==='audit' && (
      <section className="panel">

        <h2>Audit stream</h2>

        <div className="audit">

         {paginatedLogs.map(l=>{

 const order = orders.find(o=>o.id===l.order_id);

 return (
  <div key={l.id}>

    <b>
      {l.event}
    </b>

    <small>
      {order?.order_no || 'No order'}
      {' · '}
      {order?.customer?.name || 'Unknown customer'}
    </small>

    <span>
      {l.actor}
      {' · '}
      {new Date(l.created_at).toLocaleString()}
    </span>

  </div>
 )
})}
        </div>
<div className="pagination">
  <button disabled={logsPage===1} onClick={()=>setLogsPage(p=>p-1)}>
    Previous
  </button>

  <span>
    Page {logsPage} / {totalLogsPages || 1}
  </span>

  <button disabled={logsPage===totalLogsPages || totalLogsPages===0} onClick={()=>setLogsPage(p=>p+1)}>
    Next
  </button>
</div>
      </section>
    )}
{returning && (
  <div className="modal">

    <div className="product-modal return-modal">

      <button
        className="x"
        onClick={()=>{
          setReturning(null);
          setReturnReason('');
        }}
      >
        ×
      </button>

      <div className="pd-info">

        <span className="kicker">
          Return request
        </span>

        <h2>
          {returning.order_no}
        </h2>

        <p>
          Submit a return/refund request for this order.
        </p>

        <div className="return-order-box">
          <b>{returning.customer?.name}</b>
          <span>{money(Number(returning.total))}</span>
        </div>

        <label className="full">
          Return reason

          <textarea
            value={returnReason}
            onChange={e=>setReturnReason(e.target.value)}
            placeholder="Customer changed mind, damaged item, wrong size..."
          />
        </label>

        <button
          className="primary wide"
          onClick={async()=>{

            if(!returnReason.trim()) return;

            await requestReturn(
              returning.id,
              returnReason
            );

            const fulfillment = fulfillmentOf(returning);

            if (supabase) {
              await supabase
                .from('orders')
                .update({
                  status: fulfillment,
                  fulfillment_status: fulfillment,
                  return_status: 'RETURN_REQUESTED'
                })
                .eq('id', returning.id);

              await supabase
                .from('audit_logs')
                .insert({
                  order_id: returning.id,
                  event: 'RETURN_REQUESTED',
                  actor: 'admin',
                  metadata: {
                    reason: returnReason
                  }
                });
            }

            await reload();

            setReturning(null);
            setReturnReason('');
          }}
        >
          Submit return request
        </button>

      </div>

    </div>

  </div>
)}
{refunding && (
  <div className="modal">

    <div className="product-modal return-modal">

      <button
        className="x"
        onClick={()=>{
          setRefunding(null);
          setRefundAmount('');
          setRefundReason('');
        }}
      >
        ×
      </button>

      <div className="pd-info">

        <span className="kicker">
          Refund
        </span>

        <h2>
          {refunding.order.order_no}
        </h2>

        <p>
          Issue a full or partial refund. This does not change fulfillment status.
        </p>

        <div className="return-order-box">
          <b>{refunding.order.customer?.name}</b>
          <span>
            Remaining refundable: {money(remainingRefund(refunding.order))}
          </span>
        </div>

        <label className="full">
          Refund amount

          <input
            type="number"
            step="0.01"
            min="0"
            max={remainingRefund(refunding.order)}
            value={refundAmount}
            onChange={e=>setRefundAmount(e.target.value)}
          />
        </label>

        <label className="full">
          Refund reason

          <textarea
            value={refundReason}
            onChange={e=>setRefundReason(e.target.value)}
            placeholder="Wrong item, damaged item, goodwill compensation..."
          />
        </label>

        <button
          className="primary wide"
          onClick={submitRefund}
        >
          Issue refund
        </button>

      </div>

    </div>

  </div>
)}
    {selected&&(
     <OrderDrawer
      order={selected}
      logs={logs.filter(l=>l.order_id===selected.id)}
      close={()=>setSelected(null)}
      reload={reload}
    />
    )}

  </section>

</main>
}
function K({icon,label,value}:{icon:any;label:string;value:any}){return <div className="kpi"><span>{icon}</span><small>{label}</small><b>{value}</b></div>}
function OrderDrawer({
  order,
  logs,
  close,
  reload
}:{
  order:Order;
  logs:any[];
  close:()=>void;
  reload:()=>void;
}){
  const [carrier,setCarrier]=useState(order.carrier || '');
const [tracking,setTracking]=useState(order.tracking_number || '');
const [trackingMsg,setTrackingMsg]=useState('');

const [editingTracking,setEditingTracking]=useState(
  !order.carrier || !order.tracking_number
);

useEffect(() => {
  setCarrier(order.carrier || '');
  setTracking(order.tracking_number || '');
  setTrackingMsg('');
  setEditingTracking(!order.carrier || !order.tracking_number);
}, [order.id, order.carrier, order.tracking_number]);

const hasTracking =
  !!carrier &&
  !!tracking &&
  !editingTracking;

 return <div className="drawer">
  <button className="x" onClick={close}>×</button>

  <h2>{order.order_no}</h2>

  <div className="status-stack drawer-statuses">
    <span className={statusClass(fulfillmentOf(order))}>
      {fulfillmentOf(order)}
    </span>

    {order.financial_status && order.financial_status !== 'PAID' && (
      <span className={statusClass(order.financial_status)}>
        {order.financial_status}
      </span>
    )}

    {order.return_status && (
      <span className={statusClass(order.return_status)}>
        {order.return_status}
      </span>
    )}
  </div>
<h3>Order Summary</h3>

<div className="line">
  <span>Subtotal</span>
  <b>{money(Number(order.subtotal || 0))}</b>
</div>

{Number(order.discount_amount || 0) > 0 && (
  <div className="line discount-line">
    <span>
      Discount ({order.discount_code || 'Coupon'})
    </span>
    <b>
      -{money(Number(order.discount_amount))}
    </b>
  </div>
)}

<div className="line">
  <span>Shipping</span>
  <b>{money(Number(order.shipping || 0))}</b>
</div>

{Number(order.refunded_amount || 0) > 0 && (
  <div className="line refund-line">
    <span>Refunded</span>
    <b>-{money(Number(order.refunded_amount || 0))}</b>
  </div>
)}

<div className="line total-line">
  <span>Net total</span>
  <b>
    {money(
      Math.max(
        Number(order.total || 0) - Number(order.refunded_amount || 0),
        0
      )
    )}
  </b>
</div>

  <h3>Customer</h3>
  <div className="line"><span>Name</span><b>{order.customer?.name || '-'}</b></div>
  <div className="line"><span>Email</span><b>{order.customer?.email || '-'}</b></div>
  <div className="line"><span>Address</span><b>{order.shipping_address || '-'}</b></div>
  <div className="line"><span>Notes</span><b>{order.notes || '-'}</b></div>

  <h3>Discount</h3>
<div className="line"><span>Code</span><b>{order.discount_code || '-'}</b></div>
<div className="line"><span>Amount</span><b>{money(Number(order.discount_amount || 0))}</b></div>

  <h3>Items</h3>
  {order.order_items?.map(i=>
    <div className="line" key={i.id}>
      <span>{i.qty}× {i.name}</span>
      <b>{money(Number(i.line_total))}</b>
    </div>
  )}
<h3>Shipping & Tracking</h3>

{hasTracking ? (
  <div className="tracking-info">

    <div className="line">
      <span>Carrier</span>
      <b>{carrier}</b>
    </div>

    <div className="line">
      <span>Tracking Number</span>
      <b>{tracking}</b>
    </div>

    <button
      className="ghost wide"
      onClick={()=>{
        setEditingTracking(true);
        setTrackingMsg('');
      }}
    >
      Edit tracking
    </button>

  </div>
) : (
  <div className="tracking-box">

    <label>
      Carrier
      <select value={carrier} onChange={e=>setCarrier(e.target.value)}>
        <option value="">Select carrier</option>
        <option value="DHL">DHL</option>
        <option value="ACS">ACS</option>
        <option value="ELTA Courier">ELTA Courier</option>
        <option value="UPS">UPS</option>
        <option value="FedEx">FedEx</option>
      </select>
    </label>

    <label>
      Tracking number
      <div className="tracking-row">
        <input
          value={tracking}
          onChange={e=>setTracking(e.target.value)}
          placeholder="Tracking number"
        />

        <button
          className="ghost"
          onClick={()=>{
            const prefix =
              carrier === 'DHL' ? 'DHL' :
              carrier === 'ACS' ? 'ACS' :
              carrier === 'UPS' ? '1Z' :
              carrier === 'FedEx' ? 'FDX' :
              carrier === 'ELTA Courier' ? 'ELTA' :
              'TRK';

            const number = Math.floor(1000000000 + Math.random() * 9000000000);

            setTracking(`${prefix}${number}`);
          }}
        >
          Generate
        </button>
      </div>
    </label>

   <button
  className="primary wide"
  onClick={async()=>{
    if(!carrier || !tracking) {
      setTrackingMsg('Please select carrier and tracking number.');
      return;
    }

    const updatedOrder = await updateTracking(
      order.id,
      carrier,
      tracking
    );

    console.log(updatedOrder);

    setTrackingMsg('Tracking saved.');
    setEditingTracking(false);

    

    await reload();
  }}
>
  Save tracking
</button>

    {trackingMsg && <p className="discount-success">{trackingMsg}</p>}
  </div>
)}

  <h3>Timeline</h3>
  <div className="timeline">
    {logs.map(l=>
      <div key={l.id}>
        <i></i>
        <b>
  {l.event === 'TRACKING_ASSIGNED'
    ? 'Tracking number assigned'
    : l.event}
</b>

{l.event === 'TRACKING_ASSIGNED' &&
 l.metadata?.tracking_number && (
  <small>
    {l.metadata.carrier}
    {' · '}
    {l.metadata.tracking_number}
  </small>
)}
        <span>{l.actor} · {new Date(l.created_at).toLocaleString()}</span>
      </div>
    )}
  </div>
 </div>
}


createRoot(document.getElementById('root')!).render(<App/>);
