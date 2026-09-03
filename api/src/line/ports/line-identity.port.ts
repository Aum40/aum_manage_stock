export const LINE_IDENTITY_PORT = Symbol('LINE_IDENTITY_PORT');

/** รู้แล้วว่าเป็นใครและร้านไหน — ทำงานต่อได้เลย */
export interface ResolvedLineIdentity {
  kind: 'RESOLVED';
  shopId: string;
  actorId?: string;
  message: string;
}

/**
 * [อั้ม] รู้ว่าเป็นใคร แต่ยังไม่รู้ว่าหมายถึงร้านไหน — ต้องถามก่อน
 *
 * เดิมเคสนี้ throw LineUserMessageError ทิ้งไปเลย บังคับให้ผู้ใช้พิมพ์ชื่อร้าน
 * นำหน้าเอง ซึ่งต้องจำชื่อให้ตรงเป๊ะ ตอนนี้คืนรายชื่อร้านออกมาให้ผู้เรียกไปถาม
 * เป็นตัวเลือกมีเลขกำกับแทน
 */
export interface ShopSelectionRequired {
  kind: 'NEEDS_SHOP';
  actorId: string;
  message: string;
  shops: { id: string; name: string }[];
}

export type LineIdentityResult = ResolvedLineIdentity | ShopSelectionRequired;

export interface LineIdentityPort {
  resolve(input: {
    destination: string;
    lineUserId: string;
    /**
     * ข้อความที่ผู้ใช้พิมพ์มา — ใช้หาชื่อร้านนำหน้าเมื่อบัญชีมีหลายร้าน
     * เช่น "ร้านสาขา2 เพิ่มโค้ก10" (ทางลัดสำหรับคนที่รู้ชื่อร้านอยู่แล้ว)
     */
    message: string;
  }): Promise<LineIdentityResult>;

  /**
   * เลือกร้านจากรายการที่เคยเสนอไป — ตรวจสิทธิ์ซ้ำเสมอ ห้ามเชื่อเลขที่ผู้ใช้
   * พิมพ์มาลอย ๆ ว่าเป็นร้านที่เขาเข้าถึงได้จริง
   */
  selectShop(input: {
    actorId: string;
    index: number;
  }): Promise<{ shopId: string; shopName: string } | null>;
}
