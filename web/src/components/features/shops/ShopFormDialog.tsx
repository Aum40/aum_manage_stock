"use client";

import { useEffect } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FormError } from "@/components/features/auth/form-error";
import { useLocale } from "@/components/i18n/LocaleContext";
import { ApiError } from "@/lib/api-client";
import { useCreateShop, useUpdateShop, type Shop } from "@/lib/hooks/use-inventory";
import { shopFormSchema, type ShopFormValues } from "@/lib/validations/shops";

const content = {
  th: {
    createTitle: "สร้างร้านใหม่",
    editTitle: "แก้ไขร้านค้า",
    description: "ข้อมูลนี้จะแสดงให้พนักงานและลูกค้าเห็นเมื่อเปิดร้าน",
    fieldName: "ชื่อร้าน",
    fieldDescription: "คำอธิบายร้าน",
    fieldImageUrl: "ลิงก์รูปภาพ",
    fieldPhone: "เบอร์โทร",
    fieldAddress: "ที่อยู่",
    cancelBtn: "ยกเลิก",
    createBtn: "สร้างร้าน",
    saveBtn: "บันทึก",
    savingBtn: "กำลังบันทึก…",
    createError: "สร้างร้านไม่สำเร็จ",
    updateError: "บันทึกข้อมูลไม่สำเร็จ",
  },
  en: {
    createTitle: "Create New Shop",
    editTitle: "Edit Shop",
    description: "This information is shown to staff and customers once the shop is open.",
    fieldName: "Shop Name",
    fieldDescription: "Description",
    fieldImageUrl: "Image URL",
    fieldPhone: "Phone",
    fieldAddress: "Address",
    cancelBtn: "Cancel",
    createBtn: "Create Shop",
    saveBtn: "Save",
    savingBtn: "Saving…",
    createError: "Failed to create the shop",
    updateError: "Failed to save the shop",
  },
};

function toMessage(error: unknown, fallback: string): string {
  return error instanceof ApiError ? error.message : fallback;
}

interface ShopFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  shop?: Shop | null;
}

export function ShopFormDialog({ open, onOpenChange, shop }: ShopFormDialogProps) {
  const { locale } = useLocale();
  const t = content[locale];
  const isEditing = Boolean(shop);

  const createShop = useCreateShop();
  const updateShop = useUpdateShop(shop?.id);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<ShopFormValues>({ resolver: zodResolver(shopFormSchema) });

  // แบบฟอร์มต้องรีเซ็ตทุกครั้งที่เปิด — ทั้งตอนสลับจากแก้ร้านหนึ่งไปอีกร้าน
  // และตอนปิดแล้วเปิดใหม่เพื่อสร้างร้านใหม่ ไม่งั้นค่าเก่าจะค้าง
  useEffect(() => {
    if (!open) return;
    reset({
      name: shop?.name ?? "",
      description: shop?.description ?? "",
      imageUrl: shop?.imageUrl ?? "",
      phone: shop?.phone ?? "",
      address: shop?.address ?? "",
    });
  }, [open, shop, reset]);

  const onSubmit = async (values: ShopFormValues) => {
    const input = {
      name: values.name,
      description: values.description || undefined,
      imageUrl: values.imageUrl || undefined,
      phone: values.phone || undefined,
      address: values.address || undefined,
    };

    try {
      if (isEditing) {
        await updateShop.mutateAsync(input);
      } else {
        await createShop.mutateAsync(input);
      }
      onOpenChange(false);
    } catch {
      // error แสดงผ่าน mutation.error ด้านล่าง ไม่ต้องทำอะไรเพิ่มตรงนี้
    }
  };

  const mutationError = isEditing ? updateShop.error : createShop.error;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? t.editTitle : t.createTitle}</DialogTitle>
          <DialogDescription>{t.description}</DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <Label className="text-[11px] font-semibold uppercase">{t.fieldName}</Label>
            <Input {...register("name")} />
            {errors.name && (
              <p className="text-xs text-destructive">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] font-semibold uppercase">{t.fieldDescription}</Label>
            <Input {...register("description")} />
            {errors.description && (
              <p className="text-xs text-destructive">{errors.description.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] font-semibold uppercase">{t.fieldImageUrl}</Label>
            <Input placeholder="https://..." {...register("imageUrl")} />
            {errors.imageUrl && (
              <p className="text-xs text-destructive">{errors.imageUrl.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] font-semibold uppercase">{t.fieldPhone}</Label>
            <Input placeholder="0812345678" {...register("phone")} />
            {errors.phone && (
              <p className="text-xs text-destructive">{errors.phone.message}</p>
            )}
          </div>

          <div className="flex flex-col gap-1">
            <Label className="text-[11px] font-semibold uppercase">{t.fieldAddress}</Label>
            <Input {...register("address")} />
            {errors.address && (
              <p className="text-xs text-destructive">{errors.address.message}</p>
            )}
          </div>

          <FormError
            message={
              mutationError
                ? toMessage(mutationError, isEditing ? t.updateError : t.createError)
                : null
            }
          />

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
            >
              {t.cancelBtn}
            </Button>
            <Button type="submit" variant="dark" disabled={isSubmitting}>
              {isSubmitting ? t.savingBtn : isEditing ? t.saveBtn : t.createBtn}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
