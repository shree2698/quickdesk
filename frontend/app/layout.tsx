import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { SocketProvider } from '@/lib/SocketContext';
import LayoutShell from '@/components/LayoutShell';
import type { Metadata } from 'next';
import { Quicksand } from 'next/font/google';

const quicksand = Quicksand({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-quicksand',
});

export const metadata: Metadata = {
  title: 'QuickDesk — AI-Assisted Helpdesk',
  description: 'Internal corporate helpdesk powered by AI RAG copilot',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={quicksand.variable}>
      <body className={`${quicksand.className} bg-[#fcf9f6] text-slate-900 antialiased`}>
        <AuthProvider>
          <SocketProvider>
            <LayoutShell>{children}</LayoutShell>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
