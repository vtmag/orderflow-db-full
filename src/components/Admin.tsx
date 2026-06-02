import { useMemo, useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { BarChart3, Boxes, CircleDollarSign, ClipboardList, Filter, PackageCheck, Plus, RefreshCcw, Search, ShieldCheck, Truck, Zap } from 'lucide-react';
import { Bar, BarChart, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { supabase } from '../lib/supabase';
import type { Order, Product, ReturnRow, Status } from '../types';
import { adjustStock, approveRefund, createDiscount, requestReturn, updateStatus } from '../lib/api';
import { money, statusClass } from '../utils/format';
import { canChangeStatus, fulfillmentOf, statuses } from '../utils/orderStatus';
import { CustomersManager } from './CustomersManager';
import { InventoryManager } from './InventoryManager';
import { OrderDrawer } from './OrderDrawer';
import { K } from './K';

export function Admin({
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
  const navigate = useNavigate();
const { sectionParam, orderId } = useParams();
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

useEffect(()=>{
  if(!sectionParam){
    setSection('dashboard');
    return;
  }

  if(
    ['orders','inventory','returns','discounts','customers','audit']
      .includes(sectionParam)
  ){
    setSection(sectionParam as any);
  }
},[sectionParam]);


useEffect(()=>{
  if(!orderId || !orders.length) return;

 const found = orders.find(
  o => o.order_no === orderId
);

  if(found){
    setSection('orders');
    setSelected(found);
  }
},[orderId, orders]);

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
    <p className="muted">Create and manage coupon codes.</p>
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
  onClick={()=>navigate('/admin')}
>
  Dashboard
</button>

    <button
      className={section==='orders'?'active':''}
      onClick={()=>navigate('/admin/orders')}
    >
      Orders
    </button>

<button
  className={section==='customers'?'active':''}
  onClick={()=>navigate('/admin/customers')}
>
  Customers
</button>

    <button
  className={section==='discounts'?'active':''}
  onClick={()=>navigate('/admin/discounts')}
>
  Discounts
</button>

    <button
      className={section==='inventory'?'active':''}
      onClick={()=>navigate('/admin/inventory')}
    >
      Inventory
    </button>

    <button
      className={section==='returns'?'active':''}
      onClick={()=>navigate('/admin/returns')}
    >
      Returns
    </button>

    <button
      className={section==='audit'?'active':''}
      onClick={()=>navigate('/admin/audit')}
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

                      <tr
            key={o.id}
            onClick={()=>{
              setSelected(o);
             navigate(`/admin/orders/${o.order_no}`);
            }}
          >

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
  className="status-select"
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
  navigate(`/admin/orders/${order.order_no}`);
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
    close={()=>{
      setSelected(null);
      navigate('/admin/orders');
    }}
    reload={reload}
  />
)}

  </section>

</main>}
