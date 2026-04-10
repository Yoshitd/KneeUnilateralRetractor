import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Knee Rehab Controller",
  description:
    "Clinician control panel for the Knee Unilateral Retractor rehab brace.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="corporate">
      <body className="min-h-screen bg-base-100 antialiased">{children}</body>
    </html>
  );
}
