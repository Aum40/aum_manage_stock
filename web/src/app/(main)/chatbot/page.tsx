"use client";

import { useState } from "react";

import TopBar from "@/components/layout/TopBar";
import { Button } from "@/components/ui/button";
import Caption from "@/components/shared/Caption";
import { FormError } from "@/components/features/auth/form-error";
import { roleAvatar } from "@/components/layout/nav-config";
import { useLocale } from "@/components/i18n/LocaleContext";
import { ApiError } from "@/lib/api-client";
import {
  useChatMessages,
  useSendChatMessage,
  useShops,
} from "@/lib/hooks/use-inventory";
import {
  useApplyChatCommand,
  useSelectChatCandidate,
  type StockCandidate,
} from "@/lib/hooks/use-chat";

const content = {
  th: {
    title: "แชทบอทรับสต็อก",
    inputPh: 'พิมพ์คำสั่ง เช่น "เพิ่มโค้ก 10" หรือ "ลดน้ำเปล่า 5"',
    sendBtn: "ส่ง →",
    sending: "กำลังส่ง…",
    caption:
      "ใช้คำสั่งเดียวกันจากฝั่ง LINE ของร้านได้เลย ระบบจะให้ยืนยันก่อนบันทึกลงจริงทุกครั้ง",
    confirmBtn: "ยืนยัน →",
    cancelBtn: "ยกเลิก",
    working: "กำลังบันทึก…",
    confirmed: "✅ บันทึกสต็อกแล้ว",
    cancelled: "ยกเลิกรายการแล้ว",
    noShop: "ยังไม่มีร้าน ต้องสร้างร้านก่อนถึงจะใช้แชทบอทได้",
    loading: "กำลังโหลด…",
    empty: 'ทักมาได้เลยครับ เช่น "เพิ่มโค้ก 10" หรือพิมพ์ "ช่วยเหลือ" เพื่อดูวิธีใช้',
    chooseLabel: "เลือกสินค้าที่ต้องการ",
    stockLeft: (qty: number, unit: string) => `เหลือ ${qty} ${unit}`,
  },
  en: {
    title: "Stock Chatbot",
    inputPh: 'Type a command, e.g. "add 10 coke" or "remove 5 water"',
    sendBtn: "Send →",
    sending: "Sending…",
    caption:
      "The same commands work from the shop's LINE account. Every change is confirmed before it is saved.",
    confirmBtn: "Confirm →",
    cancelBtn: "Cancel",
    working: "Saving…",
    confirmed: "✅ Stock saved",
    cancelled: "The pending item was cancelled",
    noShop: "No shop yet. Create a shop before using the chatbot.",
    loading: "Loading…",
    empty: 'Say hello, or try "add 10 coke". Type "help" to see what I can do.',
    chooseLabel: "Choose the product you meant",
    stockLeft: (qty: number, unit: string) => `${qty} ${unit} left`,
  },
};

export default function ChatbotPage() {
  const { locale } = useLocale();
  const t = content[locale];

  const [input, setInput] = useState("");
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [candidates, setCandidates] = useState<StockCandidate[]>([]);
  const [actionError, setActionError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const shopsQuery = useShops();
  const shopId = shopsQuery.data?.[0]?.id;
  const chatQuery = useChatMessages(shopId);
  const sendMessage = useSendChatMessage(shopId);
  const applyCommand = useApplyChatCommand(shopId);
  const selectCandidate = useSelectChatCandidate(shopId);

  const messages = chatQuery.data?.length
    ? [...chatQuery.data].reverse().map((message) => ({
        role: message.role === "USER" ? ("user" as const) : ("bot" as const),
        content: message.content,
      }))
    : [];

  const toMessage = (error: unknown, fallback: string) =>
    error instanceof ApiError ? error.message : fallback;

  const onSend = () => {
    const message = input.trim();
    if (!message || sendMessage.isPending) return;

    setActionError(null);
    setNotice(null);

    sendMessage.mutate(message, {
      onSuccess: (result) => {
        setInput("");
        // มี pendingAction = บอทตีความได้ กำลังรอให้กดยืนยัน
        // ฝั่ง LINE ใช้พิมพ์คำว่า "ยืนยัน" แทน เพราะกดปุ่มไม่ได้
        const payload = result as {
          pendingAction: { id: string; shopProductId: string | null } | null;
          candidates?: StockCandidate[];
        };

        setPendingId(payload?.pendingAction?.id ?? null);
        // มี candidates = ชื่อกำกวม ต้องให้เลือกสินค้าก่อนถึงจะยืนยันได้
        setCandidates(payload?.candidates ?? []);
      },
      onError: (error) => setActionError(toMessage(error, "ส่งข้อความไม่สำเร็จ")),
    });
  };

  // บอทตอบกลับผ่านประวัติแชทอยู่แล้ว จึงไม่ต้องขึ้นแถบ notice ซ้ำอีก
  const onApply = (action: "CONFIRM" | "CANCEL") => {
    if (!pendingId) return;
    setActionError(null);

    applyCommand.mutate(
      { pendingId, action },
      {
        onSuccess: () => {
          setPendingId(null);
          setCandidates([]);
        },
        onError: (error) =>
          setActionError(
            toMessage(
              error,
              action === "CONFIRM" ? "ยืนยันไม่สำเร็จ" : "ยกเลิกไม่สำเร็จ",
            ),
          ),
      },
    );
  };

  const onSelectCandidate = (shopProductId: string) => {
    if (!pendingId) return;
    setActionError(null);

    selectCandidate.mutate(
      { pendingId, shopProductId },
      {
        // เลือกเสร็จแล้วรายการมี shopProductId ครบ กดยืนยันได้เลย
        onSuccess: () => setCandidates([]),
        onError: (error) => setActionError(toMessage(error, "เลือกสินค้าไม่สำเร็จ")),
      },
    );
  };

  const isBusy = applyCommand.isPending || selectCandidate.isPending;

  return (
    <>
      <TopBar title={t.title} user={roleAvatar.owner[locale]} />
      <main className="flex-1 overflow-y-auto px-4 py-5 sm:px-6 lg:px-9 lg:py-8">
        <div className="flex max-w-2xl flex-col gap-4">
          <div className="flex min-h-95 flex-col gap-3 rounded-3xl bg-secondary p-5">
            {shopsQuery.isPending || chatQuery.isPending ? (
              <p className="text-sm text-muted-foreground">{t.loading}</p>
            ) : !shopId ? (
              <p className="text-sm text-muted-foreground">{t.noShop}</p>
            ) : messages.length === 0 ? (
              <p className="text-sm text-muted-foreground">{t.empty}</p>
            ) : (
              messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[78%] px-4 py-3 text-sm leading-relaxed whitespace-pre-line ${
                      msg.role === "user"
                        ? "rounded-[17px_17px_5px_17px] bg-brand-dark text-background"
                        : "rounded-[17px_17px_17px_5px] border border-border bg-background text-foreground"
                    }`}
                  >
                    {msg.content}
                  </div>
                </div>
              ))
            )}

            {/*
              ปุ่มยืนยัน/ยกเลิกโผล่เฉพาะตอนมีรายการรออยู่จริง — ตรงกับฝั่ง LINE
              ที่ต้องพิมพ์ "ยืนยัน" ก่อนสต็อกถึงจะขยับ ไม่มีการบันทึกอัตโนมัติ
            */}
            {pendingId && candidates.length > 0 && (
              <div className="flex flex-col gap-2 pt-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  {t.chooseLabel}
                </p>
                <div className="flex flex-wrap gap-2">
                  {candidates.map((candidate) => (
                    <Button
                      key={candidate.shopProductId}
                      variant="outline"
                      size="sm"
                      disabled={isBusy}
                      onClick={() => onSelectCandidate(candidate.shopProductId)}
                    >
                      {candidate.name} ·{" "}
                      {t.stockLeft(candidate.stockQty, candidate.unit)}
                    </Button>
                  ))}
                </div>
              </div>
            )}

            {pendingId && candidates.length === 0 && (
              <div className="flex flex-wrap gap-2.5 pt-1">
                <Button
                  variant="dark"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onApply("CONFIRM")}
                >
                  {applyCommand.isPending ? t.working : t.confirmBtn}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={isBusy}
                  onClick={() => onApply("CANCEL")}
                >
                  {t.cancelBtn}
                </Button>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <FormError message={actionError} />
            {notice && (
              <p className="rounded-md border border-status-green/30 bg-status-green/10 px-3 py-2 text-sm text-status-green">
                {notice}
              </p>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  event.preventDefault();
                  onSend();
                }
              }}
              placeholder={t.inputPh}
              disabled={!shopId}
              className="h-10 flex-1 rounded-full border border-border bg-background px-5 text-sm outline-none disabled:opacity-50"
            />
            <Button
              variant="dark"
              onClick={onSend}
              disabled={sendMessage.isPending || !shopId}
            >
              {sendMessage.isPending ? t.sending : t.sendBtn}
            </Button>
          </div>

          <Caption>{t.caption}</Caption>
        </div>
      </main>
    </>
  );
}
