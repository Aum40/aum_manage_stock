interface SocialButtonsProps {
  mode: "login" | "register";
}

export default function SocialButtons({ mode }: SocialButtonsProps) {
  const prefix = mode === "login" ? "เข้าสู่ระบบด้วย" : "สมัครด้วย";

  return (
    <>
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-xs text-muted-foreground">
          หรือ{mode === "login" ? "เข้าสู่ระบบด้วย" : "สมัครด้วย"}
        </span>
        <div className="h-px flex-1 bg-border" />
      </div>
      <div className="flex flex-col gap-2.5">
        <button className="flex items-center justify-center gap-2.5 rounded-full border border-border bg-background px-4 py-2.5 text-sm font-semibold text-foreground">
          <span className="flex size-4.5 items-center justify-center rounded-full border border-border bg-background text-[11px] font-bold text-[#4285F4]">
            G
          </span>
          {prefix} Google
        </button>
        <button className="flex items-center justify-center gap-2.5 rounded-full border-none bg-[#06C755] px-4 py-2.5 text-sm font-semibold text-white">
          <span className="flex size-4.5 items-center justify-center rounded-sm bg-white/30 text-[11px] font-black">
            L
          </span>
          {prefix} LINE
        </button>
      </div>
    </>
  );
}
