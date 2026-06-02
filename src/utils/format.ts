export const money = (n:number) =>
  new Intl.NumberFormat('el-GR', {
    style: 'currency',
    currency: 'EUR'
  }).format(Number(n || 0));

export const statusClass = (s:string) =>
  `pill ${String(s).toLowerCase()}`;

export const ratingFor = (sku:string) =>
  4.4 + ((sku.charCodeAt(sku.length - 1) % 6) / 10);
