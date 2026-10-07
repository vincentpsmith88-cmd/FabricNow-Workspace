// Product rows and CSV files for Shopify, WooCommerce and Jumia. Pure functions, no network.
export const PLATFORMS = {
  shopify: { name: 'Shopify', file: 'shopify-products.csv', push: true },
  woocommerce: { name: 'WooCommerce', file: 'woocommerce-products.csv', push: true },
  jumia: { name: 'Jumia', file: 'jumia-products.csv', push: false },
};

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const slugify = (s) => String(s || 'product').toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'product';

function flatten(obj, prefix = '', out = []) {
  if (!obj || typeof obj !== 'object') return out;
  for (const [k, v] of Object.entries(obj)) {
    const label = `${prefix}${prefix ? ' ' : ''}${k}`.replace(/[_-]+/g, ' ');
    if (v && typeof v === 'object' && !Array.isArray(v) && prefix.split(' ').length < 2) flatten(v, label, out);
    else if (typeof v === 'string' || typeof v === 'number') out.push([label.charAt(0).toUpperCase() + label.slice(1), String(v)]);
  }
  return out;
}

/** Turns a workspace project plus the user's price / stock into a neutral product record. */
export function toProduct(p, extra, opts) {
  const abs = (u) => (!u ? '' : /^https?:\/\//i.test(u) ? u : `${opts.imageBase.replace(/\/$/, '')}${u.startsWith('/') ? '' : '/'}${u}`);
  const images = [...new Set([...(p.mockupAssets || []), ...(p.sourceImages || []), p.technicalFlat?.front].filter(Boolean).map(abs))].slice(0, 8);
  const desc = p.listing?.description || [p.name, p.fabric && `made in ${p.fabric}`, p.color && `in ${p.color}`].filter(Boolean).join(' ') + '.';
  const meas = flatten(p.measurements);
  const html = `<p>${esc(desc)}</p>${meas.length ? `<h4>Measurements</h4><ul>${meas.map(([k, v]) => `<li>${esc(k)}: ${esc(v)}</li>`).join('')}</ul>` : ''}`;
  const sku = (p.sku || '').trim() || slugify(p.name).toUpperCase().slice(0, 24);
  return {
    id: p.id, name: p.name, sku, description: desc, descriptionHtml: html, vendor: opts.vendor || p.brand || '', type: p.category || '',
    tags: [p.category, p.style, p.fabric, p.color].filter(Boolean), images, price: String(extra.price ?? '').replace(/,/g, '').trim(), stock: String(extra.stock ?? '').replace(/[^\d]/g, ''), sizes: opts.sizes,
    fabric: p.fabric || '', color: p.color || '', seoTitle: p.seo?.title || p.name, seoDescription: (p.seo?.description || desc).slice(0, 320), publish: opts.publish, measurements: meas,
  };
}

const cell = (v) => {
  let s = String(v ?? '');
  if (/^[=+@]/.test(s) || /^-[^\d.]/.test(s)) s = `'${s}`;   // stop spreadsheet formula injection
  return `"${s.replace(/"/g, '""')}"`;
};
const toCsv = (cols, rows) => [cols.map(cell).join(','), ...rows.map((r) => cols.map((c) => cell(r[c])).join(','))].join('\r\n');

const SHOPIFY_COLS = ['Handle', 'Title', 'Body (HTML)', 'Vendor', 'Product Category', 'Type', 'Tags', 'Published', 'Option1 Name', 'Option1 Value', 'Variant SKU', 'Variant Grams', 'Variant Inventory Tracker', 'Variant Inventory Qty', 'Variant Inventory Policy', 'Variant Fulfillment Service', 'Variant Price', 'Variant Compare At Price', 'Variant Requires Shipping', 'Variant Taxable', 'Variant Barcode', 'Image Src', 'Image Position', 'Image Alt Text', 'Gift Card', 'SEO Title', 'SEO Description', 'Status'];

function shopify(products) {
  const used = new Set(); const rows = [];
  products.forEach((p) => {
    let handle = slugify(p.name); for (let n = 2; used.has(handle); n++) handle = `${slugify(p.name)}-${n}`; used.add(handle);
    const variants = p.sizes.length ? p.sizes : [''];
    const n = Math.max(variants.length, p.images.length);
    for (let i = 0; i < n; i++) {
      const r = { Handle: handle };
      if (i === 0) Object.assign(r, { Title: p.name, 'Body (HTML)': p.descriptionHtml, Vendor: p.vendor, Type: p.type, Tags: p.tags.join(', '), Published: p.publish ? 'TRUE' : 'FALSE', 'Gift Card': 'FALSE', 'SEO Title': p.seoTitle, 'SEO Description': p.seoDescription, Status: p.publish ? 'active' : 'draft', 'Option1 Name': p.sizes.length ? 'Size' : 'Title' });
      if (i < variants.length) Object.assign(r, {
        'Option1 Value': variants[i] || 'Default Title', 'Variant SKU': variants[i] ? `${p.sku}-${variants[i]}` : p.sku, 'Variant Inventory Tracker': p.stock === '' ? '' : 'shopify',
        'Variant Inventory Qty': p.stock === '' ? '' : p.stock, 'Variant Inventory Policy': 'deny', 'Variant Fulfillment Service': 'manual', 'Variant Price': p.price, 'Variant Requires Shipping': 'TRUE', 'Variant Taxable': 'TRUE',
      });
      if (p.images[i]) Object.assign(r, { 'Image Src': p.images[i], 'Image Position': i + 1, 'Image Alt Text': p.name });
      rows.push(r);
    }
  });
  return toCsv(SHOPIFY_COLS, rows);
}

const WOO_COLS = ['ID', 'Type', 'SKU', 'Name', 'Published', 'Is featured?', 'Visibility in catalog', 'Short description', 'Description', 'Tax status', 'In stock?', 'Stock', 'Backorders allowed?', 'Sold individually?', 'Allow customer reviews?', 'Regular price', 'Categories', 'Tags', 'Images', 'Parent', 'Attribute 1 name', 'Attribute 1 value(s)', 'Attribute 1 visible', 'Attribute 1 global'];

function woo(products) {
  const rows = [];
  products.forEach((p) => {
    const variable = p.sizes.length > 0; const inStock = p.stock === '' || Number(p.stock) > 0 ? 1 : 0;
    rows.push({
      Type: variable ? 'variable' : 'simple', SKU: p.sku, Name: p.name, Published: p.publish ? 1 : -1, 'Is featured?': 0, 'Visibility in catalog': 'visible', Description: p.descriptionHtml, 'Tax status': 'taxable',
      'In stock?': inStock, Stock: variable ? '' : p.stock, 'Backorders allowed?': 0, 'Sold individually?': 0, 'Allow customer reviews?': 1, 'Regular price': variable ? '' : p.price,
      Categories: p.type, Tags: p.tags.join(', '), Images: p.images.join(', '), ...(variable ? { 'Attribute 1 name': 'Size', 'Attribute 1 value(s)': p.sizes.join(', '), 'Attribute 1 visible': 1, 'Attribute 1 global': 0 } : {}),
    });
    if (variable) p.sizes.forEach((s) => rows.push({ Type: 'variation', SKU: `${p.sku}-${s}`, Name: `${p.name} - ${s}`, Published: 1, 'Tax status': 'taxable', 'In stock?': inStock, Stock: p.stock, 'Backorders allowed?': 0, 'Regular price': p.price, Parent: p.sku, 'Attribute 1 name': 'Size', 'Attribute 1 value(s)': s, 'Attribute 1 visible': 1, 'Attribute 1 global': 0 }));
  });
  return toCsv(WOO_COLS, rows);
}

const JUMIA_COLS = ['Product Name', 'Brand', 'Category', 'Seller SKU', 'Colour', 'Size', 'Main Image', 'Image 2', 'Image 3', 'Image 4', 'Image 5', 'Price', 'Quantity', 'Description', 'Material'];
function jumia(products) {
  const rows = [];
  products.forEach((p) => (p.sizes.length ? p.sizes : ['']).forEach((s) => rows.push({
    'Product Name': p.name, Brand: p.vendor, Category: p.type, 'Seller SKU': s ? `${p.sku}-${s}` : p.sku, Colour: p.color, Size: s, 'Main Image': p.images[0] || '', 'Image 2': p.images[1] || '', 'Image 3': p.images[2] || '', 'Image 4': p.images[3] || '', 'Image 5': p.images[4] || '',
    Price: p.price, Quantity: p.stock, Description: p.description, Material: p.fabric,
  })));
  return `\uFEFF${toCsv(JUMIA_COLS, rows)}`;   // BOM so Excel reads accents correctly
}

export const buildCsv = (platform, products) => (platform === 'shopify' ? shopify(products) : platform === 'woocommerce' ? woo(products) : jumia(products));

/** Things worth fixing before the file is imported. */
export function checkProducts(products, imageBase) {
  const warn = [];
  const local = /^https?:\/\/(localhost|127\.|192\.168\.|10\.)/i.test(imageBase);
  if (local) warn.push('Your image address points to a local computer, so Shopify, WooCommerce or Jumia will not be able to download the photos. Use your public API address below.');
  const noPrice = products.filter((p) => p.price === '' || Number.isNaN(Number(String(p.price).replace(/,/g, '')))).length;
  if (noPrice) warn.push(`${noPrice} product${noPrice > 1 ? 's have' : ' has'} no valid price.`);
  const noImg = products.filter((p) => !p.images.length).length;
  if (noImg) warn.push(`${noImg} product${noImg > 1 ? 's have' : ' has'} no photo.`);
  return warn;
}
