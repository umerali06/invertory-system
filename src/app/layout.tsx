import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shopline Inventory",
  description: "Manage your bookstore inventory efficiently",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased text-slate-900 bg-slate-50" suppressHydrationWarning>
        {children}
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
