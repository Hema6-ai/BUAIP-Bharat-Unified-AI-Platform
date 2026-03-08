import type { Metadata } from 'next'
import './globals.css'
import { LanguageProvider } from '@/app/lib/languageContext'
import { RegionProvider } from '@/app/lib/regionContext'
import { ClientLayout } from '@/app/components/ClientLayout'

export const metadata: Metadata = {
  title: 'BUAIP - Bharat Unified Access Intelligence Platform',
  description: 'AI for Communities, Access & Public Impact',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <LanguageProvider>
          <RegionProvider>
            <ClientLayout>
              {children}
            </ClientLayout>
          </RegionProvider>
        </LanguageProvider>
      </body>
    </html>
  )
}
