import Link from "next/link";

import { Button } from "@/components/ui/button";

const features = [
  {
    icon: "🖥️",
    title: "จัดเก็บหน้าเว็บ",
    desc: "ค้นหาสินค้าด้วยชื่อหรือการแสกน แล้วบันทึกจำนวนที่ละรายการ พร้อมภาพลักษณ์โดยยังสินค้าที่รับต่อย",
  },
  {
    icon: "💬",
    title: "แชทสั่งงาน",
    desc: 'พิมพ์ว่า "เพิ่มโค้ก 10" จากหน้าเว็บหรือ LINE ระบบจะทำความเข้าใจแล้ว สรุปรายการให้คนยืนยันก่อนบันทึกจริง',
  },
  {
    icon: "📷",
    title: "สแกนบาร์โค้ด",
    desc: "สแกนบาร์โค้ดสินค้าออกขาย ระบบรวมเช็คบิลและบันทึกสต็อกอัตโนมัติ พร้อมเชื่อมเมื่อของออกเยอะ",
  },
];

const freeFeatures = [
  { label: "1 ร้านค้า", included: true },
  { label: "สินค้าสูงสุด 100 รายการ", included: true },
  { label: "บันทึกสต็อกแบบ manual", included: true },
  { label: "ประวัติการเคลื่อนไหวสต็อก", included: true },
  { label: "แดชบอร์ดพื้นฐาน", included: true },
  { label: "บันทึกสต็อกผ่านแชทบอท", included: false },
  { label: "สแกนบาร์โค้ด", included: false },
  { label: "คำแนะนำจาก AI", included: false },
];

const plusFeatures = [
  "3 ร้านค้า",
  "สินค้าสูงสุด 3,000 รายการ",
  "พนักงาน 6 บัญชี",
  "สแกนบาร์โค้ด + แชทบอท",
  "เชื่อมต่อบัญชี LINE",
  "รายงานเชิงลึก",
];

const proFeatures = [
  "5 ร้านค้า",
  "สินค้าสูงสุด 5,000 รายการ",
  "พนักงาน 10 บัญชี",
  "ทุกอย่างของแพ็กเกจ Plus",
  "คำแนะนำจาก AI",
  "เพิ่มสิทธิ์ร้านค้าเพิ่มเติม",
];

export default function LandingPage() {
  return (
    <div className="bg-background">
      {/* Navbar */}
      <div className="sticky top-0 z-40 flex justify-center px-6 py-4">
        <nav className="flex w-full max-w-4xl items-center gap-10 rounded-full bg-background px-7 py-3 shadow-[0_4px_24px_rgba(0,0,0,0.10)]">
          <div className="mr-auto font-heading text-lg font-bold tracking-[-0.01em]">
            <span className="text-foreground">Aum</span>
            <span className="text-primary">Stocks</span>
          </div>
          <a
            href="#features"
            className="hidden text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase sm:inline"
          >
            ฟีเจอร์
          </a>
          <a
            href="#pricing"
            className="hidden text-[13px] font-semibold tracking-[0.08em] text-muted-foreground uppercase sm:inline"
          >
            ราคา
          </a>
          <div className="flex gap-2.5">
            <Button variant="outline" size="sm" render={<Link href="/login" />}>
              เข้าสู่ระบบ
            </Button>
            <Button
              variant="gradient"
              size="sm"
              render={<Link href="/register" />}
            >
              สมัครสมาชิก →
            </Button>
          </div>
        </nav>
      </div>

      {/* Hero */}
      <section className="px-6 pt-20 pb-12 text-center">
        <div className="mb-5 text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
          RETAIL SHOP STOCK MANAGEMENT
        </div>
        <h1 className="mx-auto mb-6 max-w-3xl font-heading text-4xl leading-[1.15] font-bold text-foreground sm:text-5xl">
          เก็บของสต็อกให้เซ็นสม่ำเสมอ
          <br />
          ให้ <span className="text-primary">AumStocks</span> จัดการแทน
        </h1>
        <p className="mx-auto mb-9 max-w-xl text-base leading-loose text-muted-foreground">
          แพลตฟอร์มหลังบ้านสำหรับร้านค้าและมินิมาร์ท — บันทึกสต็อกได้ทั้งหน้าเว็บ
          แชทสั่งงานผ่าน LINE และสแกนบาร์โค้ดขายของ พร้อม AI
          ช่วยดูแลอะไรควรเติม อะไรควรระบายสต็อก
        </p>
        <div className="mb-12 flex justify-center gap-3">
          <Button
            variant="gradient"
            size="lg"
            render={<Link href="/register" />}
          >
            เริ่มใช้งาน →
          </Button>
          <Button variant="dark" size="lg">
            ดูวิธีการทำงาน →
          </Button>
        </div>

        {/* Hero preview panel */}
        <div className="mx-auto max-w-4xl rounded-3xl bg-secondary p-7">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "ยอดขายวันนี้", value: "฿4,280", tag: "▲ 12% จากเมื่อวาน" },
              { label: "จำนวนบิล", value: "63", tag: "▲ 5 บิล" },
              { label: "สินค้าใกล้หมด", value: "7 รายการ", tag: "ควรสั่งเพิ่ม" },
              {
                label: "AI แนะนำ",
                value: null,
                quote: "น้ำหมดสต็อก ทั้งที่ขาย 17 ขวด/วัน → สั่งเพิ่ม 120 ขวด",
              },
            ].map((c) => (
              <div key={c.label} className="rounded-2xl bg-background p-4">
                <div className="mb-2 text-[11px] tracking-[0.08em] text-muted-foreground uppercase">
                  {c.label}
                </div>
                {c.value ? (
                  <div className="mb-1.5 font-mono text-xl font-bold text-foreground">
                    {c.value}
                  </div>
                ) : (
                  <div className="mb-1.5 text-xs leading-relaxed text-foreground/80">
                    {c.quote}
                  </div>
                )}
                <div className="text-[11px] font-semibold text-status-green">
                  {c.tag}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="px-6 py-20 text-center">
        <div className="mb-3.5 text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
          3 ช่องทาง 1 สต็อก
        </div>
        <h2 className="mb-3 font-heading text-3xl font-bold text-foreground sm:text-4xl">
          ครบสต็อกในหน้าจอเดียวตลอดเวลา
        </h2>
        <p className="mx-auto mb-13 max-w-xl text-[15px] leading-relaxed text-muted-foreground">
          ทุกการเปลี่ยนแปลงถูกบันทึกเป็นประวัติเดียวกัน พร้อมที่มาและผู้ทำรายการ
          ตรวจสอบย้อนหลังได้ทุกรายการ
        </p>
        <div className="mx-auto grid max-w-4xl grid-cols-1 gap-5 sm:grid-cols-3">
          {features.map((f) => (
            <div key={f.title} className="rounded-3xl bg-secondary p-9">
              <div className="mx-auto mb-5 flex size-16 items-center justify-center rounded-full bg-primary text-3xl">
                {f.icon}
              </div>
              <div className="mb-2.5 font-heading text-base font-bold tracking-[0.05em] text-foreground uppercase">
                {f.title}
              </div>
              <p className="text-sm leading-relaxed text-muted-foreground">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section
        id="pricing"
        className="mx-6 rounded-3xl bg-[#FAF8F4] px-6 py-18 text-center"
      >
        <div className="mb-3.5 text-[11px] font-bold tracking-[0.18em] text-primary uppercase">
          PRICING
        </div>
        <h2 className="mb-3 font-heading text-3xl font-bold text-foreground sm:text-4xl">
          เลือกแพ็กเกจที่ใช่สำหรับร้านคุณ
        </h2>
        <p className="mb-13 text-sm text-muted-foreground">
          เริ่มฟรีไม่มีวันหมดอายุ อัปเกรดเมื่อร้านค้าโตขึ้น
        </p>

        <div className="mx-auto grid max-w-4xl grid-cols-1 items-center gap-5 sm:grid-cols-3">
          {/* Free */}
          <div className="rounded-3xl bg-secondary p-8 text-left">
            <div className="mb-2.5 text-[11px] font-bold tracking-[0.14em] text-primary uppercase">
              FREE
            </div>
            <div className="mb-0.5 font-mono text-4xl font-bold tracking-[-0.03em] text-foreground">
              ฿0
            </div>
            <div className="mb-6 text-xs text-muted-foreground">ตลอดชีพ</div>
            {freeFeatures.map((f) => (
              <div
                key={f.label}
                className={`flex items-center gap-2 border-b border-border py-1.5 text-[13px] ${
                  f.included ? "text-foreground/80" : "text-muted-foreground/60"
                }`}
              >
                <span
                  className={
                    f.included
                      ? "font-bold text-status-green"
                      : "font-bold text-border"
                  }
                >
                  {f.included ? "✓" : "✗"}
                </span>
                {f.label}
              </div>
            ))}
            <Button
              variant="outline"
              className="mt-5.5 w-full"
              render={<Link href="/register" />}
            >
              เริ่มใช้ฟรี
            </Button>
          </div>

          {/* Plus — elevated */}
          <div className="relative -translate-y-2 rounded-3xl border-[1.5px] border-primary bg-background p-9 pt-10 text-left shadow-[0_12px_48px_rgba(245,163,28,0.20)]">
            <span className="absolute -top-3.5 left-1/2 -translate-x-1/2 rounded-full bg-linear-to-br from-brand-orange to-brand-orange/70 px-3.5 py-1 text-[10px] font-bold whitespace-nowrap text-white">
              แนะนำ
            </span>
            <div className="mb-2.5 text-[11px] font-bold tracking-[0.14em] text-primary uppercase">
              PLUS
            </div>
            <div className="mb-0.5 font-mono text-4xl font-bold tracking-[-0.03em] text-foreground">
              ฿2,499
            </div>
            <div className="mb-6 text-xs text-muted-foreground">ต่อปี</div>
            {plusFeatures.map((f) => (
              <div
                key={f}
                className="flex items-center gap-2 border-b border-primary/15 py-1.5 text-[13px] text-foreground/80"
              >
                <span className="font-bold text-primary">✓</span>
                {f}
              </div>
            ))}
            <Button
              variant="gradient"
              className="mt-5.5 w-full"
              render={<Link href="/register" />}
            >
              เลือก Plus →
            </Button>
          </div>

          {/* Pro */}
          <div className="rounded-3xl bg-secondary p-8 text-left">
            <div className="mb-2.5 text-[11px] font-bold tracking-[0.14em] text-primary uppercase">
              PRO
            </div>
            <div className="mb-0.5 font-mono text-4xl font-bold tracking-[-0.03em] text-foreground">
              ฿3,499
            </div>
            <div className="mb-6 text-xs text-muted-foreground">ต่อปี</div>
            {proFeatures.map((f) => (
              <div
                key={f}
                className="flex items-center gap-2 border-b border-border py-1.5 text-[13px] text-foreground/80"
              >
                <span className="font-bold text-status-green">✓</span>
                {f}
              </div>
            ))}
            <Button
              variant="dark"
              className="mt-5.5 w-full"
              render={<Link href="/register" />}
            >
              เลือก Pro →
            </Button>
          </div>
        </div>

        <p className="mt-7 text-xs text-muted-foreground/70">
          ทุกแพ็กเกจเป็นรายปีเดียว ราคาที่สร้างเว็บอยู่แล้ว Free Plan
          ยังรวมสิทธิ์อัปเกรดเป็นแพ็กเกจใหม่ได้ทุกที่
        </p>
      </section>

      {/* Footer */}
      <footer className="mt-15 border-t border-border px-6 py-8 text-center">
        <div className="text-xs text-muted-foreground">
          Aum Manage Stocks — Retail Shop Stock Management Platform
        </div>
      </footer>
    </div>
  );
}
