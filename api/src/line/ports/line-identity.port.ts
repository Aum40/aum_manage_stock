export const LINE_IDENTITY_PORT = Symbol('LINE_IDENTITY_PORT');

export interface LineIdentityPort {
  resolve(input: {
    destination: string;
    lineUserId: string;
    /**
     * ข้อความที่ผู้ใช้พิมพ์มา — ใช้หาชื่อร้านนำหน้าเมื่อบัญชีมีหลายร้าน
     * เช่น "ร้านสาขา2 เพิ่มโค้ก10"
     */
    message: string;
  }): Promise<{ shopId: string; actorId?: string; message: string }>;
}
