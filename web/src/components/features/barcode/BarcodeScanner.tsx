"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/LocaleContext";

/**
 * [อั้ม] สแกนบาร์โค้ดด้วยกล้อง ใช้ร่วมกันทุกหน้า (POS, รับของเข้า, เพิ่มสินค้า)
 *
 * ## ทำไมไม่ใช้ html5-qrcode เป็นตัวหลักแล้ว
 *
 * html5-qrcode **ย่อภาพลงเท่าขนาดกรอบบนหน้าจอก่อนถอดรหัส** ดูได้ที่
 * `esm/html5-qrcode.js` บรรทัด ~571 — ปลายทางของ drawImage คือ canvas ขนาด
 * เท่า qrRegion ซึ่งวัดเป็น CSS pixel ของ element ไม่ใช่ความละเอียดของกล้อง
 * กล้องส่งมา 1920px แต่กรอบกว้าง 400px = ทิ้งความละเอียดไป 80% ทุกเฟรม
 *
 * เส้นแคบสุดของ EAN-13 กว้าง 0.33 มม. อยู่แล้ว พอโดนย่ออีกก็เหลือไม่ถึงพิกเซล
 * นี่คือเหตุผลที่แอปกล้องของมือถืออ่านติดง่ายกว่าหน้าเว็บอย่างเห็นได้ชัด
 *
 * ## ทางที่ใช้แทน
 *
 * `BarcodeDetector` ของเบราว์เซอร์ — บน Android Chrome คือ ML Kit ตัวเดียวกับ
 * ที่แอปกล้องใช้ และรับ `<video>` ตรง ๆ ได้ที่ความละเอียดเต็มโดยไม่ต้องย่อ
 * เราจึงคุม getUserMedia กับลูปสแกนเอง เหลือ html5-qrcode ไว้เป็นทางสำรอง
 * สำหรับเบราว์เซอร์ที่ไม่มี BarcodeDetector (เช่น Safari บน iOS)
 *
 * ## ข้อจำกัดอื่นที่ยังต้องระวังเหมือนเดิม
 *
 * - html5-qrcode แตะ window ตั้งแต่ตอน import → ต้อง import ตอนกดเปิดเท่านั้น
 * - กล้องเข้าถึงได้เฉพาะ secure context (https หรือ localhost)
 * - ปิดกล้องทันทีที่อ่านติด กัน "ยิงเบิ้ล" จากของที่บังเอิญเข้ากรอบ
 */

const ELEMENT_ID = "barcode-scanner-fallback-region";

/** ถอดรหัสถี่แค่ไหน — 100ms ทันสายตาและไม่กินซีพียูจนภาพกระตุก */
const SCAN_INTERVAL_MS = 100;

const FORMATS = [
  "ean_13",
  "ean_8",
  "upc_a",
  "upc_e",
  "code_128",
  "code_39",
  "itf",
  "qr_code",
];

type BarcodeDetectorLike = {
  detect: (source: CanvasImageSource) => Promise<{ rawValue: string }[]>;
};

type BarcodeDetectorCtor = {
  new (options?: { formats?: string[] }): BarcodeDetectorLike;
  getSupportedFormats: () => Promise<string[]>;
};

function getDetectorCtor(): BarcodeDetectorCtor | null {
  return (
    (window as unknown as { BarcodeDetector?: BarcodeDetectorCtor })
      .BarcodeDetector ?? null
  );
}

const content = {
  th: {
    start: "เปิดกล้องสแกน",
    scanNext: "สแกนชิ้นถัดไป",
    stop: "ปิดกล้อง",
    starting: "กำลังเปิดกล้อง...",
    formats: "รองรับ EAN-13, EAN-8, UPC, CODE-128 และ QR",
    switchCamera: "สลับกล้อง",
    denied:
      "ไม่ได้รับสิทธิ์ใช้กล้อง — กดไอคอนกล้องบนแถบที่อยู่เว็บแล้วอนุญาต จากนั้นลองใหม่",
    noCamera: "ไม่พบกล้องในเครื่องนี้ พิมพ์บาร์โค้ดเองได้ที่ช่องด้านล่าง",
    insecure:
      "เบราว์เซอร์ให้ใช้กล้องเฉพาะเว็บที่เป็น https หรือ localhost เท่านั้น",
    failed: "เปิดกล้องไม่สำเร็จ ลองใหม่อีกครั้ง หรือพิมพ์บาร์โค้ดเอง",
    diagResolution: "ความละเอียด",
    diagDecoder: "ตัวถอดรหัส",
    diagNative: "ของเบราว์เซอร์ อ่านภาพเต็มความละเอียด",
    diagZxing: "ZXing สำรอง ภาพถูกย่อก่อนอ่าน",
    diagFrames: "อ่านไปแล้ว",
    diagFramesUnit: "เฟรม",
    diagLast: "อ่านได้ล่าสุด",
    torch: "เปิดไฟฉาย",
    torchOff: "ปิดไฟฉาย",
  },
  en: {
    start: "Start camera",
    scanNext: "Scan next item",
    stop: "Stop camera",
    starting: "Starting camera...",
    formats: "Supports EAN-13, EAN-8, UPC, CODE-128 and QR",
    switchCamera: "Switch camera",
    denied:
      "Camera permission denied — allow it from the camera icon in the address bar, then try again.",
    noCamera: "No camera found on this device. Type the barcode below instead.",
    insecure: "Browsers only allow camera access over https or localhost.",
    failed: "Could not start the camera. Try again, or type the barcode.",
    diagResolution: "Resolution",
    diagDecoder: "Decoder",
    diagNative: "Browser native, reads full resolution",
    diagZxing: "ZXing fallback, image is downscaled first",
    diagFrames: "Frames read",
    diagFramesUnit: "",
    diagLast: "Last decoded",
    torch: "Torch on",
    torchOff: "Torch off",
  },
};

interface BarcodeScannerProps {
  /** เรียกเมื่ออ่านบาร์โค้ดได้ */
  onScan: (barcode: string) => void;
  /** ปิดกล้องทันทีที่อ่านติด — ค่าเริ่มต้นคือปิด กัน "ยิงเบิ้ล" */
  stopAfterFirstScan?: boolean;
}

type CameraInfo = { id: string; label: string };

/**
 * หากล้องหลังจากชื่ออุปกรณ์ — บนมือถือกับแท็บเล็ต enumerateDevices มักคืน
 * กล้องหน้ามาเป็นตัวแรก ซึ่งโฟกัสใกล้ไม่ได้และความละเอียดต่ำ อ่านบาร์โค้ดไม่ออก
 *
 * เทียบจากชื่อเพราะ MediaDeviceInfo ไม่มีฟิลด์บอกด้านของกล้องเลย
 */
function pickBackCamera(devices: { label: string }[]): number {
  const back = devices.findIndex((d) =>
    /back|rear|environment|world|หลัง/i.test(d.label),
  );
  if (back >= 0) return back;

  // ไม่มีชื่อให้เดา (บางเบราว์เซอร์ซ่อน label) — ตัวสุดท้ายมักเป็นกล้องหลัง
  const front = devices.findIndex((d) => /front|user|face|หน้า/i.test(d.label));
  if (front === 0 && devices.length > 1) return devices.length - 1;

  return 0;
}

export default function BarcodeScanner({
  onScan,
  stopAfterFirstScan = true,
}: BarcodeScannerProps) {
  const { locale } = useLocale();
  const t = content[locale];

  const [isRunning, setIsRunning] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cameras, setCameras] = useState<CameraInfo[]>([]);
  const [cameraIndex, setCameraIndex] = useState(-1);
  const [resolution, setResolution] = useState<string | null>(null);
  const [usingNative, setUsingNative] = useState<boolean | null>(null);
  const [frames, setFrames] = useState(0);
  const [lastDecoded, setLastDecoded] = useState<string | null>(null);
  const [torchOn, setTorchOn] = useState(false);
  const [torchAvailable, setTorchAvailable] = useState(false);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const detectorRef = useRef<BarcodeDetectorLike | null>(null);
  const fallbackRef = useRef<{
    stop: () => Promise<void>;
    clear: () => void;
  } | null>(null);
  const onScanRef = useRef(onScan);
  // กันยิงซ้ำระหว่างที่ stop() ยัง await อยู่ — ลูปเดินต่อได้อีกหลายรอบในช่วงนั้น
  const doneRef = useRef(false);

  useEffect(() => {
    onScanRef.current = onScan;
  }, [onScan]);

  const stop = async () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }

    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    detectorRef.current = null;

    const fallback = fallbackRef.current;
    fallbackRef.current = null;
    if (fallback) {
      try {
        await fallback.stop();
        fallback.clear();
      } catch {
        // กล้องอาจถูกปิดไปแล้ว ไม่ต้องทำอะไรต่อ
      }
    }

    setIsRunning(false);
    setTorchOn(false);
    setTorchAvailable(false);
  };

  // ปิดกล้องเมื่อออกจากหน้า ไม่งั้นไฟกล้องยังติดค้างแม้เปลี่ยนหน้าไปแล้ว
  useEffect(() => {
    return () => {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (timerRef.current) clearInterval(timerRef.current);
      void fallbackRef.current?.stop().catch(() => undefined);
    };
  }, []);

  const handleDecoded = (decoded: string) => {
    if (doneRef.current) return;

    setLastDecoded(decoded);
    onScanRef.current(decoded);

    if (stopAfterFirstScan) {
      doneRef.current = true;
      void stop();
    }
  };

  /** ทางสำรองเมื่อเบราว์เซอร์ไม่มี BarcodeDetector (เช่น Safari บน iOS) */
  const startFallback = async (deviceId: string) => {
    const { Html5Qrcode, Html5QrcodeSupportedFormats } = await import(
      "html5-qrcode"
    );

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
      deviceId,
      {
        fps: 10,
        videoConstraints: {
          deviceId: { exact: deviceId },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        /**
         * **ไม่กำหนด qrbox โดยตั้งใจ** — อ่านทั้งภาพที่เห็น
         *
         * พอกำหนด qrbox ไลบรารีจะเปิดโหมด shaded box แล้วไปคำนวณพื้นที่อ่าน
         * ใหม่ด้วย getShadedRegionBounds() ซึ่งแปลงพิกัดจาก CSS pixel ไปเป็น
         * พิกัดของวิดีโอ การแปลงนั้นเคลื่อนได้ง่ายมากถ้าขนาดที่แสดงไม่ตรงกับ
         * สัดส่วนจริงของภาพ อาการคือต้องขยับบาร์โค้ดไปด้านข้างถึงจะอ่านติด
         *
         * ถ้าไม่กำหนด qrRegion จะเป็น {x:0, y:0, กว้างxสูงเท่าภาพทั้งหมด}
         * (บรรทัด ~499) ไม่มีการแปลงพิกัดเลย ตรงกลางคือตรงกลางจริง ๆ
         * และได้พื้นที่อ่านกว้างขึ้นด้วย แลกกับถอดรหัสช้าลงนิดหน่อย
         */
      },
      handleDecoded,
      () => setFrames((n) => n + 1),
    );

    fallbackRef.current = scanner as unknown as {
      stop: () => Promise<void>;
      clear: () => void;
    };
    setUsingNative(false);
  };

  /** index = -1 แปลว่า "ยังไม่เคยเลือกเอง ให้ระบบเลือกกล้องหลังให้" */
  const start = async (index = cameraIndex) => {
    setError(null);
    setIsStarting(true);
    setFrames(0);
    doneRef.current = false;

    try {
      if (!window.isSecureContext) {
        setError(t.insecure);
        return;
      }

      // ต้องขอสิทธิ์ก่อน ไม่งั้น enumerateDevices จะคืน label ว่างและ id ปลอม
      const probe = await navigator.mediaDevices.getUserMedia({ video: true });
      probe.getTracks().forEach((track) => track.stop());

      const devices = (await navigator.mediaDevices.enumerateDevices()).filter(
        (d) => d.kind === "videoinput",
      );
      if (devices.length === 0) {
        setError(t.noCamera);
        return;
      }

      const list = devices.map((d) => ({ id: d.deviceId, label: d.label }));
      setCameras(list);

      // ครั้งแรกให้เลือกกล้องหลังเอง ถ้าผู้ใช้กดสลับเองแล้วค่อยเคารพที่เขาเลือก
      const chosen = index >= 0 ? index : pickBackCamera(list);
      const target = devices[chosen] ?? devices[0];

      const ctor = getDetectorCtor();
      if (!ctor) {
        await startFallback(target.deviceId);
        setCameraIndex(chosen);
        setIsRunning(true);
        return;
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          deviceId: { exact: target.deviceId },
          // ขอความละเอียดสูงสุดเท่าที่กล้องให้ได้ — ยิ่งมากยิ่งอ่านเส้นบางออก
          width: { ideal: 3840 },
          height: { ideal: 2160 },
          /**
           * โฟกัสต่อเนื่องคือสิ่งที่แอปกล้องทำแล้วเราไม่เคยทำ กล้องมือถือหลายรุ่น
           * ตั้งโฟกัสครั้งเดียวตอนเปิดสตรีมถ้าไม่ขอ พอขยับเข้าใกล้แล้วภาพเบลอ
           * เบราว์เซอร์ที่ไม่รู้จักคีย์นี้จะข้ามไปเอง ไม่ใช่ error
           */
          focusMode: "continuous",
        } as MediaTrackConstraints,
      });

      streamRef.current = stream;

      const video = videoRef.current;
      if (!video) throw new Error("video element not ready");
      video.srcObject = stream;
      await video.play();

      const track = stream.getVideoTracks()[0];
      const settings = track?.getSettings();
      if (settings?.width && settings.height) {
        setResolution(`${settings.width}×${settings.height}`);
      }

      // ไฟฉายช่วยได้จริงกับบาร์โค้ดบนพลาสติกมันวาว แต่มีเฉพาะกล้องหลังบางรุ่น
      const caps = track?.getCapabilities?.() as
        | (MediaTrackCapabilities & { torch?: boolean })
        | undefined;
      setTorchAvailable(Boolean(caps?.torch));

      const supported = await ctor
        .getSupportedFormats()
        .catch((): string[] => []);
      const formats = FORMATS.filter((f) => supported.includes(f));
      detectorRef.current = new ctor(
        formats.length > 0 ? { formats } : undefined,
      );

      setUsingNative(true);
      setCameraIndex(chosen);
      setIsRunning(true);

      timerRef.current = setInterval(() => {
        const detector = detectorRef.current;
        const el = videoRef.current;
        if (!detector || !el || el.readyState < 2 || doneRef.current) return;

        setFrames((n) => n + 1);
        /**
         * ส่ง <video> เข้าไปตรง ๆ ไม่ผ่าน canvas — ตัวถอดรหัสจะได้อ่านที่
         * ความละเอียดเต็มของกล้อง ต่างจาก html5-qrcode ที่ย่อลงเท่าขนาดกรอบก่อน
         */
        detector
          .detect(el)
          .then((results) => {
            const value = results[0]?.rawValue?.trim();
            if (value) handleDecoded(value);
          })
          .catch(() => {
            // อ่านไม่ออกเป็นเรื่องปกติของเกือบทุกเฟรม ไม่ต้องรายงาน
          });
      }, SCAN_INTERVAL_MS);
    } catch (cause) {
      const name = (cause as { name?: string })?.name ?? "";
      const detail =
        typeof cause === "string" ? cause : ((cause as Error)?.message ?? "");

      setError(
        name === "NotAllowedError" || name === "PermissionDeniedError"
          ? t.denied
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? t.noCamera
            : `${t.failed}${detail ? ` (${detail})` : ""}`,
      );
      await stop();
    } finally {
      setIsStarting(false);
    }
  };

  const switchCamera = async () => {
    const next = (Math.max(cameraIndex, 0) + 1) % Math.max(cameras.length, 1);
    await stop();
    await start(next);
  };

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (!track) return;
    const next = !torchOn;
    try {
      // torch ยังไม่มีใน lib.dom ของ TypeScript แม้เบราว์เซอร์รองรับแล้ว
      await track.applyConstraints({
        advanced: [{ torch: next }],
      } as unknown as MediaTrackConstraints);
      setTorchOn(next);
    } catch {
      setTorchAvailable(false);
    }
  };

  const busy = isStarting;

  return (
    <div className="flex flex-col gap-2">
      {/*
        จำกัดความสูง "ที่กรอบด้านนอก" ไม่ใช่ที่ตัววิดีโอ — การที่กล่องแม่บังภาพไว้
        ไม่ได้เปลี่ยน clientWidth/clientHeight ของ <video> เอง พิกัดที่ไลบรารี
        คำนวณจึงยังตรงเป๊ะ ต่างจากการใส่ max-height ให้วิดีโอโดยตรงซึ่งทำให้เพี้ยน

        ส่วนที่ถูกบังยังถูกสแกนอยู่ (พื้นที่อ่าน = ทั้งภาพ) แค่มองไม่เห็นเท่านั้น
      */}
      {/*
        ใช้ grid วางซ้อนกัน ไม่ใช่ flex — ข้างในมีที่รับภาพ 2 ตัวที่ใช้คนละเส้นทาง
        (<video> ของเราเมื่อเบราว์เซอร์ถอดรหัสเองได้ / #ELEMENT_ID ของ html5-qrcode
        เมื่อตกไปใช้ทางสำรอง) ถ้าเป็น flex sibling ทั้งคู่จะแย่งความกว้างกัน
        แล้วตัวที่ไม่ได้ใช้ก็ยังกินที่อยู่ดี — เคยทำให้ Mac เหลือภาพแค่ ~10%

        พอวางซ้อนในช่องเดียวกัน ต่างคนต่างได้ 100% เต็ม ไม่ต้องพึ่ง shrink-0
        ซึ่งเป็นตัวที่ทำให้พังตั้งแต่แรก
      */}
      <div className="relative grid max-h-[55vh] min-h-60 w-full place-items-center overflow-hidden rounded-2xl border-2 border-dashed border-border bg-[#faf9f6] [&>*]:col-start-1 [&>*]:row-start-1">
        <video
          ref={videoRef}
          muted
          playsInline
          className={
            isRunning && usingNative
              ? "max-h-60 w-full rounded-xl object-cover"
              : "hidden"
          }
        />

        {/*
          ที่รับภาพของทางสำรอง — **ห้ามผูกความกว้างไว้กับ state ใด ๆ ทั้งสิ้น**

          html5-qrcode อ่าน clientWidth ตอน start() ไปคำนวณ qrbox ถ้าตอนนั้น
          ความกว้างเป็น 0 จะได้ qrbox เป็น 0 แล้วโยน error ทันที
          ("minimum size of 'config.qrbox' dimension value is 50px")

          ตอน start() ค่า usingNative ยังเป็น null เสมอ เพราะ setState ยังไม่
          ผ่านการ re-render — จะเช็ค === false แล้วค่อยให้ความกว้างไม่ทัน

          ปล่อยเป็น w-full ตลอดจึงปลอดภัยที่สุด ตอนใช้ตัวถอดรหัสของเบราว์เซอร์
          div นี้ไม่มีลูกอยู่แล้ว ความสูงเลยเป็น 0 มองไม่เห็น แต่ยังกว้างเต็ม

          **และห้ามใส่ object-cover / max-height ให้วิดีโอข้างในเด็ดขาด**
          ไลบรารีแปลงพิกัดด้วย videoWidth / clientWidth (บรรทัด ~562) ซึ่งสมมติ
          ว่าภาพยืดเต็ม element แบบตรง ๆ จากมุมซ้ายบน พอ object-cover ไปครอบตัด
          แล้วจัดกึ่งกลาง พิกัดที่อ่านจะเคลื่อนจากภาพที่เห็น อาการคือต้องขยับ
          บาร์โค้ดไปด้านข้างเพื่อชดเชย ทั้งที่ควรวางตรงกลางได้
          ปล่อยให้ไลบรารีจัดขนาดวิดีโอเองเท่านั้น
        */}
        {/*
          w-full ปลอดภัยแล้วหลังตัด qrbox ทิ้ง เพราะย่อ/ขยายเท่ากันทุกด้าน
          (uniform scale) การแปลง videoWidth/clientWidth จึงยังตรง
          ต่างจาก object-cover ที่ครอบตัดไม่เท่ากัน — อันนั้นห้ามใส่
        */}
        <div
          id={ELEMENT_ID}
          className="w-full [&_video]:!w-full [&_video]:rounded-xl"
        />

        {/*
          ต้องเป็น absolute — ถ้าเป็น flex item ปกติ มันจะแย่งความกว้างกับที่รับภาพ
          ตอน start() (ซึ่ง isRunning ยังเป็น false อยู่) ทำให้ clientWidth ที่
          ไลบรารีอ่านไปเหลือแค่ ~70% แล้วมันตั้งความกว้างวิดีโอตามนั้นแบบ inline
          ค้างไว้ตลอด อาการคือภาพกินแค่ฝั่งซ้ายของกรอบ
        */}
        {/*
          กรอบทั้งอันเป็นปุ่มเปิดกล้องในตัว แทนปุ่มแยกด้านล่าง — พื้นที่กดใหญ่
          กว่ามากบนจอสัมผัส และไม่กินความสูงเพิ่ม

          ต้องเป็น absolute เหมือนเดิม ถ้าเป็น flex item จะแย่งความกว้างกับที่
          รับภาพตอน start() แล้ววิดีโอจะถูกตรึงความกว้างผิดไว้ตลอด
        */}
        {!isRunning && (
          <button
            type="button"
            disabled={busy}
            onClick={() => void start()}
            aria-label={lastDecoded ? t.scanNext : t.start}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4 text-center transition-colors hover:bg-muted/40 disabled:cursor-wait"
          >
            {/* เครื่องหมายบวก — วาดด้วยสองแท่งไขว้ ไม่ต้องพึ่งฟอนต์หรือไอคอน */}
            <span className="relative z-10 flex size-14 items-center justify-center rounded-full bg-primary shadow-[0_4px_16px_rgba(245,163,28,0.35)]">
              <span className="absolute h-0.5 w-6 rounded-full bg-brand-dark" />
              <span className="absolute h-6 w-0.5 rounded-full bg-brand-dark" />
            </span>

            <span className="z-10 text-[13px] font-semibold text-foreground">
              {isStarting ? t.starting : lastDecoded ? t.scanNext : t.start}
            </span>
            <span className="z-10 text-xs text-border">{t.formats}</span>
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {isRunning && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void stop()}
          >
            {t.stop}
          </Button>
        )}

        {isRunning && cameras.length > 1 && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={busy}
            onClick={() => void switchCamera()}
          >
            {t.switchCamera}
          </Button>
        )}

        {isRunning && torchAvailable && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => void toggleTorch()}
          >
            {torchOn ? t.torchOff : t.torch}
          </Button>
        )}

      </div>

      {/* ค่าที่อ่านได้ต้องค้างให้เห็นแม้กล้องปิดไปแล้ว ไม่งั้นผลจะหายพร้อมกล้อง */}
      {lastDecoded && !isRunning && (
        <p className="rounded-md border border-status-green/30 bg-status-green/10 px-3 py-2 font-mono text-xs text-status-green">
          {t.diagLast}: {lastDecoded}
        </p>
      )}

      {isRunning && (
        <div className="flex flex-wrap gap-x-4 rounded-lg bg-secondary px-3 py-2 font-mono text-[11px] text-muted-foreground">
          <span>
            {t.diagResolution}: {resolution ?? "—"}
          </span>
          <span>
            {t.diagFrames}: {frames} {t.diagFramesUnit}
          </span>
          <span>
            {t.diagDecoder}:{" "}
            {usingNative === null ? "—" : usingNative ? t.diagNative : t.diagZxing}
          </span>
        </div>
      )}

      {error && (
        <p className="rounded-md border border-status-red/30 bg-status-red/10 px-3 py-2 text-xs text-status-red">
          {error}
        </p>
      )}
    </div>
  );
}
