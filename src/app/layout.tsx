import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import { ConvexClientProvider } from "@/components/providers/ConvexClientProvider";
import { AppShell } from "@/components/layout/AppShell";
import "./globals.css";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

export const metadata: Metadata = {
  title: "Review Room",
  description: "Client-facing media review portal",
  icons: {
    icon: "/icon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geist.variable} antialiased`}>
        <ConvexClientProvider>
          <AppShell>{children}</AppShell>
          <Toaster theme="dark" position="bottom-right" />
        </ConvexClientProvider>
      </body>
    </html>
  );
}
