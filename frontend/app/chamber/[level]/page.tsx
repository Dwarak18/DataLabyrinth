"use client";

import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { submitAnswer } from '../../../lib/api';

export default function ChamberPage() {
  const params = useParams();
  const router = useRouter();
  const level = Number(params?.level || 1);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('datalabyrinth_token');
    setToken(storedToken);
  }, []);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) {
      setStatus('Not authenticated.');
      return;
    }
    setStatus('Submitting...');
    try {
      const res = await submitAnswer(token, level, answer);
      setStatus(res.correct ? `Correct! Earned ${res.score_earned}. Moving to ${res.next_level}.` : 'Incorrect, try again.');
      if (res.correct) {
        const teamStr = localStorage.getItem('datalabyrinth_team');
        if (teamStr) {
          const team = JSON.parse(teamStr);
          const updated = { ...team, current_level: res.next_level, score: team.score + res.score_earned };
          localStorage.setItem('datalabyrinth_team', JSON.stringify(updated));
        }
        router.push('/dashboard');
      }
    } catch (err: any) {
      setStatus(err?.message || 'Submission failed');
    }
  }

  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-2xl font-bold">Chamber {level}</h1>
      <p className="text-sm text-gray-600">Solve the puzzle and submit your answer.</p>
      <form onSubmit={handleSubmit} className="space-y-3">
        <textarea
          className="w-full border rounded p-3"
          rows={5}
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <button type="submit" className="bg-green-600 text-white px-4 py-2 rounded">Submit</button>
      </form>
      {status && <p className="text-sm">{status}</p>}
    </main>
  );
}
