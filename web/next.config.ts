import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * [อั้ม] เปิดให้เครื่องอื่นเรียก dev server ได้ — จำเป็นตอนทดสอบสแกนบาร์โค้ด
   * ด้วยกล้องมือถือ เพราะโน้ตบุ๊กไม่มีกล้องหลัง
   *
   * next dev ยอมรับเฉพาะ origin ที่เป็น localhost เท่านั้นโดยปริยาย เปิดจาก
   * เครื่องอื่นแล้วหน้าจะโหลดมาแต่ asset ของ dev/HMR โดนบล็อก
   *
   * มีผลเฉพาะ development — production build ไม่สนใจค่านี้
   *
   * ใส่เฉพาะรูปแบบที่ใช้ได้กับทุกคนในทีม — **ห้ามใส่ IP ในวงแลนของเครื่องตัวเอง**
   * เพราะคนอื่นใช้ไม่ได้ แล้วทุกคนจะต้องมาแก้ไฟล์กลางนี้เพิ่ม IP ตัวเอง
   * กลายเป็นชนวน conflict ประจำ ถ้าต้องเปิดจากเครื่องอื่นให้ใช้ tunnel แทน
   * (ดู scripts/mobile-tunnel.mjs) ซึ่งได้ https ด้วย จึงใช้กล้องได้
   */
  allowedDevOrigins: ["*.trycloudflare.com", "*.ngrok-free.app"],
};

export default nextConfig;
