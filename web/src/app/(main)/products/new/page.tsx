import { redirect } from "next/navigation";

/**
 * ฟอร์มเพิ่มสินค้าเหลือที่เดียวคือ /catalog/new
 *
 * ของเดิมสองหน้าทำเรื่องเดียวกัน ต่างแค่หน้านี้ลงได้ร้านเดียว ซึ่ง /catalog/new
 * ครอบคลุมอยู่แล้ว (ติ๊กร้านที่กำลังใช้งานไว้ให้ตั้งแต่แรก) เก็บ route ไว้เป็น
 * redirect แทนการลบทิ้ง ลิงก์เก่าและบุ๊กมาร์กจะได้ไม่ตาย
 */
export default function AddProductRedirectPage() {
  redirect("/catalog/new");
}
