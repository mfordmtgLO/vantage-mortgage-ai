import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Vantage AI",
  description: "Mortgage Loan Officer Assistant",
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