import 'server-only';

/**
 * [อั้ม] หา origin ที่ "ผู้ใช้เห็นในเบราว์เซอร์" ไม่ใช่ที่ Next มองเห็น
 *
 * ทุก OAuth route ประกอบ redirect_uri จาก `new URL(request.url).origin` ซึ่งใช้ได้
 * เฉพาะตอนเปิดตรงที่ localhost เท่านั้น พอมี proxy คั่น (cloudflared, ngrok,
 * Vercel, Railway) ค่าจะเพี้ยนทันที เพราะ proxy เขียน Host เป็นปลายทางจริง
 * (localhost:3000) แต่บอก scheme ของขาเข้าแยกมาทาง x-forwarded-proto
 * Next เอาสองอย่างมาประกอบกันเลยได้ `https://localhost:3000` ซึ่งไม่มีอยู่จริง
 *
 * Google/LINE ปฏิเสธ redirect_uri นี้แน่นอน เพราะไม่ตรงกับที่ลงทะเบียนไว้
 * และ callback ก็พาผู้ใช้กลับไปที่ URL ที่เปิดไม่ได้ด้วย
 *
 * ลำดับความน่าเชื่อถือ:
 *   1. APP_URL — ตั้งเองใน .env ชนะทุกอย่าง ใช้ตอนที่รู้ค่าแน่นอน
 *      (scripts/mobile-tunnel.mjs ตั้งให้อัตโนมัติ)
 *   2. x-forwarded-host — proxy ส่วนใหญ่ส่งชื่อจริงมาให้ทาง header นี้
 *   3. origin ของ request — ถูกต้องอยู่แล้วตอนไม่มี proxy คั่น
 *
 * **ค่าที่ได้ต้องตรงเป๊ะกับ FRONTEND_URL ฝั่ง api** เพราะ api เอาไปประกอบ
 * redirect_uri ตอนแลก token ซึ่ง Google เทียบว่าต้องเหมือนตอน authorize
 */
export function resolvePublicOrigin(request: Request): string {
  const configured = process.env.APP_URL?.trim();
  if (configured) return configured.replace(/\/$/, '');

  const forwardedHost = request.headers.get('x-forwarded-host');
  if (forwardedHost) {
    // header อาจมีหลายค่าคั่นด้วย comma ถ้าผ่าน proxy หลายชั้น — เอาตัวแรก
    const host = forwardedHost.split(',')[0]!.trim();
    const proto =
      request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() ??
      'https';
    if (host) return `${proto}://${host}`;
  }

  return new URL(request.url).origin;
}
