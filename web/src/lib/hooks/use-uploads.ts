"use client";

import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/lib/api-client";
import { resolveApiError } from "@/lib/api-error";

export type UploadFolder = "shops" | "products" | "categories";

/**
 * ไม่ผ่าน api.post() ของ api-client.ts เพราะตัวนั้น JSON.stringify body เสมอ —
 * ไฟล์ต้องส่งเป็น FormData ตรงๆ ให้เบราว์เซอร์ตั้ง Content-Type/boundary เอง
 */
export function useUploadImage() {
  return useMutation({
    mutationFn: async ({ file, folder }: { file: File; folder: UploadFolder }) => {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder);

      const res = await fetch("/api/uploads/image", {
        method: "POST",
        body: formData,
      });
      const data = await res.json().catch(() => null);

      if (!res.ok) {
        throw new ApiError(resolveApiError(data, "อัปโหลดรูปไม่สำเร็จ"), res.status);
      }

      return data as { url: string };
    },
  });
}
