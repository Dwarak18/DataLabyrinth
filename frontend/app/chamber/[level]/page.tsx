"use client";

import { useParams, useRouter } from 'next/navigation';
import { FormEvent, useEffect, useState } from 'react';
import { getChallenge, submitAnswer } from '../../../lib/api';

type DataRow = {
  id: number;
  region: string;
  month: number;
  sales: number;
  margin: number;
};

export default function ChamberPage() {
  const params = useParams();
  const router = useRouter();
  const level = Number(params?.level || 1);
  const [dataset, setDataset] = useState<DataRow[]>([]);
  const [answer, setAnswer] = useState('');
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('datalabyrinth_token');
    if (!storedToken) {
      router.push('/login');
      return;
    }
    setToken(storedToken);
    getChallenge(storedToken, level)
      .then((res) => setDataset(res.dataset))
      .catch((err) => setStatus(err?.message || 'Failed to load challenge'))
      .finally(() => setLoading(false));
  }, [level, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!token) { setStatus('Not authenticated.'); return; }
    setStatus('Submitting...');
    try {
      const res = await submitAnswer(token, level, answer);
      if (res.correct) {
        const teamStr = localStorage.getItem('datalabyrinth_team');
        if (teamStr) {
          const team = JSON.parse(teamStr);
          localStorage.setItem('datalabyrinth_team', JSON.stringify({
            ...team,
            current_level: res.next_level,
            score: team.score + res.score_earned,
          }));
        }
        setStatus(`Correct! Earned ${res.score_earned} points. Advancing...`);
        setTimeout(() => router.push('/dashboard'), 1500);
      } else {
        setStatus('Incorrect — check your answer and try again.');
      }
    } catch (err: any) {
      setStatus(err?.message || 'Submission failed');
    }
  }

  if (loading) {
    return <main className="max-w-4xl mx-auto p-6"><p>Loading challenge...</p></main>;
  }

  return (
    <main className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Chamber {level}</h1>
        <a href="/dashboard" className="text-sm text-blue-600 underline">← Dashboard</a>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded p-4 text-sm space-y-1">
        <p className="font-semibold">Puzzle Instructions</p>
        <p>You have 24 rows of sales data across 4 regions (<code>north</code>, <code>south</code>, <code>east</code>, <code>west</code>).</p>
        <p>Calculate the <strong>total_sales</strong> and <strong>avg_margin</strong> (2 decimal places) for each region.</p>
        <p>Submit your answer as a <strong>JSON array sorted by total_sales descending</strong>:</p>
        <pre className="bg-white border rounded p-2 text-xs overflow-auto">{`[{"region":"north","total_sales":1234,"avg_margin":28.50}, ...]`}</pre>
      </div>

      <div className="overflow-auto rounded border">
        <table className="w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              {['ID','Region','Month','Sales','Margin %'].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {dataset.map((row) => (
              <tr key={row.id} className="border-t hover:bg-slate-50">
                <td className="px-3 py-1">{row.id}</td>
                <td className="px-3 py-1">{row.region}</td>
                <td className="px-3 py-1">{row.month}</td>
                <td className="px-3 py-1">{row.sales}</td>
                <td className="px-3 py-1">{row.margin}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        <label className="block text-sm font-medium">Your Answer (JSON array)</label>
        <textarea
          className="w-full border rounded p-3 font-mono text-sm"
          rows={6}
          placeholder='[{"region":"...","total_sales":...,"avg_margin":...}, ...]'
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />
        <button type="submit" className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700">
          Submit Answer
        </button>
      </form>

      {status && (
        <p className={`text-sm font-medium ${
          status.startsWith('Correct') ? 'text-green-600' :
          status.startsWith('Incorrect') ? 'text-red-600' : 'text-gray-700'
        }`}>{status}</p>
      )}
    </main>
  );
}
