import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "One-Touch-Ecommerce",
  description: "Panel de ventas multi-negocio",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}
