import type { Metadata } from "next";
import {
  ClerkProvider,
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
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
  title: "CollabBoard",
  description: "Collaborative project management for modern teams",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ClerkProvider>
          <header className="sticky top-0 z-40 bg-neo-bg border-b-2 border-neo-black">
            <div className="max-w-7xl mx-auto flex items-center justify-between px-6 h-16">
              <Link href="/" className="flex items-center gap-3 group">
                <div className="w-9 h-9 bg-neo-yellow border-2 border-neo-black rounded-lg shadow-neo-sm flex items-center justify-center font-black text-base transition-all group-hover:translate-x-[1px] group-hover:translate-y-[1px] group-hover:shadow-none">
                  C
                </div>
                <span className="font-black text-xl tracking-tight hidden sm:block">
                  CollabBoard
                </span>
              </Link>

              <div className="flex items-center gap-3">
                <Show when="signed-out">
                  <SignInButton>
                    <button className="neo-btn neo-btn-ghost text-sm py-2 px-4">
                      Sign In
                    </button>
                  </SignInButton>
                  <SignUpButton>
                    <button className="neo-btn neo-btn-primary text-sm py-2 px-4">
                      Sign Up
                    </button>
                  </SignUpButton>
                </Show>
                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    className="neo-btn neo-btn-ghost text-xs py-1.5 px-3"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <rect x="3" y="3" width="7" height="7" />
                      <rect x="14" y="3" width="7" height="7" />
                      <rect x="3" y="14" width="7" height="7" />
                      <rect x="14" y="14" width="7" height="7" />
                    </svg>
                    Dashboard
                  </Link>
                  <Link
                    href="/my-tasks"
                    className="neo-btn neo-btn-ghost text-xs py-1.5 px-3"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
                      <polyline points="22 4 12 14.01 9 11.01" />
                    </svg>
                    My Tasks
                  </Link>
                  <UserButton />
                </Show>
              </div>
            </div>
          </header>
          <main>{children}</main>
        </ClerkProvider>
      </body>
    </html>
  );
}
