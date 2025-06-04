import type { Metadata } from "next"
import { Inter } from "next/font/google"
import "./globals.css"
import { LocationProvider } from "@/contexts/location-context"

const inter = Inter({ 
  subsets: ["latin"],
  display: 'swap',
  preload: true,
  variable: '--font-inter',
})

export const metadata: Metadata = {
  title: process.env.NEXT_PUBLIC_APP_NAME || "ZMF Worker Dashboard",
  description: "Production-ready worker task management system for headphone manufacturing",
  icons: {
    icon: '/favicon.svg',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={`${inter.className} ${inter.variable}`}>
        <LocationProvider>
          {children}
        </LocationProvider>
      </body>
    </html>
  )
}