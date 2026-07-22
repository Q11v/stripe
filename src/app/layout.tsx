import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Stripe Payment Element Demo',
  description: 'Next.js + Stripe embedded Elements (Payment Element) checkout',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <main className="container">{children}</main>
      </body>
    </html>
  );
}
