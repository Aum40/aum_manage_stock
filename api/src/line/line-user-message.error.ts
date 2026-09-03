/**
 * ข้อผิดพลาดที่ต้องการ "ตอบกลับผู้ใช้ทาง LINE" แทนการโยน HTTP error ออกไป
 *
 * LINE จะ retry ถ้า webhook ไม่ตอบ 2xx ดังนั้นทุกกรณีที่ผู้ใช้ทำอะไรไม่ถูก
 * (ยังไม่ผูกบัญชี / มีหลายร้าน / ไม่มีสิทธิ์) ต้องกลายเป็นข้อความตอบกลับ
 * ไม่ใช่ error status
 */
export class LineUserMessageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'LineUserMessageError';
  }
}
