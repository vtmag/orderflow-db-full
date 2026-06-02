import { useState } from 'react';
import { PackageCheck, Plus, Search } from 'lucide-react';
import type { Product } from '../types';
import { CreateSkuModal } from './CreateSkuModal';
import { AddStockModal } from './AddStockModal';
import { archiveProductBySku, activateProductBySku } from '../lib/api';
import '../styles.css'
export function InventoryManager({products,reload}:{products:Product[];reload:()=>void}) {
 const [modal,setModal]=useState<'create'|'stock'|null>(null);
 const [msg,setMsg]=useState('');
 const [q,setQ]=useState('');
const [toast,setToast]=useState('');
 const lowStock = products.filter(p=>Number(p.stock) < 15).length;
 const totalStock = products.reduce((a,p)=>a+Number(p.stock || 0),0);
const filtered = products
  .filter(p =>
    `${p.sku} ${p.name} ${p.category}`
      .toLowerCase()
      .includes(q.toLowerCase())
  );

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
   {toast && (
  <div className="inventory-toast">
    {toast}
  </div>
)}

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

  <em className={p.active === false ? 'archived-label' : 'active-label'}>
    {p.active === false ? 'Archived' : 'Active'}
  </em>

  <strong className={Number(p.stock) < 15 ? 'low-stock' : ''}>
    {p.stock} units
  </strong>

  <button
   className={p.active === false ? 'sku-activate-btn' : 'sku-archive-btn'}
    
    onClick={async()=>{
         console.log('FULL PRODUCT:', p);
     if(p.active === false){
  await activateProductBySku(p.sku);
  setToast(`${p.sku} is active again and visible in storefront.`);
} else {
  await archiveProductBySku(p.sku);
  setToast(`${p.sku} archived and hidden from storefront.`);
}
      await reload();

      setTimeout(()=>{
        setToast('');
      }, 3500);
    }}
  >
    {p.active === false ? 'Activate' : 'Archive'}
  </button>
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
