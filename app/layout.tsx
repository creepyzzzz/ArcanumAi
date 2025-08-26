import type { Metadata } from 'next';
import { ThemeProvider } from '@/components/ThemeProvider';
import { AppInitializer } from '@/components/AppInitializer';
import './globals.css';
import '@/app/fonts.css';

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
        {/* This meta tag is crucial for proper mobile app display */}
        <meta 
          name="viewport" 
          content="width=device-width, initial-scale=1.0, viewport-fit=cover" 
        />
      </head>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <AppInitializer>{children}</AppInitializer>
        </ThemeProvider>
      </body>
    </html>
  );
}
