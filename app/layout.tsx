import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import { NOME_PORTAL } from "@/lib/util";
import { RegistrarPwa } from "@/components/pwa/RegistrarPwa";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

export const metadata: Metadata = {
  title: { default: NOME_PORTAL, template: `%s · ${NOME_PORTAL}` },
  description: "Biblioteca privada de histórias em quadrinhos.",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: NOME_PORTAL, statusBarStyle: "black-translucent" },
  icons: { icon: "/icon.svg", apple: "/apple-touch-icon.png" },
};

export const viewport: Viewport = {
  themeColor: "#13131c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-dvh font-sans">
        <RegistrarPwa />
        {children}
      </body>
    </html>
  );
}
