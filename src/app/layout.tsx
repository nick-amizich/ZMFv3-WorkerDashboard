import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { DashboardNav } from "@/components/features/dashboard-nav"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "ZMF Worker Dashboard",
  description: "Production-ready worker task management system for headphone manufacturing",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <DashboardNav />
        {children}
      </body>
    </html>
  )
}