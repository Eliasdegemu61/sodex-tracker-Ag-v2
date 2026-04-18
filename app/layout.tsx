import React from "react"
import type { Metadata } from 'next'
import { Analytics } from '@vercel/analytics/next'
import { Providers } from '@/app/providers'
import { AnnouncementProvider } from '@/context/announcement-context'
import { FAVICON_DATA_URI } from '@/lib/image-constants'
import './globals.css'

export const metadata: Metadata = {
  title: 'SoDex Tracker',
  description: 'Real-time dashboards for SoDex perps and spot. Track top wallets and see leaderboard movement.',
  generator: 'v0.app',
  icons: {
    icon: FAVICON_DATA_URI,
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('theme') || 'dark';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className="font-sans antialiased bg-background text-foreground">
        <AnnouncementProvider>
          <Providers>
            {children}
          </Providers>
        </AnnouncementProvider>
        <Analytics />
      </body>
    </html>
  )
}
