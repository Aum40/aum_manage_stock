import LandingNav from "@/components/layout/LandingNav";
import LandingPageContent from "@/components/layout/LandingPageContent";

/**
 * ไม่อ่าน session ฝั่ง server ที่นี่ — Server Component ต่ออายุ access token ไม่ได้
 * (เขียน cookie ไม่ได้) พอ token หมดอายุจะเห็นเป็น "ยังไม่ล็อกอิน" ทั้งที่ navbar
 * ซึ่งเรียกผ่าน route handler ต่ออายุสำเร็จแล้วโชว์ชื่อผู้ใช้อยู่ — สองส่วนในหน้า
 * เดียวกันจะขัดกันเอง จึงให้ทั้งคู่อ่านผ่าน /api/* ทางเดียวกันหมด
 */
export default function LandingPage() {
  return <div className="bg-background"><LandingNav /><LandingPageContent /></div>;
}
