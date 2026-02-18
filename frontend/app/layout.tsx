import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'DataLabyrinth',
  description: 'Competitive data hackathon platform',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-slate-50 text-slate-900">{children}</body>
    </html>
  );
}
