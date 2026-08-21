# chatbot (อั้ม)

ปรับสต็อกด้วยการพิมพ์ภาษาไทยอิสระ เช่น `"เพิ่มโค้ก10"` — LLM ตีความเป็นรายการที่มีโครงสร้าง
แสดงสรุปให้ตรวจ แล้วผู้ใช้ต้องยืนยันก่อนบันทึกจริง (SRS §162-165)

สถานะ: **ยังไม่ merge** — อยู่บน `feature/chatbot-resource`

## Endpoints

| Method | Path | หมายเหตุ |
|---|---|---|
| POST | `/shops/:shopId/chat/messages` | body: `content` — ส่งข้อความ, ยืนยัน, หรือยกเลิก ใช้ endpoint เดียวกันหมด |
| GET | `/shops/:shopId/chat/messages` | `?limit=` (default 50) เรียงใหม่ไปเก่า |
| POST | `/webhooks/line` | **โครงเปล่า** ยังไม่ต่อ LINE จริง |

path ตรงตาม endpoint sheet

> โค้ดในโมดูลนี้ไม่มี comment ในไฟล์โดยตั้งใจ — **เหตุผลเบื้องหลังทุกอย่างอยู่ใน README นี้**
> (ยกเว้น `TODO` ที่ชี้ไปงานของโมดูลอื่น)

## ⚠️ ข้อจำกัดที่ต้องรู้ก่อนเดโม

**ขั้นยืนยันยังไม่ตัดสต็อกจริง** — `pending_stock_actions` จะถูก mark `CONFIRMED` และตอบผู้ใช้ว่า
ยืนยันแล้ว แต่ `shop_products.stock_qty` **ไม่เปลี่ยน** เพราะการเขียน ledger ต้องใช้ตาราง
`stock_movements` ซึ่งเป็นของ `feature/stock-movements-resource` (พี่ดิว) ที่ยังไม่มีในระบบ

จุดที่ต้องต่อคือ `TODO(stock-movements)` ใน `chatbot.service.ts` → `confirmLatestPending()`
เมื่อตารางนั้นเข้า `dev` แล้วให้ห่อการเขียน `stock_movements` + อัปเดต `stock_qty` +
mark `CONFIRMED` ไว้ใน `prisma.$transaction` เดียวกัน (AGENTS.md: ledger เป็น append-only
ส่วน `stock_qty` เป็นแค่ cache ที่ต้องอัปเดตพร้อมกันเสมอ)

ข้อความตอบกลับตอนยืนยันมีวงเล็บบอกผู้ใช้ไว้แล้วว่ายังไม่ตัดสต็อก — **ห้ามพูดตอนเดโมว่าตัดสต็อกได้แล้ว**

## การตัดสินใจ

### ยืนยันผ่านข้อความ ไม่มี endpoint แยก

endpoint sheet ไม่มีเส้นทางสำหรับกดยืนยัน แต่ SRS บังคับว่าต้องยืนยันก่อนบันทึก
จึงให้พิมพ์ `"ยืนยัน"` / `"ยกเลิก"` เข้า `POST .../chat/messages` ตัวเดิม ซึ่งเป็นพฤติกรรม
ธรรมชาติของแชทบอทและไม่ต้องเพิ่ม endpoint นอก sheet

คำที่รับ: ยืนยัน = `ยืนยัน` `confirm` `ตกลง` `ใช่` / ยกเลิก = `ยกเลิก` `cancel` `ไม่`
(เทียบแบบตรงตัวหลัง `trim().toLowerCase()` ไม่ใช่ substring — กัน `"ไม่เอาโค้ก"` โดนตีความเป็นยกเลิก)

### เช็คสิทธิ์สองชั้นตาม AGENTS.md

`chat-access.service.ts` เขียนเองในโมดูลนี้ **ไม่แก้ `common/shop-access/shop-access.port.ts` ของเซิ่น**
เพราะตัวนั้นผูกกับ `canManageProduct` ตายตัว ส่วน chatbot ต้องใช้ `canUseChatbot`

ลำดับใน `assertCanUseChatbot()`:
1. `AccountContextService.resolve()` — resolve `users.owner_id ?? users.id` (reuse ของเซิ่น, `CommonModule` เป็น `@Global()`)
2. ร้านเป็นของ owner + `status = ACTIVE` — **ร้านคนอื่นคืน 404 ไม่ใช่ 403** ตามแบบเซิ่น ไม่บอกใบ้ว่า shopId มีจริง
3. ถ้าเป็นพนักงาน → ต้อง assign อยู่กับร้านนี้ + `staff_permissions.can_use_chatbot = true`
4. **plan gate**: `subscription_plans.chatbot_enabled = true` ← ชั้นที่ AGENTS.md ย้ำว่าขาดไม่ได้
   (เจ้าของเปิดสิทธิ์ให้พนักงานบน Free Plan ได้ แต่ plan ต้องบล็อกอยู่ดี)
5. `assertNotReadOnly()` — แพ็กเกจหมดอายุ = แก้ข้อมูลไม่ได้

`GET` ใช้ `assertCanViewChat()` ซึ่งข้ามข้อ 3-5 (อ่านได้แม้ read-only ตาม SRS)

### LLM — port/adapter สลับ provider ได้

`LLM_PROVIDER` Symbol → `OllamaLlmAdapter` ตามแบบ `PRODUCT_QUOTA_PROVIDER` / `SHOP_ACCESS_PROVIDER`
ที่ทีมใช้อยู่ เปลี่ยนไป Claude/Cerebras/Gemini ภายหลังได้โดยไม่แตะ `chatbot.service.ts`

**ส่ง catalog ของร้านเข้า prompt ให้โมเดลเลือก `shopProductId` จากลิสต์** แทนที่จะให้อ่านชื่อไทยเองอิสระ
งานของ LLM เลยเหลือแค่ "จับคู่กับตัวเลือกที่ป้อนให้" ซึ่งโมเดลเล็กอย่าง `gpt-oss:20b` ทำได้แม่นพอ
แม้ภาษาไทยจะไม่ใช่จุดแข็ง

#### ⚠️ `gpt-oss:20b-cloud` ไม่สนใจพารามิเตอร์ `format` — ต้องใช้ few-shot prompt

ตอนเทสจริงพบว่าส่ง JSON schema ผ่าน `format` เข้า Ollama **ไม่ได้บังคับโครงสร้างจริง**
โมเดลคืน object แบนๆ ที่ลอกโครงจาก input มาแทน (`{"shopProductId":...,"quantity":10}`
ไม่มีคีย์ `items` ห่อ และใช้ `quantity` แทน `qtyChange`) และบางครั้งครอบด้วย markdown code fence

ทางแก้ที่ใช้จริงคือ **ใส่ตัวอย่าง input/output ลงใน system prompt (few-shot)**
โดยสร้างตัวอย่างจากสินค้า 2 ตัวแรกใน catalog ของร้านนั้นเอง (`buildExamples()`)
เพื่อให้โมเดลเห็นรูปแบบ id จริง หลังแก้แล้วตีความถูกทั้งเพิ่ม ลด และเคสที่ต้องปฏิเสธไม่เดา

ยังส่ง `format` ไปด้วยเพราะไม่เสียหาย และโมเดลที่รองรับจริง (เช่น `qwen3.5`) จะได้ประโยชน์

ป้องกัน LLM มั่ว 4 ชั้น:
- `format` ส่ง JSON schema (โมเดลที่รองรับจะบังคับให้ — ตัวที่ไม่รองรับก็ไม่พัง)
- `extractJson()` ตัด markdown code fence ออกก่อน `JSON.parse()`
- `.parse()` ด้วย zod ตามที่ AGENTS.md สั่ง
- กรองผลลัพธ์ทิ้งถ้า `shopProductId` ไม่ได้อยู่ใน catalog จริง หรือ `qtyChange = 0`
  (กันโมเดลลอก id จากตัวอย่างใน prompt มาตอบ)

ทุก failure ถูก `logger.error` พร้อม stack — ตอนเทสครั้งแรก error ถูกกลืนหายทำให้หาสาเหตุไม่เจอ
ถ้าแชทบอทตอบ `❌` ให้ดู log ก่อนเสมอ

**ตีความไม่สำเร็จไม่ throw ทิ้ง** — บันทึกเป็น `status = FAILED` + `error_reason` เพื่อให้ยังมีประวัติว่า
ผู้ใช้พิมพ์อะไรแล้วระบบพลาดตรงไหน

### ทำไมต้อง persist `pending_stock_actions`

ถ้าเก็บผลตีความไว้ใน memory ผู้ใช้กดยืนยันจาก LINE อีก 5 นาทีถัดมา (คนละ request คนละ process)
จะไม่มีอะไรให้ยืนยัน — SRS §162-165 บังคับให้ลง DB

`expires_at` = 15 นาที กันผู้ใช้กดยืนยันของเก่าข้ามวัน ยืนยันหลังหมดอายุจะ mark `EXPIRED` แทน

## Environment

```
OLLAMA_HOST=https://ollama.com
OLLAMA_API_KEY=<key>
OLLAMA_MODEL=gpt-oss:20b-cloud
```

ทั้งสามตัวเป็น **`.optional()`** ใน `config/env.validation.ts` โดยตั้งใจ — ถ้าเป็น required
ทีมที่ยังไม่มี key จะบูตแอปไม่ขึ้นทั้งทีม โมดูลนี้จะโยน `LLM_NOT_CONFIGURED` (503) ตอนเรียกใช้เองแทน

`gpt-oss:20b` เป็น level 1 (light) ของ Ollama Cloud กินโควตา GPU-time น้อย เหมาะกับ free tier
ถ้าตีความภาษาไทยพลาดบ่อย เปลี่ยนเป็น `qwen3.5:cloud` ได้ — **แก้ env var ตัวเดียว ไม่ต้องแตะโค้ด**

## Schema ที่โมดูลนี้เพิ่ม

`PendingStockAction`, `ChatMessage`, enum `ChatChannel` / `ChatRole` / `PendingActionStatus`
ตรงตาม `prisma/design/schema.dbml` ที่ review กับ SRS แล้ว

พร้อมเพิ่ม **`chatbotEnabled` / `barcodeEnabled` / `aiRecommendationEnabled` ใน `SubscriptionPlan`**
ซึ่งมีใน DBML อยู่แล้วแต่ `schema.prisma` ยังไม่มี (ไม่ใช่ดีไซน์ใหม่ — แค่ทำให้ตามทัน)

> **พี่ปาน**: ตอน seed 3 แพ็กเกจ ต้องตั้ง `chatbot_enabled = true` ให้ PLUS/PRO
> ไม่งั้น default `false` จะบล็อกแชทบอททุกคนแม้แต่ PRO

## ยังไม่ได้ทำ

- **ตัดสต็อกจริง** — รอ `stock_movements` (พี่ดิว) ดูหัวข้อข้อจำกัดด้านบน
- **LINE** — `POST /webhooks/line` เป็นโครงเปล่า ทีมตัดสินใจเน้นเว็บก่อนเดโม 28 ส.ค.
  ขั้นตอนที่ต้องทำเขียนไว้ใน `line-webhook.controller.ts` แล้ว
  ตอนต่อจริงต้องเช็ค `users.line_user_id` สดทุกครั้ง ห้าม cache (SRS §31, §91)
- **แก้จำนวนก่อนยืนยัน** — SRS §165 บอกว่าผู้ใช้ควรแก้ได้ ตอนนี้ทำได้แค่ยกเลิกแล้วพิมพ์ใหม่
- **Socket.io realtime** — ยังไม่ push ผลผ่าน websocket
