# notifications (เซิ่น)

การแจ้งเตือนในระบบ — ผู้รับคือ **ผู้ใช้รายคน** (`notifications.user_id`) ไม่ใช่ระดับร้าน
พนักงานกับเจ้าของร้านจึงเห็นคนละกล่อง แม้จะอยู่ร้านเดียวกัน

Branch: `feature/notifications-resource` (endpoint sheet แถว 87-89)
ในชีทช่อง Name เขียนว่า "ทีม (Phase 2)" — ไม่ได้ระบุเจ้าของ **เซิ่นอาสารับไปทำ แจ้งทีมแล้ว**

> โค้ดในโมดูลนี้ไม่มี comment ในไฟล์โดยตั้งใจ — เหตุผลเบื้องหลังทุกอย่างอยู่ใน README นี้

## Endpoints

| Method | Path                      | หมายเหตุ                                                   |
| ------ | ------------------------- | ---------------------------------------------------------- |
| GET    | `/notifications`          | `?unreadOnly=&type=&shopId=&page=&limit=` เรียงใหม่สุดก่อน |
| PATCH  | `/notifications/:id/read` | idempotent — อ่านซ้ำไม่เขียนทับเวลาเดิม                    |
| PATCH  | `/notifications/read-all` | คืน `{ updated: n }`                                       |

## auth

ทุก endpoint อยู่หลัง `AuthGuard` ที่เป็น global guard ต้องแนบ
`Authorization: Bearer <accessToken>` จาก `POST /auth/login`

ใช้ `@CurrentUser('sub')` **ไม่ใช่ `@OwnerId()`** — กล่องแจ้งเตือนผูกกับ
`notifications.user_id` เป็นของรายคน ถ้าใช้ `@OwnerId()` พนักงานจะ resolve เป็น
`users.owner_id` แล้วเปิดมาเห็นกล่องของเจ้าของร้าน และกด `read-all`
ล้างของเจ้าของร้านทิ้งได้ เหตุผลเดียวกับที่ `products` / `shop-products` ใช้ตัวนี้

`GET` คืน `meta.unreadCount` มาด้วยเสมอ (นับจากทั้งกล่อง ไม่ขึ้นกับ filter) เพื่อให้ frontend
เอาไปขึ้น badge ตัวเลขบนกระดิ่งได้โดยไม่ต้องยิงซ้ำอีกรอบ

**ลำดับ route สำคัญ** — `@Patch('read-all')` ต้องประกาศ**ก่อน** `@Patch(':id/read')`
ไม่งั้น NestJS จะจับ `read-all` เป็น `:id` แล้ว `ParseUUIDPipe` จะเด้ง 400

## ใครสร้าง notification

3 endpoint ข้างบนเป็นฝั่ง **อ่านล้วน** ตามชีท — ไม่มี endpoint สำหรับสร้าง
ตัวสร้างคือ `NotificationsService` ที่โมดูลอื่นเรียกใช้

```ts
constructor(private readonly notifications: NotificationsService) {}

await this.notifications.emit({
  userId: ownerId,
  type: NOTIFICATION_TYPE.LOW_STOCK,
  shopId,
  title: 'สต็อกใกล้หมด',
  message: 'โค้ก 325ml เหลือ 2 ชิ้น',
  payload: { shopProductId, stockQty: 2 },
  dedupeWhileUnread: true,
});
```

| เมธอด      | พฤติกรรม                       | ใช้เมื่อไหร่                                    |
| ---------- | ------------------------------ | ----------------------------------------------- |
| `create()` | โยน error ถ้าสร้างไม่สำเร็จ    | เมื่อการแจ้งเตือนคือผลลัพธ์หลักของ request      |
| `emit()`   | **กลืน error + log** ไม่โยนต่อ | เมื่อแจ้งเตือนเป็นผลพลอยได้ — ใช้ตัวนี้เป็นหลัก |

`emit()` มีไว้เพื่อไม่ให้ฟีเจอร์เสริมทำ request หลักพัง ถ้าตาราง `notifications` มีปัญหา
การเพิ่มสินค้าหรือตัดสต็อกต้องยังทำงานได้ตามปกติ

`dedupeWhileUnread: true` = ถ้ายังมีใบชนิดเดียวกันของร้านเดียวกันค้างไม่อ่านอยู่ ให้คืนใบเดิม
ไม่สร้างซ้ำ — กันกล่องเต็มไปด้วยข้อความเดียวกันตอนผู้ใช้กดเพิ่มสินค้ารัวๆ ตอนโควตาเต็ม

## trigger ที่ต่อไว้แล้ว

| type                    | ต่อแล้วหรือยัง | ยิงจากไหน                                                |
| ----------------------- | -------------- | -------------------------------------------------------- |
| `PRODUCT_LIMIT_REACHED` | ✅             | `products.service.ts` ตอน quota เต็ม                     |
| `LOW_STOCK`             | ❌             | ต้องยิงตอนสต็อกลด = `stock-movements` / `sales` (พี่ดิว) |
| `SUBSCRIPTION_EXPIRING` | ❌             | ต้องมี cron อ่าน `subscriptions.expires_at` (พี่ปาน)     |
| `SUBSCRIPTION_EXPIRED`  | ❌             | เหมือนข้างบน                                             |
| `SHOP_LIMIT_REACHED`    | ❌             | `shops.service.ts` ตอน shop quota เต็ม (พี่ปาน)          |
| `ACCOUNT_SUSPENDED`     | ❌             | `admin` ตอนระงับบัญชี (แพรว)                             |

ที่ต่อได้แค่ตัวเดียวเพราะอีก 5 ตัวต้องแก้ไฟล์ของคนอื่น ซึ่ง AGENTS.md ห้าม
**แต่ละเจ้าของโมดูลเติมเองได้ด้วยโค้ด 5 บรรทัดตามตัวอย่างข้างบน** — inject `NotificationsService`
แล้วเรียก `emit()` โดยไม่ต้องแก้อะไรในโมดูลนี้เลย

## schema

`model Notification` + `enum NotificationType` เพิ่มตาม `prisma/design/schema.dbml`
(`Enum notification_type` บรรทัด 114 / `Table notifications` บรรทัด 624) รวมถึง
index `idx_notification_unread` บน `(user_id, read_at)` ตาม DBML

`shop_id` เป็น nullable โดยตั้งใจ — การแจ้งเตือนบางชนิดไม่ผูกกับร้าน
เช่น `SUBSCRIPTION_EXPIRING` และ `ACCOUNT_SUSPENDED` เป็นเรื่องระดับบัญชี

## ที่ยังไม่ได้ทำ

- **ยังไม่ push ผ่าน Socket.io** — frontend ต้อง poll `GET /notifications` เอง
  realtime push อยู่ในขอบเขต `feature/ai-recommendations-resource` แถว 86 (`WS /ws/shops/:shopId`)
  ซึ่งยังไม่มีเจ้าของ ถ้าใครทำแล้วให้ยิง event ตอน `create()` สำเร็จ
- ไม่มี endpoint ลบการแจ้งเตือน — ชีทไม่ได้ระบุไว้
- ยังไม่มีนโยบายลบของเก่า ถ้าปล่อยไว้นานตารางจะโตเรื่อยๆ
