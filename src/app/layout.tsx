import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Scout',
  description: 'A proactive local discovery agent for South East Queensland',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        {children}
      </body>
    </html>
  );
}
