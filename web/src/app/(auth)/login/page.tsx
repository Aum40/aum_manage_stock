import { Suspense } from "react";

import LoginForm from "@/components/features/auth/LoginForm";

/**
 * LoginForm อ่าน ?twofa=1 ด้วย useSearchParams() ซึ่ง Next บังคับให้อยู่ใต้
 * Suspense ไม่งั้นทั้งหน้าจะกลายเป็น dynamic ตอน build
 */
export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
