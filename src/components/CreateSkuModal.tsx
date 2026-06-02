import React, { useState } from 'react';
import { createProduct } from '../lib/api';

export function CreateSkuModal({close,reload,done}:{close:()=>void;reload:()=>void;done:()=>void}) {
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
