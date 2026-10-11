import { getPreferences } from '@checkmate/core';
import { defaultPreferences } from '@checkmate/core/shared';
import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import { AppShell } from '@/components/shell/app-shell';
import { ThemeProvider } from '@/components/shell/theme-provider';
import { Toaster } from '@/components/ui/sonner';
import { TooltipProvider } from '@/components/ui/tooltip';
import { PrefsProvider } from '@/lib/prefs';
import { getSession } from '@/lib/session';
import './globals.css';

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] });
const geistMono = Geist_Mono({ variable: '--font-geist-mono', subsets: ['latin'] });

export const metadata: Metadata = {
  title: { default: 'CheckMate', template: '%s · CheckMate' },
  description: 'Your chess mate. Analyze, study and train, free and open source.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const prefs = session ? await getPreferences(session.user.id) : defaultPreferences;
  const user = session ? { name: session.user.name, username: session.user.displayUsername ?? null } : null;

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme={prefs.theme} enableSystem disableTransitionOnChange>
          <PrefsProvider initial={prefs} signedIn={!!session}>
            <TooltipProvider>
              <AppShell user={user}>{children}</AppShell>
            </TooltipProvider>
            <Toaster />
          </PrefsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
