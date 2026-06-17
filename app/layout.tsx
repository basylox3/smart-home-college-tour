import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import type { ReactNode } from "react";
import { IntroVideoOverlay } from "../components/IntroVideoOverlay";
import "../styles.css";

const heroFont = Nunito({
  subsets: ["latin", "cyrillic"],
  weight: ["700", "800"],
  variable: "--font-hero",
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"),
  title: "Перспективный колледж | 3D тур",
  description:
    "Иммерсивный 3D-тур по Перспективному колледжу с панорамами, интерактивными сценами и защищенной админкой.",
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Перспективный колледж | 3D тур",
    description:
      "Публичная 3D-презентация кампуса с панорамными сценами и серверным управлением контентом.",
    locale: "ru_RU",
    type: "website",
    url: "/",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#04101d",
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="ru">
      <body className={heroFont.variable}>
        <IntroVideoOverlay />
        {children}
      </body>
    </html>
  );
}
