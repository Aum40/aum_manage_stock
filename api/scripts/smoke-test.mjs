#!/usr/bin/env node
/**
 * Smoke test — ยิงครบ 12 endpoint ของ products + shop-products ตามลำดับจริง
 *
 *   pnpm start:dev            # เทอร์มินัลที่ 1
 *   node scripts/smoke-test.mjs   # เทอร์มินัลที่ 2
 *
 * ปรับได้ด้วย env: BASE_URL, OWNER_ID, SHOP_ID
 */

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OWNER_ID = process.env.OWNER_ID ?? '0199a0e0-0000-7000-8000-000000000001';
const SHOP_ID = process.env.SHOP_ID ?? '0199a0e0-0000-7000-8000-0000000000aa';
const BARCODE = `SMOKE${Date.now()}`;

let pass = 0;
let fail = 0;
const failures = [];

async function call(method, path, body) {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      'content-type': 'application/json',
      'x-user-id': OWNER_ID,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  let payload = null;
  const text = await res.text();
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    payload = text;
  }
  return { status: res.status, body: payload };
}

async function step(label, expectedStatus, fn, check) {
  try {
    const res = await fn();
    const statusOk = Array.isArray(expectedStatus)
      ? expectedStatus.includes(res.status)
      : res.status === expectedStatus;
    const checkResult = statusOk && check ? check(res.body) : true;

    if (statusOk && checkResult === true) {
      pass++;
      console.log(`  ✅ ${label}  [${res.status}]`);
      return res.body;
    }

    fail++;
    const why = !statusOk
      ? `คาดว่า ${expectedStatus} แต่ได้ ${res.status}`
      : `เนื้อหาไม่ผ่าน: ${checkResult}`;
    failures.push(`${label} — ${why}`);
    console.log(`  ❌ ${label}  [${res.status}] ${why}`);
    console.log(`     ${JSON.stringify(res.body).slice(0, 300)}`);
    return res.body;
  } catch (error) {
    fail++;
    failures.push(`${label} — ${error.message}`);
    console.log(`  ❌ ${label}  — ${error.message}`);
    return null;
  }
}

console.log(`\nSmoke test → ${BASE}`);
console.log(`owner: ${OWNER_ID}`);
console.log(`shop:  ${SHOP_ID}`);
console.log(`barcode ที่ใช้ทดสอบ: ${BARCODE}\n`);

console.log('── products (คลังกลาง) ──');

const created = await step('POST   /products (มีบาร์โค้ด)', 201, () =>
  call('POST', '/products', {
    name: 'โค้ก 325ml (smoke)',
    unit: 'กระป๋อง',
    barcode: BARCODE,
  }),
);
const productId = created?.id;

await step('POST   /products (บาร์โค้ดซ้ำ ต้องโดนปฏิเสธ)', 409, () =>
  call('POST', '/products', {
    name: 'โค้กซ้ำ',
    unit: 'กระป๋อง',
    barcode: BARCODE,
  }),
);

await step('POST   /products (ไม่มีชื่อ ต้อง 400)', 400, () =>
  call('POST', '/products', { unit: 'ชิ้น' }),
);

await step(
  'GET    /products',
  200,
  () => call('GET', '/products?limit=5'),
  (b) => (Array.isArray(b?.items) ? true : 'ไม่มี items เป็น array'),
);

await step(
  'GET    /products/search?barcode=',
  200,
  () => call('GET', `/products/search?barcode=${BARCODE}`),
  (b) =>
    Array.isArray(b)
      ? 'คืนเป็น array — ต้องเป็น object เดียว'
      : b?.id === productId
        ? true
        : 'ได้สินค้าคนละตัว',
);

await step('GET    /products/search (ไม่มีบาร์โค้ดนี้ ต้อง 404)', 404, () =>
  call('GET', '/products/search?barcode=NOPE-DOES-NOT-EXIST'),
);

await step('GET    /products/:id', 200, () =>
  call('GET', `/products/${productId}`),
);

await step(
  'PATCH  /products/:id',
  200,
  () => call('PATCH', `/products/${productId}`, { name: 'โค้ก 325ml (แก้แล้ว)' }),
  (b) => (b?.name === 'โค้ก 325ml (แก้แล้ว)' ? true : 'ชื่อไม่ถูกอัปเดต'),
);

console.log('\n── shop-products (สินค้าในร้าน) ──');

const shopProduct = await step(
  'POST   /shops/:shopId/products',
  201,
  () =>
    call('POST', `/shops/${SHOP_ID}/products`, {
      productId,
      sellPrice: 20,
      costPrice: 14.5,
      lowStockThreshold: 3,
    }),
  (b) => (Number(b?.stockQty) === 0 ? true : 'stockQty ต้องเริ่มที่ 0'),
);
const shopProductId = shopProduct?.id;

await step('POST   /shops/:shopId/products (ซ้ำ ต้อง 409)', 409, () =>
  call('POST', `/shops/${SHOP_ID}/products`, {
    productId,
    sellPrice: 20,
    costPrice: 14.5,
    lowStockThreshold: 3,
  }),
);

await step(
  'GET    /shops/:shopId/products',
  200,
  () => call('GET', `/shops/${SHOP_ID}/products`),
  (b) => (Array.isArray(b?.items) ? true : 'ไม่มี items เป็น array'),
);

await step(
  'GET    /shops/:shopId/products/low-stock',
  200,
  () => call('GET', `/shops/${SHOP_ID}/products/low-stock`),
  (b) =>
    Array.isArray(b)
      ? b.some((x) => x.id === shopProductId)
        ? true
        : 'สินค้าที่เพิ่งเพิ่ม (stock 0 <= threshold 3) ควรติด low-stock'
      : 'ต้องคืนเป็น array',
);

await step('GET    /shops/:shopId/products/:shopProductId', 200, () =>
  call('GET', `/shops/${SHOP_ID}/products/${shopProductId}`),
);

await step(
  'PATCH  /shops/:shopId/products/:shopProductId',
  200,
  () =>
    call('PATCH', `/shops/${SHOP_ID}/products/${shopProductId}`, {
      sellPrice: 25,
      costPrice: 15,
    }),
  (b) => (Number(b?.sellPrice) === 25 ? true : 'ราคาไม่ถูกอัปเดต'),
);

await step(
  'DELETE /shops/:shopId/products/:shopProductId (เลิกขาย)',
  200,
  () => call('DELETE', `/shops/${SHOP_ID}/products/${shopProductId}`),
  (b) => (b?.status === 'INACTIVE' ? true : 'status ต้องเป็น INACTIVE'),
);

await step(
  'POST   /shops/:shopId/products (กลับมาขายใหม่)',
  [200, 201],
  () =>
    call('POST', `/shops/${SHOP_ID}/products`, {
      productId,
      sellPrice: 22,
      costPrice: 14,
      lowStockThreshold: 5,
    }),
  (b) =>
    b?.id === shopProductId
      ? true
      : 'ต้องเปิดขายแถวเดิมกลับมา ไม่ใช่สร้างแถวใหม่',
);

console.log('\n── soft delete จากคลังกลาง ──');

await step('DELETE /products/:id', 200, () =>
  call('DELETE', `/products/${productId}`),
);

await step('GET    /products/:id (ลบแล้ว ต้อง 404)', 404, () =>
  call('GET', `/products/${productId}`),
);

await step(
  'GET    /shops/:shopId/products (สินค้าที่ลบต้องหายไปจากร้านด้วย)',
  200,
  () => call('GET', `/shops/${SHOP_ID}/products`),
  (b) =>
    b?.items?.some((x) => x.id === shopProductId)
      ? 'สินค้าที่ถูก soft delete ยังโผล่อยู่ในร้าน'
      : true,
);

await step(
  'POST   /products (บาร์โค้ดเดิม หลังลบแล้ว ต้องเพิ่มได้)',
  201,
  () =>
    call('POST', '/products', {
      name: 'โค้กตัวใหม่ บาร์โค้ดเดิม',
      unit: 'กระป๋อง',
      barcode: BARCODE,
    }),
);

console.log(`\n${'─'.repeat(50)}`);
console.log(`ผ่าน ${pass} · ไม่ผ่าน ${fail}`);
if (failures.length) {
  console.log('\nที่ไม่ผ่าน:');
  failures.forEach((f) => console.log(`  • ${f}`));
}
process.exit(fail === 0 ? 0 : 1);
