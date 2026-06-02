import React, { useState } from 'react';
import type { Product } from '../types';
import { adjustStock } from '../lib/api';

export function AddStockModal({products,close,reload,done}:{products:Product[];close:()=>void;reload:()=>void;done:()=>void}) {
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
