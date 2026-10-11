import { getPreferences } from '@checkmate/core';
import { defaultPreferences } from '@checkmate/core/shared';
import type { Metadata } from 'next';
import { cookies } from 'next/headers';
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
  description:
    'CheckMate is the AI chess coach that reads your games like a grandmaster and explains them like a friend.',
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  const prefs = session ? await getPreferences(session.user.id) : defaultPreferences;
  const user = session ? { name: session.user.name, username: session.user.displayUsername ?? null } : null;
  // Set by the rail's collapse toggle; read here so the first paint has the right width.
  const railCollapsed = (await cookies()).get('checkmate-rail')?.value === 'collapsed';

  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${geistSans.variable} ${geistMono.variable} font-sans antialiased`}>
        <ThemeProvider attribute="class" defaultTheme={prefs.theme} enableSystem disableTransitionOnChange>
          <PrefsProvider initial={prefs} signedIn={!!session}>
            <TooltipProvider>
              <AppShell user={user} railCollapsed={railCollapsed}>
                {children}
              </AppShell>
            </TooltipProvider>
            <Toaster />
          </PrefsProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
