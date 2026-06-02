import { Star } from 'lucide-react';
import type { Product } from '../types';
import { money, ratingFor } from '../utils/format';

export function ProductModal({product,close,add}:{product:Product;close:()=>void;add:(p:Product)=>void}){
 return <div className="modal"><div className="product-modal"><button className="x" onClick={close}>×</button><div className="pd-image"><img src={product.image_url} alt={product.name}/></div><div className="pd-info"><span className="kicker">{product.category}</span><h2>{product.name}</h2><div className="rating"><Star size={16}/><b>{ratingFor(product.sku).toFixed(1)}</b><em>Verified demo reviews</em></div>
 <p>
  {product.description || 'No description available.'}
</p>
 <div className="pd-meta"><div><small>SKU</small><b>{product.sku}</b></div><div><small>Stock</small><b>{product.stock}</b></div><div><small>Price</small><b>{money(product.price)}</b></div></div><button className="primary wide" onClick={()=>{add(product); close();}}>Add to cart</button></div></div></div>
}
