/**
 * [อั้ม] เปิดเว็บให้ทดสอบบนมือถือได้ พร้อมล็อกอิน Google
 *
 * ทำไมต้องมีสคริปต์นี้ — สแกนบาร์โค้ดกับล็อกอิน Google ต้องการ https ทั้งคู่:
 *
 *   - เบราว์เซอร์ให้เข้าถึงกล้องเฉพาะ secure context (https หรือ localhost)
 *     http://192.168.1.48:3000 ไม่เข้าข่าย กดเปิดกล้องแล้วจะถูกปฏิเสธ
 *   - Google ไม่รับ IP address เป็น redirect URI เลย รับแค่ localhost กับ
 *     โดเมนจริงที่เป็น https
 *
 * cloudflared แจก https ให้ฟรี แต่ redirect_uri ต้องตรงกันสามที่ ซึ่งเป็นจุดที่
 * พลาดกันบ่อย สคริปต์นี้เลยจัดการสองในสามให้:
 *
 *   1. web ส่งตอนขอ authorize  — ประกอบจาก origin ที่เปิดอยู่ (ตรงเอง)
 *   2. api ส่งตอนแลก token     — ประกอบจาก FRONTEND_URL (สคริปต์แก้ให้)
 *   3. Google Console          — ต้องเข้าไปวางเอง (สคริปต์พิมพ์ให้ก็อป)
 *
 * ใช้: node scripts/mobile-tunnel.mjs
 * ปิด: Ctrl+C — จะคืนค่า FRONTEND_URL กลับเป็นของเดิมให้เอง
 */
import { execSync, spawn } from 'node:child_process';
import { copyFileSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const API_ENV = resolve(ROOT, 'api/.env');
const WEB_PORT = 3000;

const say = (message) => process.stdout.write(`${message}\n`);
const rule = () => say('─'.repeat(68));

/** อ่านบรรทัด FRONTEND_URL ปัจจุบันมาทั้งบรรทัด — ไว้คืนค่าตอนปิด */
function readFrontendUrl() {
  const match = readFileSync(API_ENV, 'utf8').match(/^FRONTEND_URL=.*$/m);
  return match ? match[0] : null;
}

/**
 * แทนที่เฉพาะบรรทัด FRONTEND_URL บรรทัดเดียว ไม่แตะบรรทัดอื่นเลย
 * (.env มีคีย์จริงอยู่ทั้งไฟล์ เขียนทับทั้งไฟล์ทีเดียวคือหายนะ)
 */
function writeFrontendUrl(rawLine) {
  const current = readFileSync(API_ENV, 'utf8');
  const next = /^FRONTEND_URL=.*$/m.test(current)
    ? current.replace(/^FRONTEND_URL=.*$/m, rawLine)
    : `${current.replace(/\s*$/, '')}\n${rawLine}\n`;
  writeFileSync(API_ENV, next);
}

const originalLine = readFrontendUrl();
if (originalLine === null) {
  say('⚠  ไม่พบ FRONTEND_URL ใน api/.env — จะเพิ่มบรรทัดใหม่ให้');
}

// สำรองไว้ก่อนเสมอ ถ้าสคริปต์ตายกลางคันจะได้กู้เองได้
const backup = `${API_ENV}.backup-${Date.now()}`;
copyFileSync(API_ENV, backup);

let restored = false;
function restore() {
  if (restored) return;
  restored = true;
  try {
    if (originalLine) writeFrontendUrl(originalLine);
    say('');
    say(`✔ คืนค่า FRONTEND_URL กลับเป็นของเดิมแล้ว (สำรองไว้ที่ ${backup})`);
    say('  อย่าลืมรีสตาร์ท api อีกครั้ง ให้มันอ่านค่าเดิมกลับไป');
  } catch (cause) {
    say(`⚠ คืนค่าไม่สำเร็จ: ${cause.message}`);
    say(`  กู้เองได้จากไฟล์สำรอง: ${backup}`);
  }
}

function announce(url) {
  const redirectUri = `${url}/api/auth/google/callback`;

  writeFrontendUrl(`FRONTEND_URL="${url}"`);

  say('');
  rule();
  say('  เปิดบนมือถือที่ URL นี้');
  say('');
  say(`     ${url}`);
  say('');
  rule();
  say('');
  say('  ยังเหลืออีก 2 ขั้นถึงจะล็อกอิน Google ได้:');
  say('');
  say('  1) วาง URL นี้ใน Google Cloud Console');
  say('     APIs & Services → Credentials → OAuth client ที่ใช้อยู่');
  say('     ช่อง "Authorized redirect URIs" → ADD URI → วาง → SAVE');
  say('');
  say(`     ${redirectUri}`);
  say('');
  say('     (ของเดิม http://localhost:3000/api/auth/google/callback เก็บไว้');
  say('      ด้วย จะได้ล็อกอินจากคอมได้เหมือนเดิม)');
  say('');
  say('  2) รีสตาร์ท api ใหม่ 1 รอบ');
  say('     FRONTEND_URL ถูกแก้ให้แล้ว แต่ NestJS อ่าน env ตอนบูตเท่านั้น');
  say('     ไม่รีสตาร์ทก็ยังใช้ค่าเก่าอยู่');
  say('');
  say('  ⚠ URL นี้เปิดสู่อินเทอร์เน็ตสาธารณะจริง ใครได้ไปก็เข้าถึงหน้า login ได้');
  say('    ปิดเมื่อเลิกใช้ครับ');
  say('');
}

/**
 * หา quick tunnel ที่เปิดค้างอยู่แล้ว แทนที่จะเปิดใหม่ทุกครั้ง
 *
 * quick tunnel สุ่ม subdomain ใหม่ทุกครั้งที่เปิด และ URL ใหม่แปลว่าต้องกลับไป
 * ลงทะเบียนใน Google Console ใหม่ด้วย — ตัวที่เปิดค้างอยู่จึงมีค่ากว่าตัวใหม่
 *
 * cloudflared เปิด metrics server ไว้ที่ localhost พอร์ตสุ่ม และมี /quicktunnel
 * ที่บอก hostname ของตัวเอง กวาดพอร์ตที่ process มันฟังอยู่แล้วถามทีละตัว
 */
async function findRunningTunnel() {
  let pids = [];
  try {
    const out = execSync(
      'tasklist /FI "IMAGENAME eq cloudflared.exe" /FO CSV /NH',
      { encoding: 'utf8' },
    );
    pids = [...out.matchAll(/"cloudflared\.exe","(\d+)"/g)].map((m) => m[1]);
  } catch {
    return null;
  }
  if (pids.length === 0) return null;

  let ports = [];
  try {
    const out = execSync('netstat -ano -p TCP', { encoding: 'utf8' });
    ports = out
      .split(/\r?\n/)
      .filter(
        (l) =>
          l.includes('LISTENING') && pids.some((pid) => l.trim().endsWith(pid)),
      )
      .map((l) => l.match(/127\.0\.0\.1:(\d+)/)?.[1])
      .filter(Boolean);
  } catch {
    return null;
  }

  for (const port of ports) {
    try {
      const res = await fetch(`http://127.0.0.1:${port}/quicktunnel`);
      const found = (await res.text()).match(/[a-z0-9-]+\.trycloudflare\.com/i);
      if (found) return `https://${found[0]}`;
    } catch {
      // ไม่ใช่ metrics server ของ cloudflared ข้ามไป
    }
  }
  return null;
}

const existing = await findRunningTunnel();

if (existing) {
  say('');
  say('พบ tunnel ที่เปิดค้างอยู่แล้ว — ใช้ตัวเดิมต่อ ไม่เปิดใหม่');
  say('(เปิดใหม่จะได้ URL ใหม่ แล้วต้องไปลงทะเบียนใน Google Console ใหม่อีกรอบ)');
  announce(existing);
  say('  สคริปต์นี้จบการทำงานแล้ว — tunnel เดิมยังรันอยู่ในหน้าต่างของมันเอง');
  say('  ปิด tunnel เมื่อไหร่ ให้คืนค่าบรรทัดนี้ใน api/.env เอง:');
  say(`     ${originalLine ?? 'FRONTEND_URL="http://localhost:3000"'}`);
  say('');
  restored = true; // tunnel ยังใช้งานอยู่ ห้ามคืนค่าตอนจบ
  process.exit(0);
}

say('');
say(`ไม่พบ tunnel ที่เปิดอยู่ — กำลังเปิดใหม่ไปที่ http://localhost:${WEB_PORT} ...`);

const tunnel = spawn(
  'cloudflared',
  ['tunnel', '--url', `http://localhost:${WEB_PORT}`],
  { shell: true },
);

let announced = false;

function onOutput(chunk) {
  if (announced) return;

  // cloudflared พ่น URL ออกทาง stderr ไม่ใช่ stdout
  const found = chunk
    .toString()
    .match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i);
  if (!found) return;

  announced = true;
  announce(found[0]);
  say('  ปิดด้วย Ctrl+C — จะคืนค่า FRONTEND_URL ให้เอง');
  say('');
}

tunnel.stdout.on('data', onOutput);
tunnel.stderr.on('data', onOutput);

tunnel.on('error', (cause) => {
  say(`⚠ เรียก cloudflared ไม่ได้: ${cause.message}`);
  say('  ตรวจว่าติดตั้งไว้แล้วและอยู่ใน PATH');
  restore();
  process.exit(1);
});

tunnel.on('exit', (code) => {
  say(`\ncloudflared ปิดตัวลง (exit ${code})`);
  restore();
  process.exit(code ?? 0);
});

for (const signal of ['SIGINT', 'SIGTERM', 'SIGHUP']) {
  process.on(signal, () => {
    restore();
    tunnel.kill();
    process.exit(0);
  });
}
