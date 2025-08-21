// app/layout.tsx

import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import './globals.css';
import '@/app/fonts.css'; // <!--- CORRECTED PATH

export const metadata: Metadata = {
  title: 'AI Chat Assistant',
  description: 'A modern AI chat interface with multiple provider support',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
      </head>
      {/* --- UPDATE: Removed inter.className from body --- */}
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
