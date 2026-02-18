export default function HomePage() {
  return (
    <main className="max-w-2xl mx-auto p-6 space-y-4">
      <h1 className="text-3xl font-bold">DataLabyrinth</h1>
      <p className="text-gray-700">Multi-chamber data puzzle competition.</p>
      <div className="space-x-3">
        <a className="text-blue-600 underline" href="/login">Login</a>
        <a className="text-blue-600 underline" href="/leaderboard">Leaderboard</a>
      </div>
    </main>
  );
}
