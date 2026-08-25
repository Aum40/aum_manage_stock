# ai-recommendations (อั้ม)

คำแนะนำจาก AI เรื่องเติมสต็อก / ระบายสต็อก / จัดโปรโมชัน — **Pro Plan เท่านั้น**

สถานะ: **ยังไม่ merge** — อยู่บน `feature/ai-recommendations-resource`

## Endpoints

| Method | Path | หมายเหตุ |
|---|---|---|
| GET | `/shops/:shopId/ai/recommendations` | `?includeDismissed=&limit=` — อ่านจาก cache **ไม่เรียก LLM** |
| POST | `/shops/:shopId/ai/recommendations/generate` | สร้างรอบใหม่ทับของเดิม แล้ว push ผ่าน WebSocket |
| PATCH | `/ai/recommendations/:id/dismiss` | ปิดคำแนะนำ (ไม่มี `shopId` ใน path — ดูหัวข้อการตรวจสิทธิ์) |
| WS | `/ws/shops` (namespace) | รับ event realtime ต่อร้าน |

path ตรงตาม endpoint sheet

> โค้ดในโมดูลนี้มี comment เฉพาะจุดที่เหตุผลไม่ชัดจากตัวโค้ด — ที่เหลืออยู่ใน README นี้

## การตรวจสิทธิ์ — สองชั้นตาม AGENTS.md

`ai-access.service.ts` เขียนเองในโมดูล ตามแบบเดียวกับ `chat/chat-access.service.ts`

1. `AccountContextService.resolve()` — resolve `users.owner_id ?? users.id`
2. ร้านเป็นของ owner + `status = ACTIVE` — **ร้านคนอื่นคืน 404 ไม่ใช่ 403** ไม่บอกใบ้ว่า shopId มีจริง
3. ถ้าเป็นพนักงาน → ต้อง assign กับร้านนี้ + `staff_permissions.can_view_ai_insight`
4. **plan gate `subscription_plans.ai_recommendation_enabled`** ← Pro เท่านั้น ไม่ใช่ Plus (SRS §179, §181)
5. `generate`/`dismiss` เพิ่ม `assertNotReadOnly()` เพราะเป็นการเขียนข้อมูล ส่วน `list` อ่านได้แม้ read-only

**เจ้าของร้านเปิด `can_view_ai_insight` ให้พนักงานบนแพ็กเกจ Plus ได้ แต่ชั้นแพ็กเกจต้องบล็อกอยู่ดี** — ผ่านชั้นเดียวถือเป็นบั๊ก

### `dismiss` ไม่มี `shopId` ใน path

endpoint sheet กำหนดเป็น `/ai/recommendations/:id/dismiss` จึงต้อง**โหลด recommendation ก่อนเพื่อหา `shopId` แล้วค่อยตรวจสิทธิ์** ถ้าไม่ทำ ใครก็ dismiss คำแนะนำของร้านคนอื่นได้ (ทดสอบเคสนี้แล้ว → 404)

## LLM + fallback

`RECOMMENDATION_GENERATOR` Symbol → `FallbackRecommendationGenerator` (แบบเดียวกับ `STOCK_COMMAND_PARSER` ของ chat-command)

- `llm-recommendation.generator.ts` — Ollama, มี `isEnabled()` เช็ค env
- `rule-based-recommendation.generator.ts` — กฎล้วน: สต็อก ≤ จุดแจ้งเตือน → `RESTOCK`, ไม่ขายเกิน 30 วัน/ไม่เคยขาย แต่มีของค้าง → `CLEARANCE`
- `fallback-recommendation.generator.ts` — ลอง LLM ก่อน **ถ้าล้ม/ไม่มี env/คืน array ว่าง → ตกไปใช้กฎ**

**ทำไมต้อง fallback แม้ LLM คืน array ว่าง**: array ว่างอาจแปลว่า "ไม่มีประเด็น" หรือ "โมเดลตอบพลาด" ก็ได้ ถ้าเชื่อโมเดลอย่างเดียวแดชบอร์ดอาจว่างเปล่าทั้งที่มีของใกล้หมดจริง กฎจึงยืนยันอีกชั้น

**ป้องกันโมเดลมั่ว**: `format` JSON schema → `extractJson()` ตัด markdown fence → zod `.parse()` → **กรองทิ้งถ้า `productName` ไม่มีอยู่จริงใน metrics** (โมเดลชอบแต่งชื่อสินค้าเอง)

## ตัวเลขที่ใช้ตั้งต้น

`collectMetrics()` ดึงจากฐานข้อมูลจริง แล้วเก็บลง `ai_recommendations.metrics` เพื่อให้ตรวจย้อนหลังได้ว่าคำแนะนำอ้างอิงอะไร:

- `stockQty` / `lowStockThreshold` จาก `shop_products`
- `soldLast30Days` — `groupBy` `sale_items` ที่ `sale.status = COMPLETED` ใน 30 วัน
- `daysSinceLastSale` — `null` = ไม่เคยขายเลย

## WebSocket — Gateway ตัวแรกของโปรเจกต์

โปรเจกต์นี้ยังไม่เคยมี WebSocket มาก่อน pattern ที่วางไว้:

```ts
io('http://host/ws/shops', { auth: { token: '<JWT>', shopId: '<uuid>' } })
```

- **socket.io ไม่ route ด้วย path parameter** จึงรับ `shopId` ทาง handshake แทน แล้วใช้ room `shop:<shopId>`
- **`AuthGuard` ของ HTTP ไม่ครอบ WebSocket** ต้อง verify JWT เองใน `handleConnection` ด้วย `AccessTokenService` (`AuthModule` export ให้แล้ว)
- ตรวจสิทธิ์ระดับร้านก่อน `join` room เสมอ ไม่งั้นใครก็เข้าห้องร้านคนอื่นแล้วดูคำแนะนำได้
- event: `connected`, `unauthorized`, `recommendations.updated`, `recommendations.dismissed`

## การสร้างรอบใหม่ทับของเดิม

`generate()` **ลบคำแนะนำที่ยังไม่ถูก dismiss ทิ้งทั้งชุดก่อน** แล้วสร้างใหม่ในทรานแซกชันเดียว เพราะคำแนะนำเก่าอ้างตัวเลขที่ไม่ตรงกับสต็อกปัจจุบันแล้ว ส่วนที่ dismiss ไปแล้วเก็บไว้ให้ดูย้อนหลังผ่าน `?includeDismissed=true`

`validUntil` = 7 วัน หลังจากนั้นถือว่าตัวเลขที่อ้างเก่าเกินจะเชื่อถือ

## ผลทดสอบจริง

| เคส | ผล |
|---|---|
| Plus Plan | `403 AI_NOT_IN_PLAN` ✅ |
| ร้านคนอื่น | `404` ✅ |
| ไม่มี token | `401` ✅ |
| `generate` ด้วย LLM จริง | ได้ RESTOCK + CLEARANCE อ้างตัวเลขถูกต้อง ✅ |
| ปิด `OLLAMA_HOST` | ตกไปใช้กฎ ได้คำแนะนำเหมือนกัน ✅ |
| `dismiss` | หายจาก list, เห็นได้ด้วย `includeDismissed=true` ✅ |
| คนอื่น `dismiss` ของร้านเรา | `404` ✅ |

unit test 8 เคสใน `fallback-recommendation.generator.spec.ts`

## ยังไม่ได้ทำ

- **regenerate อัตโนมัติตาม event** — SRS §180 บอกว่าควร regenerate เมื่อสต็อก/ยอดขายเปลี่ยน ตอนนี้ต้องกด `POST /generate` เอง (มี WebSocket push ให้แล้วเมื่อ generate)
- **`PROMOTION`** — กฎยังไม่ครอบ (LLM สร้างได้ถ้าเห็นว่าเหมาะ) ต้องนิยามเกณฑ์ให้ชัดก่อน
- ยังไม่มี e2e test ของ WebSocket เพราะ `socket.io-client` ไม่ได้ติดตั้งใน `api/` และการเพิ่ม dependency ต้องแยก PR ตาม AGENTS.md
