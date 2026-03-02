import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'BLACKSITE: SYSTEM32 — Data Warfare',
  description: "Level 2 — DATA WARFARE | BRAINSTORMX '26 | DSCET Chennai",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" style={{ backgroundColor: '#0a0a0a', color: '#e4e4e4' }}>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        {/* Inline critical CSS — ensures colours work even if Tailwind JIT
            misses a class or the external stylesheet is slow / blocked */}
        <style dangerouslySetInnerHTML={{ __html: `
          :root {
            --bs-bg:#0a0a0a; --bs-surface:#111111; --bs-border:#1a1a1a;
            --bs-green:#00ff88; --bs-cyan:#00d4ff; --bs-amber:#ffaa00;
            --bs-red:#ff3b3b; --bs-purple:#9d4edd;
          }
          *,*::before,*::after { box-sizing:border-box; margin:0; padding:0; }
          html,body {
            background-color:#0a0a0a !important;
            color:#e4e4e4 !important;
            font-family:'Courier New',Courier,monospace;
            overflow-x:hidden;
          }
          /* Force Tailwind custom colours as plain CSS vars so they resolve
             in standalone Docker even before the external stylesheet loads */
          .bg-bs-bg    { background-color:#0a0a0a !important; }
          .bg-bs-surface{ background-color:#111111 !important; }
          .text-bs-green{ color:#00ff88 !important; }
          .text-bs-cyan { color:#00d4ff !important; }
          .text-bs-amber{ color:#ffaa00 !important; }
          .text-bs-red  { color:#ff3b3b !important; }
          .text-bs-purple{ color:#9d4edd !important; }
          .border-bs-green { border-color:#00ff88 !important; }
          .border-bs-cyan  { border-color:#00d4ff !important; }
          .border-bs-border{ border-color:#1a1a1a !important; }
          /* Zinc / grey scale — used heavily in arena UI */
          .text-white  { color:#ffffff !important; }
          .text-zinc-100{ color:#f4f4f5 !important; }
          .text-zinc-200{ color:#e4e4e7 !important; }
          .text-zinc-300{ color:#d4d4d8 !important; }
          .text-zinc-400{ color:#a1a1aa !important; }
          .text-zinc-500{ color:#71717a !important; }
          .text-zinc-600{ color:#52525b !important; }
          .text-zinc-700{ color:#3f3f46 !important; }
          .text-zinc-800{ color:#27272a !important; }
          .bg-zinc-900  { background-color:#18181b !important; }
          .bg-zinc-800  { background-color:#27272a !important; }
          .border-zinc-800 { border-color:#27272a !important; }
          .border-zinc-700 { border-color:#3f3f46 !important; }
          /* Yellow / green score colours */
          .text-yellow-400 { color:#facc15 !important; }
          .text-amber-700  { color:#b45309 !important; }
          .text-emerald-400{ color:#34d399 !important; }
          input, textarea, select {
            background-color:#0a0a0a;
            color:#ffffff;
            border:1px solid #333;
            font-family:'Courier New',Courier,monospace;
          }
          input::placeholder, textarea::placeholder { color:#555; }
          input:focus, textarea:focus { outline:none; border-color:#00d4ff; }
          a { color:#00d4ff; }
          .bs-panel {
            background-color:#111111;
            border:1px solid #1a1a1a;
            border-radius:4px;
          }
          .bs-btn {
            display:inline-flex; align-items:center; justify-content:center;
            padding:0.5rem 1rem; border-radius:2px; font-family:'Courier New',Courier,monospace;
            font-size:0.75rem; letter-spacing:0.1em; text-transform:uppercase;
            cursor:pointer; border:1px solid transparent; transition:all .15s;
          }
          .bs-btn-green {
            background:transparent; color:#00ff88; border-color:#00ff88;
          }
          .bs-btn-green:hover { background:rgba(0,255,136,0.1); }
          .bs-btn-cyan  {
            background:transparent; color:#00d4ff; border-color:#00d4ff;
          }
          .bs-btn-cyan:hover  { background:rgba(0,212,255,0.1); }
          .bs-btn-red   {
            background:transparent; color:#ff3b3b; border-color:#ff3b3b;
          }
          .bs-btn-amber {
            background:transparent; color:#ffaa00; border-color:#ffaa00;
          }
        ` }} />
      </head>
      <body style={{ backgroundColor: '#0a0a0a', color: '#e4e4e4' }}
            className="bg-bs-bg text-white font-mono antialiased">
        {children}
      </body>
    </html>
  );
}
