import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "TeamBuilder AI - 스마트 팀/반 배정 시스템",
  description: "AI 기반 균형 잡힌 팀/반 자동 배정 관리 서비스",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className={`${geistSans.variable} h-full antialiased`}>
      <body className="h-full bg-slate-50 font-[family-name:var(--font-geist-sans)]">
        <ClientLayout>{children}</ClientLayout>
      </body>
    </html>
  );
}
