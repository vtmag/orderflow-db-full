import { useEffect, useState } from 'react';
import { Layers3, RefreshCcw, ShieldCheck } from 'lucide-react';
import { supabase } from './lib/supabase';
import type { CartItem, Order, Product, ReturnRow } from './types';
import { getAuditLogs, getCustomers, getDiscounts, getOrders, getProducts, getReturns, isSupabaseConfigured } from './lib/api';
import { Store } from './components/Store';
import { Admin } from './components/Admin';

export function App(){
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
