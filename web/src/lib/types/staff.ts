/** ตรงกับ SAFE_STAFF_SELECT ใน api/src/staff/staff.service.ts */
export type StaffAccount = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  username: string | null;
  lineUserId: string | null;
  role: 'SHOP_STAFF';
  status: 'ACTIVE' | 'SUSPENDED';
  twoFactorEnabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
};

/** โควตานับระดับบัญชี ไม่ใช่ต่อร้าน — คนเดียวอยู่หลายร้านยังนับ 1 */
export type StaffQuota = {
  allowed: number;
  used: number;
  remaining: number;
};

export type StaffPermissions = {
  canManageProduct: boolean;
  canAdjustStockManual: boolean;
  canUseChatbot: boolean;
  canScanSale: boolean;
  canViewDashboard: boolean;
  canViewAiInsight: boolean;
};

export type ShopSummary = {
  id: string;
  name: string;
  status: 'ACTIVE' | 'SUSPENDED';
};

/** GET /staff/:id/shops คืน shop_staffs พร้อม shop ที่ include มา */
export type StaffAssignment = {
  id: string;
  shopId: string;
  userId: string;
  assignedAt: string;
  removedAt: string | null;
  shop: ShopSummary;
};

/** GET /shops/:shopId/staff คืน shop_staffs พร้อม user + permission */
export type ShopStaffMember = {
  id: string;
  shopId: string;
  userId: string;
  assignedAt: string;
  user: StaffAccount;
  permission: StaffPermissions | null;
};
