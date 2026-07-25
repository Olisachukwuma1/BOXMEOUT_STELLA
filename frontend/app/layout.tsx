import type { Metadata } from 'next';
import { Navbar } from '@/components/Navbar';
import { ToastProvider } from '@/components/ToastProvider';
import '@/app/globals.css';

export const metadata: Metadata = {
  title: 'BOXMEOUT — Boxing Prediction Market',
  description: 'Decentralized boxing prediction market on Stellar',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <ToastProvider>
          <Navbar />
          <main className="min-w-0 overflow-x-hidden">
            {children}
          </main>
        </ToastProvider>
      </body>
    </html>
  );
}
