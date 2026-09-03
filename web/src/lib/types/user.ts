export type CurrentUser = {
  id: string;
  firstName: string;
  lastName: string;
  email: string | null;
  emailVerifiedAt: string | null;
  username: string | null;
  lineUserId: string | null;
  googleId: string | null;
  role: 'SHOP_OWNER' | 'SHOP_STAFF' | 'ADMIN' | 'SUPER_ADMIN';
  twoFactorEnabled: boolean;
  /** api ตัด password ออกเสมอ จึงส่ง flag นี้มาแทนให้หน้าเว็บรู้ว่าตั้งไว้หรือยัง */
  hasPassword: boolean;
  status: 'ACTIVE' | 'SUSPENDED';
};
