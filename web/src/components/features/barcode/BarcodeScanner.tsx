"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/LocaleContext";

/**
 * [อั้ม] สแกนบาร์โค้ดด้วยกล้อง ใช้ร่วมกันทุกหน้า (POS, รับของเข้า, เพิ่มสินค้า)
 *
 * ข้อจำกัดที่ทำให้ต้องเขียนแบบนี้:
 *
 * 1. html5-qrcode แตะ window/navigator ตั้งแต่ตอน import — ต้อง import แบบ
 *    dynamic ข้างใน useEffect ไม่งั้น `next build` พังตอน prerender
 * 2. ไม่เปิดกล้องอัตโนมัติ เพราะจะเด้งขอสิทธิ์ทันทีที่เข้าหน้า ทั้งที่ผู้ใช้
 *    อาจแค่มาดูรายการเฉยๆ — ให้กดปุ่มเอง
 * 3. กล้องอ่านได้หลายเฟรมต่อวินาที ยิงครั้งเดียวจะยิง onScan รัวเป็นสิบครั้ง
 *    ต้องกันด้วย cooldown ไม่งั้นตอนนับของจะบวกเกินจริงมหาศาล
 */

/** ยิงบาร์โค้ดเดิมซ้ำได้อีกครั้งหลังผ่านไปเท่านี้ (มิลลิวินาที) */
const RESCAN_COOLDOWN_MS = 1200;

const ELEMENT_ID = "barcode-scanner-region";

const content = {
  th: {
    start: "เปิดกล้องสแกน",
    stop: "ปิดกล้อง",
    starting: "กำลังเปิดกล้อง...",
    hint: "เล็งกล้องไปที่บาร์โค้ดสินค้า",
    formats: "รองรับ EAN-13, EAN-8, UPC, CODE-128 และ QR",
    switchCamera: "สลับกล้อง",
    denied:
      "ไม่ได้รับสิทธิ์ใช้กล้อง — กดไอคอนกล้องบนแถบที่อยู่เว็บแล้วอนุญาต จากนั้นลองใหม่",
    noCamera: "ไม่พบกล้องในเครื่องนี้ พิมพ์บาร์โค้ดเองได้ที่ช่องด้านล่าง",
    insecure:
      "เบราว์เซอร์ให้ใช้กล้องเฉพาะเว็บที่เป็น https หรือ localhost เท่านั้น",
    failed: "เปิดกล้องไม่สำเร็จ ลองใหม่อีกครั้ง หรือพิมพ์บาร์โค้ดเอง",
  },
  en: {
    start: "Start camera",
    stop: "Stop camera",
    starting: "Starting camera...",
    hint: "Point the camera at the product barcode",
    formats: "Supports EAN-13, EAN-8, UPC, CODE-128 and QR",
    switchCamera: "Switch camera",
    denied:
      "Camera permission denied — allow it from the camera icon in the address bar, then try again.",
    noCamera: "No camera found on this device. Type the barcode below instead.",
    insecure: "Browsers only allow camera access over https or localhost.",
    failed: "Could not start the camera. Try again, or type the barcode.",
  },
};

interface BarcodeScannerProps {
  /** เรียกทุกครั้งที่อ่านบาร์โค้ดได้ (กัน cooldown ให้แล้ว) */
  onScan: (barcode: string) => void;
  /** ปิดกล้องเองหลังอ่านได้ 1 ครั้ง — ใช้ตอนกรอกฟอร์มที่ต้องการเลขเดียว */
  stopAfterFirstScan?: boolean;
}

type CameraInfo = { id: string; label: string };

export default function BarcodeScanner({
  onScan,
  stopAfterFirstScan = false,
}: BarcodeScannerProps) {
  const { locale } = useLocale();
  const t = content[locale];

  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [cameraIndex, setCameraIndex] = useState(0);

  // เก็บ instance ไว้นอก state — เปลี่ยนค่าแล้วไม่ต้อง re-render และต้องใช้
  // ตอน cleanup ซึ่ง state ที่เป็น snapshot เก่าจะเข้าไม่ถึงตัวล่าสุด
  const scannerRef = useRef<{ stop: () => Promise<void>; clear: () => void } | null>(null);
  const lastScanRef = useRef<{ value: string; at: number } | null>(null);
  const onScanRef = useRef(onScan);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stop = async () => {
    const scanner = scannerRef.current;
    scannerRef.current = null;

    if (!scanner) return;

    try {
      await scanner.stop();
      scanner.clear();
    } catch {
      // กล้องอาจถูกปิดไปแล้ว (ผู้ใช้เปลี่ยนแท็บ/ถอดกล้อง) ไม่ต้องทำอะไรต่อ
    }

    setIsRunning(false);
  };

  // ปิดกล้องเมื่อออกจากหน้า ไม่งั้นไฟกล้องยังติดค้างแม้เปลี่ยนหน้าไปแล้ว
  useEffect(() => {
    return () => {
      void scannerRef.current?.stop().catch(() => undefined);
      scannerRef.current = null;
    };
  }, []);

  const start = async (index = cameraIndex) => {
    setError(null);
    setIsStarting(true);

    try {
      if (!window.isSecureContext) {
        setError(t.insecure);
        return;
      }

      const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
        "html5-qrcode"
      );

      const devices = await Html5Qrcode.getCameras();
      if (devices.length === 0) {
        setError(t.noCamera);
        return;
      }

      setCameras(devices.map((d) => ({ id: d.id, label: d.label })));
      const target = devices[index] ?? devices[0];

      const scanner = new Html5Qrcode(ELEMENT_ID, {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.ITF,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      await scanner.start(
        target.id,
        {
          fps: 10,
          /**
           * กรอบต้องเกือบเต็มภาพ เพราะ html5-qrcode อ่านเฉพาะพื้นที่ในกรอบนี้
           * เท่านั้น ที่เหลือมันตัดทิ้งก่อนถอดรหัส
           *
           * เคยตั้งเป็นแถบกว้างเตี้ยตามรูปทรงบาร์โค้ด EAN แต่ QR เป็นสี่เหลี่ยม
           * จัตุรัส ยกให้กล้องดูแล้วโดนตัดบน-ล่างทิ้ง เลยอ่านไม่ออกสักที
           * ต้องรับได้ทั้งสองทรง จึงกินพื้นที่เกือบทั้งภาพไปเลย
           *
           * คำนวณจากขนาดภาพจริงเสมอ ไม่ fix เป็นตัวเลข — ถ้ากรอบใหญ่กว่าภาพ
           * ที่กล้องส่งมา html5-qrcode จะโยน error ทิ้ง
           */
          qrbox: (viewWidth: number, viewHeight: number) => ({
            width: Math.floor(viewWidth * 0.9),
            height: Math.floor(viewHeight * 0.9),
          }),
        },
        (decoded) => {
          const now = Date.now();
          const last = lastScanRef.current;

          // กล้องอ่านซ้ำหลายเฟรมต่อวินาที — นับเป็นครั้งเดียวจนกว่าจะพ้น cooldown
          if (last && last.value === decoded && now - last.at < RESCAN_COOLDOWN_MS) {
            return;
          }

          lastScanRef.current = { value: decoded, at: now };
          onScanRef.current(decoded);

          if (stopAfterFirstScan) void stop();
        },
        () => {
          // callback นี้ยิงทุกเฟรมที่อ่านไม่ออก ซึ่งเป็นเรื่องปกติระหว่างเล็งกล้อง
          // ถ้า log จะท่วม console ทันที
        },
      );

      scannerRef.current = scanner;
      setCameraIndex(index);
      setIsRunning(true);
    } catch (cause) {
      const name = (cause as { name?: string })?.name ?? "";
      const detail =
        typeof cause === "string" ? cause : ((cause as Error)?.message ?? "");

      setError(
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? t.denied
          : name === "NotFoundError"
            ? t.noCamera
            : // ต่อสาเหตุจริงไว้ท้ายด้วย ไม่งั้นทุกปัญหาเหลือข้อความเดียวกันหมด
              `${t.failed}${detail ? ` (${detail})` : ""}`,
      );
    } finally {
      setIsStarting(false);
    }
  };

  const switchCamera = async () => {
    const next = (cameraIndex + 1) % Math.max(cameras.length, 1);
    await stop();
    await start(next);
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="relative flex min-h-52.5 items-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-[#faf9f6]">
        {/*
          div นี้ต้องอยู่ใน DOM และ "มีความกว้างจริง" ตลอดเวลา
          — อยู่ใน DOM เพราะ html5-qrcode หา element ด้วย id ตั้งแต่ตอน new
          — มีความกว้างเพราะตอน start() มันอ่าน clientWidth ไปคำนวณขนาดวิดีโอ
            ถ้าตอนนั้นยังเป็น display:none จะได้ 0 แล้วฝังวิดีโอขนาดศูนย์ลงไป
            (อาการคือกดอนุญาตกล้องแล้วจอหายไปเฉย ๆ)
          ข้อความชวนสแกนเลยต้องวางทับแบบ absolute ไม่ใช่สลับกันแสดง
        */}
        <div
          id={ELEMENT_ID}
          className="w-full [&_video]:w-full [&_video]:rounded-xl"
        />

        {!isRunning && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-4 text-center">
            <div className="absolute inset-x-0 top-1/2 h-0.75 -translate-y-1/2 bg-linear-to-r from-transparent via-primary to-transparent" />
            <div className="z-10 text-[13px] text-muted-foreground">
              {t.hint}
            </div>
            <div className="z-10 text-xs text-border">{t.formats}</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={isRunning ? "outline" : "dark"}
          size="sm"
          disabled={isStarting}
          onClick={() => (isRunning ? void stop() : void start())}
        >
          {isStarting ? t.starting : isRunning ? t.stop : t.start}
        </Button>

        {isRunning && cameras.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void switchCamera()}
          >
            {t.switchCamera}
          </Button>
        )}
      </div>

      {error && (
        <p className="rounded-md border border-status-red/30 bg-status-red/10 px-3 py-2 text-xs text-status-red">
          {error}
        </p>
      )}
    </div>
  );
}
