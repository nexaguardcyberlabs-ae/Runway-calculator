import type { Metadata } from 'next'
import localFont from 'next/font/local'
import './globals.css'
import { CompanyProvider } from '@/contexts/CompanyContext'
import { Toaster } from '@/components/ui/sonner'
import { cn } from '@/lib/utils'

const geist = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-sans',
  weight: '100 900',
})

export const metadata: Metadata = {
  title: 'Financial Runway — Nexaguard / Zolvn',
  description: 'Internal financial runway and projection tool',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={cn('font-sans', geist.variable)}>
      <body className="antialiased bg-background text-foreground">
        <CompanyProvider>
          {children}
          <Toaster richColors position="top-right" />
        </CompanyProvider>
      </body>
    </html>
  )
}
