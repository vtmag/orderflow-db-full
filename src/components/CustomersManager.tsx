import { useState } from 'react';
import { Search } from 'lucide-react';
import type { Order, ReturnRow } from '../types';
import { money } from '../utils/format';
import { CustomerDrawer } from './CustomerDrawer';
import { fulfillmentOf } from '../utils/orderStatus';

export function CustomersManager({
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