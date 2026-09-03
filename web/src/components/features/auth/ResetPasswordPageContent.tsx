"use client";

import { useLocale } from "@/components/i18n/LocaleContext";
import { getAuthCopy } from "@/components/features/auth/auth-copy";
import { ResetPasswordForm } from "@/components/features/auth/reset-password-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function ResetPasswordPageContent({ token }: { token: string | null }) {
  const { locale } = useLocale();
  const text = getAuthCopy(locale).reset;

  return (
    <div className="flex flex-1 items-center justify-center bg-brand-cream p-4">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>{text.title}</CardTitle>
          <CardDescription>{text.description}</CardDescription>
        </CardHeader>
        <CardContent><ResetPasswordForm token={token} /></CardContent>
      </Card>
    </div>
  );
}
