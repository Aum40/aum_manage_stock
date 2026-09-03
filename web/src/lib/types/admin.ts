export type UserRole = 'SHOP_OWNER' | 'SHOP_STAFF' | 'ADMIN' | 'SUPER_ADMIN';
export type UserStatus = 'ACTIVE' | 'SUSPENDED';
export type ShopStatus = 'ACTIVE' | 'SUSPENDED';

/** รูปแบบเดียวกับ AdminService.paginated() ฝั่ง api */
export type Paginated<T> = {
  items: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
};

/** ตรงกับ USER_SELECT ใน api/src/admin/admin.service.ts (ไม่มี password เด็ดขาด) */
export type AdminUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  emailVerifiedAt: string | null;
  username: string | null;
  lineUserId: string | null;
  googleId: string | null;
  ownerId: string | null;
  role: UserRole;
  twoFactorEnabled: boolean;
  status: UserStatus;
  lastLoginAt: string | null;
  deletedAt: string | null;
  createdAt: string;
};

export type AdminShop = {
  id: string;
  ownerId: string;
  name: string;
  description: string | null;
  imageUrl: string | null;
  phone: string | null;
  address: string | null;
  status: ShopStatus;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  owner: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
  };
};

export type AdminOverview = {
  users: {
    total: number;
    suspended: number;
    byRole: Record<UserRole, number>;
  };
  shops: { total: number; suspended: number; deleted: number };
  products: { total: number };
  subscriptions: { code: string; nameTh: string; subscribers: number }[];
};
