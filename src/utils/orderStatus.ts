import type { Order, Status } from '../types';

export const statuses: Status[] = [
  'PAID',
  'PROCESSING',
  'PACKED',
  'SHIPPED',
  'DELIVERED',
  'CANCELLED'
];

export function fulfillmentOf(order: Order): Status {
  return (order.fulfillment_status || order.status) as Status;
}

export function canChangeStatus(order: Order, next: Status) {
  const current = fulfillmentOf(order);

  if (current === 'CANCELLED') return false;

  if (next === current) return true;

  if (next === 'CANCELLED') {
    return ['PAID','PROCESSING','PACKED'].includes(current);
  }

  if (current === 'DELIVERED') {
    return false;
  }

  if (next === 'SHIPPED') {
    return (
      current === 'PACKED' &&
      !!order.carrier &&
      !!order.tracking_number
    );
  }

  if (next === 'DELIVERED') {
    return current === 'SHIPPED';
  }

  const flow: Status[] = ['PAID','PROCESSING','PACKED','SHIPPED','DELIVERED'];

  return flow.indexOf(next) === flow.indexOf(current) + 1;
}
