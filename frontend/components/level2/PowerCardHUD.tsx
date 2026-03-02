'use client';
// components/level2/PowerCardHUD.tsx
import React from 'react';

interface PowerCard {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
  expiresAt?: string;
}

interface PowerCardHUDProps {
  cards: PowerCard[];
}

export default function PowerCardHUD({ cards }: PowerCardHUDProps) {
  const activeCards = cards.filter((c) => c.isActive);
  if (activeCards.length === 0) return null;

  return (
    <div className="space-y-1">
      <p className="text-[9px] font-mono text-bs-purple tracking-widest uppercase">
        ⚡ ACTIVE POWER CARDS
      </p>
      {activeCards.map((card) => (
        <div
          key={card.id}
          className="flex items-center gap-2 px-2 py-1 bg-purple-950/30 border border-bs-purple rounded-sm"
        >
          <span className="text-bs-purple text-[9px] font-mono font-bold shrink-0">
            CARD
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-mono text-bs-purple truncate">{card.name}</p>
            <p className="text-[9px] font-mono text-zinc-600 truncate">{card.description}</p>
          </div>
          {card.expiresAt && (
            <PowerCardTimer expiresAt={card.expiresAt} />
          )}
        </div>
      ))}
    </div>
  );
}

function PowerCardTimer({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = React.useState(0);
  React.useEffect(() => {
    const end = new Date(expiresAt).getTime();
    const tick = () => setRemaining(Math.max(0, Math.floor((end - Date.now()) / 1000)));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const m = Math.floor(remaining / 60);
  const s = remaining % 60;
  return (
    <span className="text-[9px] font-mono text-bs-amber shrink-0">
      {String(m).padStart(2, '0')}:{String(s).padStart(2, '0')}
    </span>
  );
}
