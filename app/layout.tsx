import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Sidebar from "@/components/Sidebar";
import { getSession } from "@/lib/auth";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "ResumeIQ CRM",
  description: "AI-powered Recruitment Management",
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
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex bg-gray-50 text-gray-900">
        {session && (
          <Sidebar user={{ name: session.name, loginId: session.loginId, role: session.role }} />
        )}
        <main className="flex-1 h-full overflow-y-auto overflow-x-hidden">
          {children}
        </main>
      </body>
    </html>
  );
}
