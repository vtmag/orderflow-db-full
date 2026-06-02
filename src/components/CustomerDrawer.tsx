import type { Order, ReturnRow } from '../types';
import { money, statusClass } from '../utils/format';
import { fulfillmentOf } from '../utils/orderStatus';

export function CustomerDrawer({
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

