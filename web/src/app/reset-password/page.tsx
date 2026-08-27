import { ResetPasswordPageContent } from '@/components/features/auth/ResetPasswordPageContent';

export default async function ResetPasswordPage(
  props: PageProps<'/reset-password'>,
) {
  const { token } = await props.searchParams;

  return <ResetPasswordPageContent token={typeof token === 'string' ? token : null} />;
}
