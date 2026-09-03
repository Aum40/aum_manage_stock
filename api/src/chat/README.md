# chat (อั้ม)

ผิวแชท AI สำหรับปรับสต็อก — ประวัติแชท + ตรวจสิทธิ์แชทบอท 2 ชั้น
**งานตัดสต็อกจริงทั้งหมดเป็นของ `../chat-command` (พี่ดิว) โมดูลนี้ไม่ทำซ้ำ**

สถานะ: **ยังไม่ merge** — อยู่บน `feature/chatbot-resource`

## Endpoints

| Method | Path | หมายเหตุ |
|---|---|---|
| POST | `/shops/:shopId/chat/messages` | body: `content` — เช็คสิทธิ์ → บันทึกข้อความ → ส่งต่อ `ChatCommandService.create()` → บันทึกคำตอบ |
| GET | `/shops/:shopId/chat/messages` | `?limit=` (default 50) เรียงใหม่ไปเก่า |

**ยืนยัน/ยกเลิก/แก้ไข ใช้ endpoint เดิมของพี่ดิว ไม่ทำซ้ำ:**
`POST|PATCH|DELETE /shops/:shopId/stock/chat-command/:pendingId[/confirm]`

> โค้ดในโมดูลนี้ไม่มี comment ในไฟล์โดยตั้งใจ — เหตุผลอยู่ใน README นี้

## ทำไมถึงไม่สร้างโมดูลแชทเต็มรูปแบบ

แผนเดิมจะสร้าง `ChatbotModule` แยกทั้งชุด (pending action, confirm, LINE webhook ของตัวเอง)
แต่พอ PR #16/#18 ของพี่ดิวเข้า `dev` พบว่าทับซ้อนกันหมด — `PendingAction`, `enum PendingActionStatus`,
route `webhooks/line` ชนกันตรงๆ และ `ChatCommandService` ทำ flow ครบแล้ว **พร้อมเขียน
`stock_movements` จริง** งานจึงเปลี่ยนเป็น "เติมสิ่งที่ยังขาด" แทนการสร้างคู่ขนาน

## ส่วนที่เป็นแกนจริงอยู่ที่ `../chat-command/parsers/`

พี่ดิวเปิด port ไว้ให้พอดี — `STOCK_COMMAND_PARSER` + interface `StockCommandParser`
เดิมเสียบด้วย `DeterministicStockCommandParser` (regex) ซึ่งมีข้อจำกัด:

```js
/^(เพิ่ม|เติม|ลด|เอาออก)\s*(.+?)\s+(\d+)(?:\s*\S+)?$/u
```

บังคับต้องมีเว้นวรรคก่อนตัวเลข → **`"เพิ่มโค้ก10"` ซึ่งเป็นตัวอย่างหลักของ SRS เอง parse ไม่ผ่าน**
และพังกับประโยคธรรมชาติ ("ขายโค้กไป 3 กระป๋อง")

เพิ่มเข้าไป 2 ไฟล์:
- `llm-stock-command.parser.ts` — เรียก Ollama คืน `ParsedStockCommand` รูปเดิมเป๊ะ
- `fallback-stock-command.parser.ts` — **ลอง LLM ก่อน ถ้าล้ม/ไม่ได้ตั้ง env ตกไปใช้ regex เสมอ**

แก้ `chat-command.module.ts` แค่ provider เดียว (`STOCK_COMMAND_PARSER` → `FallbackStockCommandParser`)
ซึ่งเป็นการเปลี่ยนที่ port ออกแบบมารองรับพอดี **พฤติกรรมเดิมไม่ regress เพราะ fallback ยังอยู่**

### ทำไมต้องมี fallback

Ollama Cloud free tier ล้มแบบสุ่มจริง (เจอตอนเทส — รอบหนึ่งล้ม รอบถัดมาผ่านโดยไม่แก้อะไร),
concurrency = 1, โควตาคิดตาม GPU-time ไม่ประกาศตัวเลข และเน็ตห้องเดโมอาจล่ม
มี fallback แล้วอย่างน้อยรูปแบบมาตรฐานยังใช้ได้เสมอ

### LLM ต้องใช้ few-shot prompt ไม่ใช่ `format`

**`gpt-oss:20b-cloud` ไม่สนใจพารามิเตอร์ `format` (JSON schema)** — คืน object แบนๆ ที่ลอกโครง
จาก input มาแทน และบางครั้งครอบด้วย markdown code fence ทางแก้ที่ได้ผลจริงคือ
**ใส่ตัวอย่าง input/output ลงใน system prompt** (ดู `SYSTEM_PROMPT`)

ป้องกัน 3 ชั้น: `format` (เผื่อโมเดลที่รองรับ เช่น `qwen3.5`) → `extractJson()` ตัด code fence →
zod `.parse()` → ถ้ายังพังก็ตกไป regex

ไม่ต้องส่ง catalog สินค้าเข้า prompt เพราะ `StockInventoryPort.resolveProduct()` จับคู่ชื่อสินค้าให้อยู่แล้ว
LLM ทำแค่แยกภาษา → **ไม่ต้องแก้ interface ของพี่ดิวเลย**

## การตรวจสิทธิ์ — สองชั้นตาม AGENTS.md

`chat-access.service.ts` เขียนเองเพราะเป็นช่องว่างจริง:
`chat-command.service.ts` **ไม่เช็ค plan gate เลย** และ `PrismaStockAuthorizationAdapter`
เช็ค `canAdjustStockManual` **ไม่ใช่ `can_use_chatbot`**

ลำดับ `assertCanUseChatbot()`:
1. `AccountContextService.resolve()` — reuse ของเซิ่น (`CommonModule` เป็น `@Global()`)
2. ร้านเป็นของ owner + `status = ACTIVE` — **ร้านคนอื่นคืน 404 ไม่ใช่ 403** ตามแบบเซิ่น
3. staff ต้อง assign กับร้านนี้ + `staff_permissions.can_use_chatbot = true`
4. **plan gate `subscription_plans.chatbot_enabled = true`**
5. `assertNotReadOnly()`

`GET` ใช้ `assertCanViewChat()` ซึ่งข้ามข้อ 3-5 (อ่านได้แม้ read-only)

## Schema ที่เพิ่ม

- `model ChatMessage` + `enum ChatRole` — dev ไม่มีประวัติแชท
  ใช้ `PendingActionSource` ของ dev เป็น channel เพื่อไม่สร้าง enum ซ้ำ
- `chatbotEnabled` / `barcodeEnabled` / `aiRecommendationEnabled` ใน `SubscriptionPlan`
  — มีใน `schema.dbml:243-245` อยู่แล้วแต่ `schema.prisma` ตามไม่ทัน

> **พี่ปาน**: ตอน seed 3 แพ็กเกจ ต้องตั้ง `chatbot_enabled = true` ให้ PLUS/PRO
> ไม่งั้น default `false` บล็อกแชทบอททุกคนแม้แต่ PRO (ตอนนี้ยังไม่มี seed ที่ไหนเลยในระบบ)

## Environment

```
OLLAMA_HOST=https://ollama.com
OLLAMA_API_KEY=<key>
OLLAMA_MODEL=gpt-oss:20b-cloud
```

ทั้งสามเป็น **`.optional()`** โดยตั้งใจ — ไม่มีค่า = LLM ปิดตัวเอง ใช้ regex แทน
ทีมที่ยังไม่มี key จึงบูตแอปได้ปกติ ถ้าตีความไทยพลาดบ่อยเปลี่ยนเป็น `qwen3.5:cloud` ได้ทันที

## ผลทดสอบจริง

| เคส | ผล |
|---|---|
| `"เพิ่มโค้ก10"` (ไม่เว้นวรรค) | `INCREASE 10 "โค้ก"` ✅ **regex เดิมทำไม่ได้** |
| `"ขายโค้กไป 3 กระป๋อง"` | `DECREASE 3 "โค้ก"` ✅ |
| `"ลดน้ำเปล่า 5 ขวด"` | `DECREASE 5 "น้ำเปล่า"` ✅ |
| ยืนยัน → ตัดสต็อกจริง | `stock_qty 50 → 57`, `stock_movement` `CHAT_ADJUSTMENT delta=7` ✅ |
| ปิด `OLLAMA_HOST` | ตกไป regex ได้ปกติ ✅ |
| Free Plan | `403 CHATBOT_NOT_IN_PLAN` ✅ |
| ร้านคนอื่น | `404` ✅ |

## ยังไม่ได้ทำ

- **LINE** — `src/line/` เป็นของพี่ดิว endpoint sheet ของ chatbot ระบุ `POST /webhooks/line` ซ้ำ ควรอัปเดต sheet
- **แก้จำนวนก่อนยืนยันผ่านแชท** — ใช้ `PATCH .../chat-command/:pendingId` ของพี่ดิวแทนได้
- **Socket.io realtime**
