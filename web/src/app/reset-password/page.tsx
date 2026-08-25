import { ResetPasswordForm } from '@/components/features/auth/reset-password-form';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function ResetPasswordPage(
  props: PageProps<'/reset-password'>,
) {
  const { token } = await props.searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-brand-cream p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>ตั้งรหัสผ่านใหม่</CardTitle>
          <CardDescription>
            กรอกรหัสผ่านใหม่ที่ต้องการใช้เข้าสู่ระบบครั้งต่อไป
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResetPasswordForm token={typeof token === 'string' ? token : null} />
        </CardContent>
      </Card>
    </div>
  );
}
