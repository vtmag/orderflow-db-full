import { Heart, Star } from 'lucide-react';
import type { Product } from '../types';
import { money, ratingFor } from '../utils/format';

export function ProductCard({product,add,open}:{product:Product;add:(p:Product)=>void;open:()=>void}){
 const rating=ratingFor(product.sku);
 return <article className="product pro-card">
  <button className="heart"><Heart size={18}/></button>
  <div className="image-wrap" onClick={open}><img src={product.image_url} alt={product.name}/><span className="stock-badge">{product.stock < 15 ? 'Low stock' : 'In stock'}</span></div>
  <div className="product-info"><span style={{background:product.accent}}>{product.category}</span><h3 onClick={open}>{product.name}</h3><p>{product.sku}</p><div className="rating"><Star size={15}/><b>{rating.toFixed(1)}</b><em>({Math.floor(rating*37)} reviews)</em></div><footer><b>{money(product.price)}</b><button onClick={()=>add(product)}>Add to cart</button></footer></div>
 </article>
}
