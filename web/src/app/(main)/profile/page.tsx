"use client";

import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

import TopBar from "@/components/layout/TopBar";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Caption from "@/components/shared/Caption";
import { FormError } from "@/components/features/auth/form-error";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import {
  useChangePassword,
  useMe,
  useUnlinkLine,
  useUpdateProfile,
} from "@/lib/hooks/use-profile";
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordValues,
  type ProfileValues,
} from "@/lib/validations/profile";

const content = {
  th: {
    title: "โปรไฟล์ของฉัน",
    loading: "กำลังโหลดข้อมูลโปรไฟล์…",
    personalHeading: "ข้อมูลส่วนตัว",
    firstName: "ชื่อ",
    lastName: "นามสกุล",
    username: "Username",
    usernameHint: "เปลี่ยนได้ ถ้ายังไม่มีใครในระบบใช้ชื่อนี้",
    email: "อีเมล",
    emailHint: "อีเมลใช้เข้าสู่ระบบหลักแล้ว เปลี่ยนไม่ได้จากที่นี่",
    noEmail: "บัญชีนี้ไม่มีอีเมล",
    saveBtn: "บันทึกข้อมูล →",
    saving: "กำลังบันทึก...",
    saved: "บันทึกข้อมูลเรียบร้อยแล้ว",
    staffNotice:
      "บัญชีพนักงานแก้ไขข้อมูลและรหัสผ่านเองไม่ได้ ต้องให้เจ้าของร้านเป็นคนแก้ให้ (SRS §126)",
    pwHeading: "เปลี่ยนรหัสผ่าน",
    oldPw: "รหัสผ่านเดิม",
    oldPwPh: "ยืนยันรหัสผ่านเดิมก่อนเสมอ",
    newPw: "รหัสผ่านใหม่",
    confirmPw: "ยืนยันรหัสผ่านใหม่",
    changePwBtn: "เปลี่ยนรหัสผ่าน →",
    changingPw: "กำลังเปลี่ยน...",
    pwChanged: "เปลี่ยนรหัสผ่านแล้ว กำลังพากลับไปเข้าสู่ระบบใหม่…",
    forgotPw: "ลืมรหัสผ่าน? ส่งลิงก์ไปอีเมล",
    noPasswordNotice:
      "บัญชีนี้สมัครผ่าน LINE/Google จึงยังไม่มีรหัสผ่าน ตั้งรหัสผ่านครั้งแรกได้ที่หน้าลืมรหัสผ่าน",
    connHeading: "การเชื่อมต่อบัญชี",
    lineLinked: "ผูกแล้ว — ใช้ AI Chat ได้ทั้งหน้าเว็บและฝั่ง LINE",
    lineNotLinked: "ยังไม่ผูก — ผูกแล้วถึงจะใช้ AI Chat ฝั่ง LINE ได้",
    googleLinked: "ผูกแล้ว — เข้าสู่ระบบด้วย Google ได้",
    googleNotLinked: "ยังไม่ผูก — ผูกแล้วเข้าสู่ระบบด้วย Google ได้เลย",
    linked: "ผูกแล้ว",
    notLinked: "ยังไม่ผูก",
    unlinkBtn: "ถอดการผูก",
    unlinking: "กำลังถอด...",
    linkSoon: "ผูกบัญชี (เร็วๆ นี้)",
    connCaption:
      "ระบบจะปฏิเสธการผูกบัญชี Google หรือ LINE ที่ผูกกับบัญชีอื่นอยู่แล้วในระบบ",
  },
  en: {
    title: "My Profile",
    loading: "Loading your profile…",
    personalHeading: "Personal Information",
    firstName: "First Name",
    lastName: "Last Name",
    username: "Username",
    usernameHint: "Changeable, as long as no one else has taken it",
    email: "Email",
    emailHint: "This email is used to sign in and cannot be changed here.",
    noEmail: "This account has no email",
    saveBtn: "Save Changes →",
    saving: "Saving...",
    saved: "Your changes have been saved",
    staffNotice:
      "Staff accounts cannot edit their own details or password — the shop owner does it for them (SRS §126).",
    pwHeading: "Change Password",
    oldPw: "Current Password",
    oldPwPh: "Always confirm your current password first",
    newPw: "New Password",
    confirmPw: "Confirm New Password",
    changePwBtn: "Change Password →",
    changingPw: "Changing...",
    pwChanged: "Password changed — taking you back to sign in…",
    forgotPw: "Forgot your password? Email me a reset link",
    noPasswordNotice:
      "This account signed up through LINE/Google and has no password yet. Set one from the forgot-password page.",
    connHeading: "Account Connections",
    lineLinked: "Linked — AI Chat works on both web and LINE",
    lineNotLinked: "Not linked — link it to use AI Chat on LINE",
    googleLinked: "Linked — you can sign in with Google",
    googleNotLinked: "Not linked — link it to sign in with Google too",
    linked: "Linked",
    notLinked: "Not Linked",
    unlinkBtn: "Unlink",
    unlinking: "Unlinking...",
    linkSoon: "Link account (coming soon)",
    connCaption:
      "Linking will be rejected if that Google or LINE account is already linked elsewhere in the system.",
  },
};

const FIELD_LABEL_CLASS = "text-[11px] font-semibold uppercase";

export default function ProfilePage() {
  const { locale } = useLocale();
  const t = content[locale];
  const router = useRouter();

  const { data: me, isPending, error } = useMe();
  const updateProfile = useUpdateProfile();
  const changePassword = useChangePassword();
  const unlinkLine = useUnlinkLine();

  const isStaff = me?.role === "SHOP_STAFF";

  const profileForm = useForm<ProfileValues>({
    resolver: zodResolver(profileSchema),
    // `values` ไม่ใช่ `defaultValues` — ฟอร์มจะเติมค่าเองเมื่อ query โหลดเสร็จ
    values: {
      firstName: me?.firstName ?? "",
      lastName: me?.lastName ?? "",
      username: me?.username ?? "",
    },
  });

  const passwordForm = useForm<ChangePasswordValues>({
    resolver: zodResolver(changePasswordSchema),
  });

  const onSaveProfile = (values: ProfileValues) => {
    updateProfile.mutate({
      firstName: values.firstName,
      lastName: values.lastName,
      // ส่ง username ไปเฉพาะตอนที่กรอกจริง ไม่งั้น api จะเจอ string ว่างแล้วตีเป็น invalid
      ...(values.username ? { username: values.username } : {}),
    });
  };

  const onChangePassword = (values: ChangePasswordValues) => {
    changePassword.mutate(
      { oldPassword: values.oldPassword, newPassword: values.newPassword },
      {
        onSuccess: () => {
          passwordForm.reset();
          // api revoke session ทั้งหมดหลังเปลี่ยนรหัสผ่าน ต้องให้ล็อกอินใหม่
          setTimeout(() => router.push("/login"), 1200);
        },
      },
    );
  };

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        {isPending ? (
          <p className="text-sm text-muted-foreground">{t.loading}</p>
        ) : error ? (
          <FormError message={error.message} />
        ) : (
          <div className="flex flex-col gap-5">
            {isStaff && <Caption>{t.staffNotice}</Caption>}

            <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
              <Card>
                <form
                  className="px-4"
                  onSubmit={profileForm.handleSubmit(onSaveProfile)}
                >
                  <div className="mb-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                    {t.personalHeading}
                  </div>
                  <div className="flex flex-col gap-3.5">
                    <div className="flex flex-col gap-1">
                      <Label className={FIELD_LABEL_CLASS}>{t.firstName}</Label>
                      <Input
                        disabled={isStaff}
                        {...profileForm.register("firstName")}
                      />
                      {profileForm.formState.errors.firstName && (
                        <p className="text-xs text-destructive">
                          {profileForm.formState.errors.firstName.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className={FIELD_LABEL_CLASS}>{t.lastName}</Label>
                      <Input
                        disabled={isStaff}
                        {...profileForm.register("lastName")}
                      />
                      {profileForm.formState.errors.lastName && (
                        <p className="text-xs text-destructive">
                          {profileForm.formState.errors.lastName.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className={FIELD_LABEL_CLASS}>{t.username}</Label>
                      <Input
                        disabled={isStaff}
                        {...profileForm.register("username")}
                      />
                      <Caption>{t.usernameHint}</Caption>
                      {profileForm.formState.errors.username && (
                        <p className="text-xs text-destructive">
                          {profileForm.formState.errors.username.message}
                        </p>
                      )}
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label className={FIELD_LABEL_CLASS}>{t.email}</Label>
                      <Input value={me?.email ?? t.noEmail} disabled />
                      <Caption>{t.emailHint}</Caption>
                    </div>

                    <FormError message={updateProfile.error?.message ?? null} />
                    {updateProfile.isSuccess && (
                      <p className="text-sm text-status-green">{t.saved}</p>
                    )}

                    <div>
                      <Button
                        type="submit"
                        variant="dark"
                        disabled={isStaff || updateProfile.isPending}
                      >
                        {updateProfile.isPending ? t.saving : t.saveBtn}
                      </Button>
                    </div>
                  </div>
                </form>
              </Card>

              <Card>
                <form
                  className="px-4"
                  onSubmit={passwordForm.handleSubmit(onChangePassword)}
                >
                  <div className="mb-4 font-heading text-xs font-bold tracking-[0.12em] text-foreground uppercase">
                    {t.pwHeading}
                  </div>

                  {me?.hasPassword === false ? (
                    <Caption>{t.noPasswordNotice}</Caption>
                  ) : (
                    <div className="flex flex-col gap-3.5">
                      <div className="flex flex-col gap-1">
                        <Label className={FIELD_LABEL_CLASS}>{t.oldPw}</Label>
                        <Input
                          type="password"
                          placeholder={t.oldPwPh}
                          disabled={isStaff}
                          {...passwordForm.register("oldPassword")}
                        />
                        {passwordForm.formState.errors.oldPassword && (
                          <p className="text-xs text-destructive">
                            {passwordForm.formState.errors.oldPassword.message}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className={FIELD_LABEL_CLASS}>{t.newPw}</Label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={isStaff}
                          {...passwordForm.register("newPassword")}
                        />
                        {passwordForm.formState.errors.newPassword && (
                          <p className="text-xs text-destructive">
                            {passwordForm.formState.errors.newPassword.message}
                          </p>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <Label className={FIELD_LABEL_CLASS}>
                          {t.confirmPw}
                        </Label>
                        <Input
                          type="password"
                          placeholder="••••••••"
                          disabled={isStaff}
                          {...passwordForm.register("confirmPassword")}
                        />
                        {passwordForm.formState.errors.confirmPassword && (
                          <p className="text-xs text-destructive">
                            {
                              passwordForm.formState.errors.confirmPassword
                                .message
                            }
                          </p>
                        )}
                      </div>

                      <FormError
                        message={changePassword.error?.message ?? null}
                      />
                      {changePassword.isSuccess && (
                        <p className="text-sm text-status-green">
                          {t.pwChanged}
                        </p>
                      )}

                      <div className="flex flex-wrap items-center gap-3">
                        <Button
                          type="submit"
                          variant="dark"
                          disabled={isStaff || changePassword.isPending}
                        >
                          {changePassword.isPending
                            ? t.changingPw
                            : t.changePwBtn}
                        </Button>
                        <button
                          type="button"
                          className="text-[13px] text-muted-foreground"
                          onClick={() => router.push("/forgot-password")}
                        >
                          {t.forgotPw}
                        </button>
                      </div>
                    </div>
                  )}
                </form>
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
                      {me?.lineUserId ? t.lineLinked : t.lineNotLinked}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge variant={me?.lineUserId ? "success" : "neutral"}>
                      {me?.lineUserId ? t.linked : t.notLinked}
                    </Badge>
                    {/*
                      ถอดการผูกทำได้เลย (DELETE /users/me/unlink-line) แต่ "ผูกเพิ่ม"
                      ต้องวิ่ง OAuth รอบใหม่ที่ callback แยกจากตอน login แล้วส่ง code เข้า
                      POST /users/me/link-line — ยังไม่มี route นั้นในเว็บ
                      TODO: ทำ /api/users/me/link/{line,google}/{start,callback}
                    */}
                    {me?.lineUserId ? (
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={unlinkLine.isPending}
                        onClick={() => unlinkLine.mutate()}
                      >
                        {unlinkLine.isPending ? t.unlinking : t.unlinkBtn}
                      </Button>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        {t.linkSoon}
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex items-center justify-between py-3.5">
                  <div>
                    <div className="text-sm font-semibold">Google</div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {me?.googleId ? t.googleLinked : t.googleNotLinked}
                    </div>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Badge variant={me?.googleId ? "success" : "neutral"}>
                      {me?.googleId ? t.linked : t.notLinked}
                    </Badge>
                    {!me?.googleId && (
                      <Button variant="outline" size="sm" disabled>
                        {t.linkSoon}
                      </Button>
                    )}
                  </div>
                </div>

                <FormError message={unlinkLine.error?.message ?? null} />

                <div className="mt-2.5">
                  <Caption>{t.connCaption}</Caption>
                </div>
              </div>
            </Card>
          </div>
        )}
      </main>
    </>
  );
}
