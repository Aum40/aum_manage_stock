"use client";

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

import { Button } from "@/components/ui/button";
import { useLocale } from "@/components/i18n/LocaleContext";

// import ไฟล์รูปหมุดจาก leaflet ตรงๆ ได้ path ไม่ตรงกันระหว่าง Turbopack กับ
// webpack (บาง bundler คืน string บาง bundler คืน object {src}) จึงใช้ CDN
// ของ leaflet เองแทน (เวอร์ชันเดียวกับที่ติดตั้งไว้ — package.json) ตัดปัญหา
// bundler ทิ้งไปเลย รูปพวกนี้เล็กมากไม่กระทบความเร็วโหลด
const LEAFLET_CDN = "https://unpkg.com/leaflet@1.9.4/dist/images";
const shopMarkerIcon = L.icon({
  iconUrl: `${LEAFLET_CDN}/marker-icon.png`,
  iconRetinaUrl: `${LEAFLET_CDN}/marker-icon-2x.png`,
  shadowUrl: `${LEAFLET_CDN}/marker-shadow.png`,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

// กรุงเทพฯ — จุดเริ่มต้นเมื่อยังไม่เคยปักหมุด
const DEFAULT_CENTER: L.LatLngTuple = [13.7563, 100.5018];
const DEFAULT_ZOOM = 12;
const PICKED_ZOOM = 16;

const content = {
  th: {
    useCurrentLocation: "ใช้ตำแหน่งปัจจุบัน",
    locating: "กำลังหาตำแหน่ง…",
    locationError: "หาตำแหน่งไม่สำเร็จ กรุณาอนุญาตการเข้าถึงตำแหน่งของเบราว์เซอร์",
    hint: "แตะบนแผนที่หรือลากหมุดเพื่อเลือกตำแหน่งร้าน",
  },
  en: {
    useCurrentLocation: "Use current location",
    locating: "Locating…",
    locationError: "Couldn't get your location — please allow location access in the browser.",
    hint: "Tap the map or drag the pin to set the shop's location.",
  },
};

interface ShopLocationPickerProps {
  latitude?: number;
  longitude?: number;
  onLocationChange: (input: { latitude: number; longitude: number; address?: string }) => void;
}

/** ดึงที่อยู่แบบข้อความจากพิกัด — Nominatim ของ OpenStreetMap ฟรี ไม่ต้องมี API key */
async function reverseGeocode(lat: number, lng: number): Promise<string | undefined> {
  try {
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&accept-language=th`,
    );
    if (!res.ok) return undefined;
    const data = (await res.json()) as { display_name?: string };
    return data.display_name;
  } catch {
    return undefined;
  }
}

export function ShopLocationPicker({ latitude, longitude, onLocationChange }: ShopLocationPickerProps) {
  const { locale } = useLocale();
  const t = content[locale];
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const pickRef = useRef<(lat: number, lng: number) => void>(() => {});
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const hasPin = latitude !== undefined && longitude !== undefined;

  const pick = async (lat: number, lng: number) => {
    setLocationError(null);
    const address = await reverseGeocode(lat, lng);
    onLocationChange({ latitude: lat, longitude: lng, address });
  };

  // เก็บ pick ล่าสุดไว้ใน ref ให้ map click/marker dragend handler (ผูกไว้
  // ตอน mount ครั้งเดียว) เรียกใช้เวอร์ชันล่าสุดได้ — ต้องอัปเดตหลัง render
  // เสร็จเท่านั้น เขียนตรงๆ ระหว่าง render ไม่ได้
  useEffect(() => {
    pickRef.current = pick;
  });

  /**
   * สร้าง/ทำลายแผนที่เองด้วย vanilla leaflet แทนคอมโพเนนต์ของ react-leaflet
   * — react-leaflet ยังมีบั๊กที่ยอมรับแล้วว่าไม่ได้แก้ (github.com/PaulLeCam/
   * react-leaflet issue #1069, #1133) เรื่องจัดการ mount/unmount ซ้ำของ React
   * StrictMode ตอน dev ไม่ถูกต้อง ทำให้ throw "_leaflet_events undefined"
   *
   * L.map()/.remove() ของ leaflet ตรงๆ ออกแบบมาให้สร้าง-ทำลาย-สร้างใหม่บน
   * DOM node เดิมได้อย่างปลอดภัยอยู่แล้ว จึงไม่มีปัญหานี้เมื่อคุมเองตรงนี้
   */
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let map: L.Map | null = null;

    // popup ยังอยู่ระหว่าง animation เปิดตอนนี้ container อาจมีขนาด 0x0 อยู่ —
    // L.map() บนกล่องขนาด 0 ทำให้ leaflet อ่าน .style ของ element ที่มันคาด
    // ว่าต้องมีแต่ยังไม่ถูกสร้างจนพัง จึงต้องรอให้มีขนาดจริงก่อนค่อยสร้างแผนที่
    function init() {
      if (map || !container) return;
      map = L.map(container).setView(DEFAULT_CENTER, DEFAULT_ZOOM);

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      }).addTo(map);

      map.on("click", (e) => {
        pickRef.current(e.latlng.lat, e.latlng.lng);
      });

      mapRef.current = map;
    }

    let observer: ResizeObserver | undefined;
    if (container.clientWidth > 0 && container.clientHeight > 0) {
      init();
    } else {
      observer = new ResizeObserver(() => {
        if (container.clientWidth > 0 && container.clientHeight > 0) {
          init();
          observer?.disconnect();
        }
      });
      observer.observe(container);
    }

    return () => {
      observer?.disconnect();
      map?.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
  }, []);

  // ขยับกล้อง + ปักหมุดทุกครั้งที่พิกัดเปลี่ยน (แตะแผนที่ ลากหมุด หรือกด
  // "ใช้ตำแหน่งปัจจุบัน") รวมถึงตอนเปิดฟอร์มแก้ไขร้านที่มีพิกัดอยู่แล้ว
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !hasPin) return;

    map.setView([latitude, longitude], PICKED_ZOOM);

    if (markerRef.current) {
      markerRef.current.setLatLng([latitude, longitude]);
    } else {
      const marker = L.marker([latitude, longitude], {
        icon: shopMarkerIcon,
        draggable: true,
      }).addTo(map);
      marker.on("dragend", () => {
        const latLng = marker.getLatLng();
        pickRef.current(latLng.lat, latLng.lng);
      });
      markerRef.current = marker;
    }
  }, [latitude, longitude, hasPin]);

  const useCurrentLocation = () => {
    if (!navigator.geolocation) {
      setLocationError(t.locationError);
      return;
    }
    setIsLocating(true);
    setLocationError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        await pick(pos.coords.latitude, pos.coords.longitude);
        setIsLocating(false);
      },
      () => {
        setLocationError(t.locationError);
        setIsLocating(false);
      },
    );
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs text-muted-foreground">{t.hint}</p>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={isLocating}
          onClick={useCurrentLocation}
        >
          {isLocating ? t.locating : t.useCurrentLocation}
        </Button>
      </div>

      {locationError && <p className="text-xs text-destructive">{locationError}</p>}

      <div
        ref={containerRef}
        className="h-56 w-full overflow-hidden rounded-xl border border-border"
      />
    </div>
  );
}
