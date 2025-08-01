import './globals.css';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { AppProviders } from '@/lib/providers/app-providers';
import { NavigationHeader } from '@/components/layout/navigation-header';

const inter = Inter({ subsets: ['latin'] });

// Force dynamic rendering to avoid SSG issues with Supabase
export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Fresh Solver OR-Tools Scheduling System',
  description: 'Production scheduling data entry system with Supabase integration',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <AppProviders>
          <div className="min-h-screen bg-gray-50">
            <NavigationHeader />
            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              {children}
            </main>
          </div>
        </AppProviders>
      </body>
    </html>
  );
}