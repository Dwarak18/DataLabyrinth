"use client";

import { useEffect, useState } from 'react';
import { fetchTime } from '../lib/api';

type TimerState = {
  global_start_time: number | null;
  duration_seconds: number;
  server_now: number;
  is_paused: boolean;
  is_ended: boolean;
};

export default function Timer() {
  const [remaining, setRemaining] = useState<number | null>(null);
  const [status, setStatus] = useState<{ paused: boolean; ended: boolean }>({ paused: false, ended: false });
  const [lastSync, setLastSync] = useState<number>(0);

  async function sync() {
    try {
      const data: TimerState = await fetchTime();
      const baseRemaining = data.global_start_time
        ? data.global_start_time + data.duration_seconds - data.server_now
        : null;
      setRemaining(baseRemaining);
      setStatus({ paused: data.is_paused, ended: data.is_ended || (baseRemaining || 0) <= 0 });
      setLastSync(Date.now());
    } catch (err) {
      console.error('timer sync failed', err);
    }
  }

  useEffect(() => {
    sync();
    const tick = setInterval(() => {
      setRemaining((prev) => (prev !== null ? prev - 1 : null));
    }, 1000);
    const resync = setInterval(sync, 30000);
    return () => {
      clearInterval(tick);
      clearInterval(resync);
    };
  }, []);

  if (remaining === null) return <div>Awaiting start...</div>;
  if (status.ended) return <div>GAME OVER</div>;
  if (status.paused) return <div>PAUSED</div>;

  const mins = Math.max(0, Math.floor(remaining / 60));
  const secs = Math.max(0, remaining % 60);

  return (
    <div>
      <div>
        Time left: {String(mins).padStart(2, '0')}:{String(secs).padStart(2, '0')}
      </div>
      <div>Last sync: {Math.floor((Date.now() - lastSync) / 1000)}s ago</div>
    </div>
  );
}
