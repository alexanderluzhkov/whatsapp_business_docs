import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Календарь записей',
  description: 'Календарь записей для мастера маникюра',
  manifest: '/manifest.json',
  themeColor: '#ffffff',
  viewport: {
    width: 'device-width',
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ru">
      <body className="antialiased bg-gray-50">
        {children}
      </body>
    </html>
  )
}
