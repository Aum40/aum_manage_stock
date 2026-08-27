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
   */
  allowedDevOrigins: [
    "192.168.1.48",
    "*.trycloudflare.com",
    "*.ngrok-free.app",
  ],
};

export default nextConfig;
