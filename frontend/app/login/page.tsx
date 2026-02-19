"use client";

import { FormEvent, useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '../../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [accessCode, setAccessCode] = useState('');
  const [status, setStatus] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('Signing in...');
    try {
      const res = await login(accessCode.trim());
      localStorage.setItem('datalabyrinth_token', res.token);
      localStorage.setItem('datalabyrinth_team', JSON.stringify(res.team));
      router.push('/dashboard');
    } catch (err: any) {
      setStatus(err?.message || 'Login failed');
    }
  }

  return (
    <main className="max-w-md mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Enter Access Code</h1>
      <form onSubmit={handleSubmit} className="space-y-3">
        <input
          value={accessCode}
          onChange={(e) => setAccessCode(e.target.value)}
          placeholder="Access code"
          className="w-full border px-3 py-2 rounded"
        />
        <button type="submit" className="w-full bg-blue-600 text-white py-2 rounded">
          Login
        </button>
      </form>
      {status && <p className="mt-3 text-sm">{status}</p>}
    </main>
  );
}
