import './globals.css';
import { AuthProvider } from '@/lib/AuthContext';
import { SocketProvider } from '@/lib/SocketContext';
import LayoutShell from '@/components/LayoutShell';
import type { Metadata } from 'next';

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
    <html lang="en">
      <body className="bg-[#0b0f17] text-slate-100 antialiased">
        <AuthProvider>
          <SocketProvider>
            <LayoutShell>{children}</LayoutShell>
          </SocketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
