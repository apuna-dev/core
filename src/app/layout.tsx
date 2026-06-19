import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Apuna Core — free API bus",
  description:
    "A unified, self-describing OpenAPI surface over Apuna's free, key-less endpoints plus an Open-Meteo weather proxy.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
