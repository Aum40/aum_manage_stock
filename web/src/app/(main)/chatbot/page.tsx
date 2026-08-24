"use client";

import { useState } from "react";

import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import Caption from "@/components/shared/Caption";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";

function BotBtn({
  variant,
  children,
}: {
  variant: "dark" | "ghost";
  children: React.ReactNode;
}) {
  return (
    <button
      className={
        variant === "dark"
          ? "rounded-full bg-brand-dark px-3.5 py-1.5 text-xs font-semibold text-background"
          : "rounded-full border border-border px-3.5 py-1.5 text-xs font-semibold text-muted-foreground"
      }
    >
      {children}
    </button>
  );
}

const content = {
  th: {
    title: "แชทบอทรับสต็อก",
    inputPh: 'พิมพ์คำสั่ง เช่น "เพิ่มโค้ก 10" หรือ "ลบมามา 3"',
    sendBtn: "ส่ง →",
    caption:
      "บัญชีนี้ผูก LINE แล้ว — ใช้คำสั่งเดียวกันจากฝั่ง LINE ของร้านได้เลย ระบบจะให้คนยืนยันก่อนบันทึกลงจริงทุกครั้ง",
    userMsg1: "เพิ่มโค้ก 10 ลบมามา 3",
    botSummaryLabel: "สรุปรายการที่จะบันทึก:",
    botLine1Name: "โค้กกระป๋อง 325 มล.",
    botLine1Change: "+10",
    botLine1Range: "(248 → 258)",
    botLine2Name: "มามาห่มูสับ",
    botLine2Change: "−3",
    botLine2Range: "(18 → 15)",
    confirmBtn: "ยืนยัน →",
    editBtn: "แก้ไขจำนวน",
    cancelBtn: "ยกเลิก",
    userMsg2: "เพิ่มน้ำลาลาหมึก 12",
    botNotFound:
      'ไม่พบสินค้า "น้ำลาลาหมึก" ในร้านนี้ — สินค้าที่ใกล้เคียง: น้ำดื่มตราสิงห์ 600 มล. ต้องการเพิ่มตัวนี้แทนไหม?',
    addInsteadBtn: "เพิ่มตราสิงห์ →",
    noBtn: "ไม่ใช่",
  },
  en: {
    title: "Stock Chatbot",
    inputPh: 'Type a command, e.g. "add 10 coke" or "remove 3 mama"',
    sendBtn: "Send →",
    caption:
      "This account is linked to LINE — use the same commands from the shop's LINE account too. The system always asks you to confirm before saving.",
    userMsg1: "add 10 coke, remove 3 mama",
    botSummaryLabel: "Here's what will be recorded:",
    botLine1Name: "Coke Can 325 ml.",
    botLine1Change: "+10",
    botLine1Range: "(248 → 258)",
    botLine2Name: "Mama Pork Noodles",
    botLine2Change: "−3",
    botLine2Range: "(18 → 15)",
    confirmBtn: "Confirm →",
    editBtn: "Edit Quantity",
    cancelBtn: "Cancel",
    userMsg2: "add 12 lala squid water",
    botNotFound:
      'Couldn\'t find "lala squid water" in this shop — closest match: Singha Water 600 ml. Add this one instead?',
    addInsteadBtn: "Add Singha →",
    noBtn: "No",
  },
};

export default function ChatbotPage() {
  const { locale } = useLocale();
  const t = content[locale];
  const [input, setInput] = useState("");

  const messages: { role: "user" | "bot"; content: React.ReactNode }[] = [
    { role: "user", content: t.userMsg1 },
    {
      role: "bot",
      content: (
        <div>
          <div className="mb-2">{t.botSummaryLabel}</div>
          <div className="font-mono text-[13px] leading-loose">
            • {t.botLine1Name}{" "}
            <span className="text-status-green">{t.botLine1Change}</span>{" "}
            {t.botLine1Range}
            <br />• {t.botLine2Name}{" "}
            <span className="text-destructive">{t.botLine2Change}</span>{" "}
            {t.botLine2Range}
          </div>
          <div className="mt-3 flex gap-2">
            <BotBtn variant="dark">{t.confirmBtn}</BotBtn>
            <BotBtn variant="ghost">{t.editBtn}</BotBtn>
            <BotBtn variant="ghost">{t.cancelBtn}</BotBtn>
          </div>
        </div>
      ),
    },
    { role: "user", content: t.userMsg2 },
    {
      role: "bot",
      content: (
        <div>
          <div className="mb-2.5">{t.botNotFound}</div>
          <div className="flex gap-2">
            <BotBtn variant="dark">{t.addInsteadBtn}</BotBtn>
            <BotBtn variant="ghost">{t.noBtn}</BotBtn>
          </div>
        </div>
      ),
    },
  ];

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex max-w-2xl flex-col gap-4">
          <div className="flex min-h-95 flex-col gap-3 rounded-3xl bg-secondary p-5">
            {messages.map((msg, i) => (
              <div
                key={i}
                className={`flex ${
                  msg.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "rounded-[17px_17px_5px_17px] bg-brand-dark text-background"
                      : "rounded-[17px_17px_17px_5px] border border-border bg-background text-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2.5">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t.inputPh}
              className="h-10 flex-1 rounded-full border border-border bg-background px-5 text-sm outline-none"
            />
            <Button variant="dark" onClick={() => setInput("")}>
              {t.sendBtn}
            </Button>
          </div>

          <Caption>{t.caption}</Caption>
        </div>
      </main>
    </>
  );
}
