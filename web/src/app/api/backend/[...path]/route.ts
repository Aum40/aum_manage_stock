import { NextResponse } from "next/server";

import {
  isAllowedBackendEndpoint,
} from "@/lib/backend-endpoints";
import { forwardAuthed, readJsonBody } from "@/lib/api-forward";

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function forward(
  request: Request,
  context: RouteContext,
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
) {
  const { path: segments } = await context.params;

  // ต้องกันก่อน join — กฎบางข้อใช้ .* ซึ่งกิน "/" กับ "." ไปด้วย ทำให้ path อย่าง
  // stock/../auth/login ผ่าน allowlist ได้ แล้ว fetch จะ normalize ".." ทิ้งตอนยิงจริง
  // กลายเป็นเรียก endpoint นอกรายการพร้อม Bearer token ของผู้ใช้
  if (segments.some((segment) => segment === "" || segment === "." || segment === "..")) {
    return NextResponse.json(
      { message: "ไม่อนุญาตให้เรียก endpoint นี้ผ่านเว็บ" },
      { status: 404 },
    );
  }

  const path = segments.join("/");

  if (!isAllowedBackendEndpoint(method, path)) {
    return NextResponse.json(
      { message: "ไม่อนุญาตให้เรียก endpoint นี้ผ่านเว็บ" },
      { status: 404 },
    );
  }

  const query = new URL(request.url).search;
  return forwardAuthed(`/` + path + query, {
    method,
    ...(method === "GET" || method === "DELETE"
      ? {}
      : { body: await readJsonBody(request) }),
  });
}

export function GET(request: Request, context: RouteContext) {
  return forward(request, context, "GET");
}

export function POST(request: Request, context: RouteContext) {
  return forward(request, context, "POST");
}

export function PATCH(request: Request, context: RouteContext) {
  return forward(request, context, "PATCH");
}

export function PUT(request: Request, context: RouteContext) {
  return forward(request, context, "PUT");
}

export function DELETE(request: Request, context: RouteContext) {
  return forward(request, context, "DELETE");
}
