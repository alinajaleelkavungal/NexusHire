import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import TopHeader from "@/components/TopHeader";
import SplashScreen from "@/components/SplashScreen";
import { getSession } from "@/lib/auth";
import "./globals.css";

const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NexusHire · The Global Hub for Cross-Border Manpower",
  description: "NexusHire - The Global Hub for Cross-Border Manpower",
  icons: {
    icon: [
      { url: '/icon.png', type: 'image/png' },
      { url: '/logo-mark.png', type: 'image/png' },
    ],
    apple: [
      { url: '/apple-icon.png' },
    ],
    shortcut: '/logo-mark.png',
  },
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();

  return (
    <html
      lang="en"
      className={`${jakartaSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex bg-[#f7f5f0] text-[#24211f] font-sans">
        {session && (
          <Sidebar user={{ name: session.name, loginId: session.loginId, role: session.role }} />
        )}
        <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
          {session && (
            <TopHeader user={{ name: session.name, loginId: session.loginId, role: session.role }} />
          )}
          <main className="flex-1 overflow-y-auto overflow-x-hidden">
            {children}
          </main>
        </div>
        <SplashScreen />
      </body>
    </html>
  );
}
