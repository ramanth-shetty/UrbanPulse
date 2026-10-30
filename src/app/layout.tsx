import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'UrbanPulse | Civic Issue Reporter',
  description: 'AI-powered civic complaint reporting platform for Mysuru',
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
      <body className="min-h-screen flex flex-col bg-slate-50 antialiased">
        <header className="sticky top-0 z-40 bg-white/95 backdrop-blur border-b border-slate-200 px-4 py-3 shadow-xs">
          <div className="max-w-5xl mx-auto flex items-center justify-between">
            <a href="/" className="flex items-center gap-2 group">
              <span className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-base shadow-xs">
                U
              </span>
              <div>
                <div className="font-bold text-slate-900 tracking-tight leading-none text-base">
                  UrbanPulse
                </div>
                <div className="text-[10px] text-slate-500 font-medium">Mysuru Civic Platform</div>
              </div>
            </a>

            <nav className="flex items-center gap-1.5 sm:gap-2">
              <a
                href="/report/new"
                className="text-xs font-semibold px-2 py-1.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              >
                📢 Report
              </a>
              <a
                href="/track"
                className="text-xs font-semibold px-2 py-1.5 rounded-xl text-slate-700 hover:bg-slate-100 transition-colors"
              >
                🔍 Track
              </a>
              <a
                href="/admin/review"
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 transition-colors flex items-center gap-1"
              >
                <span>🛡️</span>
                <span className="hidden sm:inline">Review Queue</span>
              </a>
              <a
                href="/admin/brief"
                className="text-xs font-semibold px-2.5 py-1.5 rounded-xl text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 transition-colors flex items-center gap-1"
              >
                <span>📋</span>
                <span className="hidden sm:inline">Morning Brief</span>
              </a>
              <a
                href="/admin"
                className="text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-xs transition-colors flex items-center gap-1"
              >
                <span>🗺️</span>
                <span className="hidden sm:inline">Admin Ops</span>
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

