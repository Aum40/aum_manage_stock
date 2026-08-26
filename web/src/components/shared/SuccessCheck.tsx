"use client";

/**
 * เครื่องหมายถูกแบบวาดเส้นทีละนิด
 *
 * ใช้ SVG + stroke-dashoffset แทนไลบรารีอนิเมชัน เพราะต้องการแค่จังหวะเดียว
 * ไม่คุ้มกับการเพิ่ม dependency (ซึ่ง AGENTS.md บังคับว่าต้องแยก PR ต่างหาก)
 *
 * ผู้ที่ตั้งค่าระบบให้ลดการเคลื่อนไหว (prefers-reduced-motion) จะเห็นเป็น
 * เครื่องหมายถูกนิ่งๆ ทันที ไม่มีการวาด
 */
export function SuccessCheck({ size = 56 }: { size?: number }) {
  return (
    <>
      <svg
        width={size}
        height={size}
        viewBox="0 0 52 52"
        role="img"
        aria-label="สำเร็จ"
        className="text-status-green"
      >
        <circle
          cx="26"
          cy="26"
          r="24"
          fill="none"
          stroke="currentColor"
          strokeWidth="3"
          className="success-check-circle"
        />
        <path
          d="M14 27 L22 35 L38 18"
          fill="none"
          stroke="currentColor"
          strokeWidth="4"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="success-check-mark"
        />
      </svg>

      <style>{`
        .success-check-circle {
          stroke-dasharray: 151;
          stroke-dashoffset: 151;
          animation: success-check-draw 0.4s ease-out forwards;
        }

        .success-check-mark {
          stroke-dasharray: 40;
          stroke-dashoffset: 40;
          /* หน่วง 0.3s ให้วงกลมวาดเกือบครบก่อน เครื่องหมายถูกจึงค่อยวิ่งตาม */
          animation: success-check-draw 0.3s 0.3s ease-out forwards;
        }

        @keyframes success-check-draw {
          to {
            stroke-dashoffset: 0;
          }
        }

        @media (prefers-reduced-motion: reduce) {
          .success-check-circle,
          .success-check-mark {
            animation: none;
            stroke-dashoffset: 0;
          }
        }
      `}</style>
    </>
  );
}
