"use client";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Caption from "@/components/shared/Caption";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

const content = {
  th: {
    title: "โปรไฟล์ของฉัน",
    personalHeading: "ข้อมูลส่วนตัว",
    firstName: "ชื่อ",
    lastName: "นามสกุล",
    username: "Username",
    usernameHint: "เปลี่ยนได้ ถ้ายังไม่เคยตั้งชื่อนี้มีอยู่ในระบบ",
    email: "อีเมล",
    emailHint: "อีเมลใช้เข้าสู่ระบบหลักแล้ว เปลี่ยนไม่ได้จากที่นี่",
    saveBtn: "บันทึกข้อมูล →",
    pwHeading: "เปลี่ยนรหัสผ่าน",
    oldPw: "รหัสผ่านเดิม",
    oldPwPh: "ยืนยันรหัสผ่านเดิมก่อนเสมอ",
    newPw: "รหัสผ่านใหม่",
    confirmPw: "ยืนยันรหัสผ่านใหม่",
    changePwBtn: "เปลี่ยนรหัสผ่าน →",
    forgotPw: "ลืมรหัสผ่าน? ส่งลิงก์ไปอีเมล",
    connHeading: "การเชื่อมต่อบัญชี",
    lineDesc: "ผูกแล้ว — ใช้ AI Chat ได้ทั้งหน้าเว็บและฝั่ง LINE",
    linked: "ผูกแล้ว",
    unlinkBtn: "ถอดการผูก",
    googleDesc: "ยังไม่ผูก — ผูกแล้วเข้าสู่ระบบด้วย Google ได้เลย",
    notLinked: "ยังไม่ผูก",
    linkGoogleBtn: "ผูกบัญชี Google",
    connCaption: "ระบบจะปฏิเสธการผูกบัญชี Google หรือ LINE ที่ผูกกับบัญชีอื่นอยู่แล้วในระบบ",
    firstNameVal: "อุ้ม",
    lastNameVal: "เจนงาม",
    usernameVal: "aum.jaingam",
    emailVal: "aum.jaingam@gmail.com",
  },
  en: {
    title: "My Profile",
    personalHeading: "Personal Information",
    firstName: "First Name",
    lastName: "Last Name",
    username: "Username",
    usernameHint: "Changeable, as long as no one else has taken it",
    email: "Email",
    emailHint: "This email is used to sign in and can't be changed here.",
    saveBtn: "Save Changes →",
    pwHeading: "Change Password",
    oldPw: "Current Password",
    oldPwPh: "Always confirm your current password first",
    newPw: "New Password",
    confirmPw: "Confirm New Password",
    changePwBtn: "Change Password →",
    forgotPw: "Forgot your password? Email me a reset link",
    connHeading: "Account Connections",
    lineDesc: "Linked — AI Chat works on both web and LINE",
    linked: "Linked",
    unlinkBtn: "Unlink",
    googleDesc: "Not linked — link it to sign in with Google too",
    notLinked: "Not Linked",
    linkGoogleBtn: "Link Google Account",
    connCaption: "Linking will be rejected if that Google or LINE account is already linked elsewhere in the system.",
    firstNameVal: "Aum",
    lastNameVal: "Jaingam",
    usernameVal: "aum.jaingam",
    emailVal: "aum.jaingam@gmail.com",
  },
};

export default function ProfilePage() {
  const { locale } = useLocale();
  const t = content[locale];

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
            <Card>
              <div className="px-4">
                <div className="mb-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.personalHeading}
                </div>
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold uppercase">{t.firstName}</Label>
                    <Input defaultValue={t.firstNameVal} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold uppercase">{t.lastName}</Label>
                    <Input defaultValue={t.lastNameVal} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold uppercase">{t.username}</Label>
                    <Input defaultValue={t.usernameVal} />
                    <Caption>{t.usernameHint}</Caption>
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold uppercase">{t.email}</Label>
                    <Input defaultValue={t.emailVal} disabled />
                    <Caption>{t.emailHint}</Caption>
                  </div>
                  <div>
                    <Button variant="dark">{t.saveBtn}</Button>
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <div className="px-4">
                <div className="mb-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                  {t.pwHeading}
                </div>
                <div className="flex flex-col gap-3.5">
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold uppercase">{t.oldPw}</Label>
                    <Input type="password" placeholder={t.oldPwPh} />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold uppercase">{t.newPw}</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <Label className="text-[11px] font-semibold uppercase">{t.confirmPw}</Label>
                    <Input type="password" placeholder="••••••••" />
                  </div>
                  <div className="flex flex-wrap items-center gap-3">
                    <Button variant="dark">{t.changePwBtn}</Button>
                    <button className="text-[13px] text-muted-foreground">
                      {t.forgotPw}
                    </button>
                  </div>
                </div>
              </div>
            </Card>
          </div>

          <Card>
            <div className="px-4">
              <div className="mb-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                {t.connHeading}
              </div>
              <div className="flex items-center justify-between border-b border-border py-3.5">
                <div>
                  <div className="text-sm font-semibold">LINE</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t.lineDesc}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Badge variant="success">{t.linked}</Badge>
                  <Button variant="outline" size="sm">{t.unlinkBtn}</Button>
                </div>
              </div>
              <div className="flex items-center justify-between py-3.5">
                <div>
                  <div className="text-sm font-semibold">Google</div>
                  <div className="mt-0.5 text-xs text-muted-foreground">
                    {t.googleDesc}
                  </div>
                </div>
                <div className="flex items-center gap-2.5">
                  <Badge variant="neutral">{t.notLinked}</Badge>
                  <Button variant="dark" size="sm">{t.linkGoogleBtn}</Button>
                </div>
              </div>
              <div className="mt-2.5">
                <Caption>{t.connCaption}</Caption>
              </div>
            </div>
          </Card>
        </div>
      </main>
    </>
  );
}
