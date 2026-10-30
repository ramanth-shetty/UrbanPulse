import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UrbanPulse | Civic Operations',
  description: 'AI-assisted civic incident intake, deduplication and operations platform',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col bg-slate-50 text-slate-900 antialiased font-sans">
        <header className="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-2.5">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-2.5">
              <span className="w-7 h-7 rounded-md bg-slate-900 text-white flex items-center justify-center font-bold text-xs font-mono">
                UP
              </span>
              <div>
                <div className="font-bold text-slate-900 tracking-tight leading-none text-sm">
                  UrbanPulse
                </div>
                <div className="text-[10px] text-slate-500 font-medium tracking-wide uppercase mt-0.5">
                  Mysuru Operations
                </div>
              </div>
            </a>

            <nav className="flex items-center gap-1 sm:gap-1.5">
              <a
                href="/report/new"
                className="text-xs font-medium px-2.5 py-1.5 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Report
              </a>
              <a
                href="/track"
                className="text-xs font-medium px-2.5 py-1.5 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Track
              </a>
              <a
                href="/admin/review"
                className="text-xs font-medium px-2.5 py-1.5 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Review Queue
              </a>
              <a
                href="/admin/brief"
                className="text-xs font-medium px-2.5 py-1.5 rounded-md text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-colors"
              >
                Morning Brief
              </a>
              <a
                href="/admin"
                className="text-xs font-semibold px-3 py-1.5 rounded-md bg-slate-900 hover:bg-slate-800 text-white transition-colors"
              >
                Admin Ops
              </a>
            </nav>
          </div>
        </header>

        <main className="flex-1 max-w-5xl w-full mx-auto p-3 sm:p-4 pb-12">
          {children}
        </main>
      </body>
    </html>
  );
}
