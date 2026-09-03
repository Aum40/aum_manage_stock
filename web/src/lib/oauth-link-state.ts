import 'server-only';
import type { OAuthProvider } from '@/lib/oauth-state';

/**
 * cookie ของ state สำหรับ "ผูกบัญชีเข้ากับบัญชีที่ล็อกอินอยู่" แยกชื่อจาก state
 * ของการเข้าสู่ระบบ (oauth_state_*) เพราะ callback ใช้เส้นเดียวกัน — ตัวที่บอกว่า
 * รอบนี้คือผูกบัญชีหรือเข้าสู่ระบบคือ cookie ใบไหนที่ตรงกับ state ที่ผู้ให้บริการ
 * ส่งกลับมา
 */
export function linkStateCookieName(provider: OAuthProvider): string {
  return `oauth_link_state_${provider}`;
}
