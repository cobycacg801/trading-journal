import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
// app/layout.tsx  (server component)
import "./globals.css";
import LocalizationShield from "./components/LocalizationShield"; // adjust path if needed

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* Temp protection so localization bootstrap errors don't block rendering */}
        <LocalizationShield />
        {children}
      </body>
    </html>
  );
}
