import { VerifyEmailStatus } from '@/components/features/auth/verify-email-status';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default async function VerifyEmailPage(
  props: PageProps<'/verify-email'>,
) {
  const { token } = await props.searchParams;

  return (
    <div className="flex flex-1 items-center justify-center bg-brand-cream p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>ยืนยันอีเมล</CardTitle>
          <CardDescription>
            ยืนยันอีเมลเพื่อเปิดใช้งานบัญชีของคุณ
          </CardDescription>
        </CardHeader>
        <CardContent>
          <VerifyEmailStatus token={typeof token === 'string' ? token : null} />
        </CardContent>
      </Card>
    </div>
  );
}
