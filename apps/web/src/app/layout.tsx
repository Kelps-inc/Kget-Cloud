import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'KGet Cloud',
  description: 'Automate recurring file collection and chat with your documents.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
