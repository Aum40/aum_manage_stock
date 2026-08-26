import type { Metadata } from "next";
import { Prompt, Sarabun, IBM_Plex_Mono, Inter, Manrope, Noto_Sans_Thai } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { LocaleProvider } from "@/components/i18n/LocaleContext";
import { MobileNavProvider } from "@/components/layout/MobileNavContext";
import QueryProvider from "@/lib/query-provider";
import "./globals.css";

const prompt = Prompt({
  variable: "--font-prompt",
  subsets: ["latin", "thai"],
  weight: ["400", "600", "700"],
});

const sarabun = Sarabun({
  variable: "--font-sarabun",
  subsets: ["latin", "thai"],
  weight: ["400", "500", "600"],
});

const ibmPlexMono = IBM_Plex_Mono({
  variable: "--font-ibm-plex-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Aum Manage Stocks",
  description: "ระบบจัดการสต็อกสินค้าสำหรับร้านค้ารายย่อย",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${prompt.variable} ${sarabun.variable} ${ibmPlexMono.variable} ${inter.variable} ${manrope.variable} ${notoSansThai.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <QueryProvider>
          <LocaleProvider>
            <MobileNavProvider>
              <TooltipProvider>{children}</TooltipProvider>
            </MobileNavProvider>
          </LocaleProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
