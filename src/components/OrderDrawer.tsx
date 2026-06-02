import { useEffect, useState } from 'react';
import type { Order } from '../types';
import { updateTracking } from '../lib/api';
import { money, statusClass } from '../utils/format';
import { fulfillmentOf } from '../utils/orderStatus';

export function OrderDrawer({
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
