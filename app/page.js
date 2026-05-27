'use client';
import { useState } from 'react';

const PLACEHOLDER_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='185' height='278' viewBox='0 0 185 278'%3E%3Crect width='185' height='278' fill='%2327272a'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2352525b' font-size='14' font-family='sans-serif'%3ENo Poster%3C/text%3E%3C/svg%3E";

export default function Home() {
  const [query, setQuery] = useState('');
  const [phase, setPhase] = useState('search'); // 'search' | 'loading-search' | 'pick' | 'loading-check' | 'result'
  const [candidates, setCandidates] = useState([]);
  const [result, setResult] = useState(null); // 'YES' | 'NO'

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;

    setPhase('loading-search');
    try {
      const res = await fetch(`/api/movies/search?name=${encodeURIComponent(query)}`);
      const data = await res.json();

      if (!data.results?.length) {
        setCandidates([]);
        setPhase('pick'); // will show empty state
      } else {
        setCandidates(data.results);
        setPhase('pick');
      }
    } catch {
      setCandidates([]);
      setPhase('pick');
    }
  };

  const handlePick = async (tmdbId) => {
    setPhase('loading-check');
    try {
      const res = await fetch(`/api/movies/check?tmdb_id=${tmdbId}`);
      const data = await res.json();
      setResult(data.result);
      setPhase('result');
    } catch {
      setResult('NO');
      setPhase('result');
    }
  };

  const reset = () => {
    setPhase('search');
    setCandidates([]);
    setResult(null);
  };

  // ── Result screen ──────────────────────────────────────────────
  if (phase === 'result') {
    return (
      <main className="flex h-screen w-screen flex-col items-center justify-center bg-black gap-4">
        <p className="text-zinc-500 text-sm tracking-widest uppercase">Warner?</p>
        <div className="select-none">
          {result === 'YES' ? (
            <svg viewBox="0 0 100 100" className="w-48 h-48 text-green-500" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="50" cy="50" r="46" />
              <polyline points="28,52 44,68 72,34" />
            </svg>
          ) : (
            <svg viewBox="0 0 100 100" className="w-48 h-48 text-red-600" fill="none" stroke="currentColor" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="50" cy="50" r="46" />
              <line x1="32" y1="32" x2="68" y2="68" />
              <line x1="68" y1="32" x2="32" y2="68" />
            </svg>
          )}
        </div>
        <button
          onClick={reset}
          className="mt-4 px-6 py-2 bg-zinc-800 text-zinc-300 text-sm font-medium rounded-lg hover:bg-zinc-700 hover:text-white transition cursor-pointer"
        >
          Search again
        </button>
      </main>
    );
  }

  // ── Checking spinner ───────────────────────────────────────────
  if (phase === 'loading-check') {
    return (
      <main className="flex h-screen w-screen flex-col items-center justify-center bg-black gap-4">
        <div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin" />
        <p className="text-zinc-500 text-sm tracking-widest uppercase">Checking...</p>
      </main>
    );
  }

  // ── Candidate picker ───────────────────────────────────────────
  if (phase === 'pick') {
    return (
      <main className="flex min-h-screen w-screen flex-col items-center justify-center bg-zinc-950 p-6 gap-8">
        <div className="flex flex-col items-center gap-1">
          <p className="text-zinc-400 text-sm tracking-widest uppercase">Results for</p>
          <h2 className="text-white text-2xl font-bold">"{query}"</h2>
        </div>

        {candidates.length === 0 ? (
          <div className="flex flex-col items-center gap-4 text-zinc-500">
            <p>No movies found.</p>
            <button onClick={reset} className="text-sm text-zinc-400 underline underline-offset-4 hover:text-white transition">
              Try again
            </button>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-4 w-full max-w-3xl">
              {candidates.map((movie) => (
                <button
                  key={movie.tmdb_id}
                  onClick={() => handlePick(movie.tmdb_id)}
                  className="group flex flex-col gap-2 rounded-lg overflow-hidden bg-zinc-900 border border-zinc-800 hover:border-zinc-500 transition-all hover:scale-105 focus:outline-none focus:ring-2 focus:ring-white"
                >
                  <img
                    src={movie.poster_path ?? PLACEHOLDER_POSTER}
                    alt={movie.title}
                    className="w-full aspect-[2/3] object-cover"
                  />
                  <div className="px-2 pb-3 flex flex-col gap-0.5">
                    <span className="text-white text-xs font-semibold leading-tight line-clamp-2 group-hover:text-zinc-200">
                      {movie.title}
                    </span>
                    {movie.original_title !== movie.title && (
                      <span className="text-zinc-500 text-xs line-clamp-1">{movie.original_title}</span>
                    )}
                    {movie.release_date && (
                      <span className="text-zinc-600 text-xs">{movie.release_date}</span>
                    )}
                  </div>
                </button>
              ))}
            </div>

            <button onClick={reset} className="text-sm text-zinc-600 hover:text-zinc-400 transition underline underline-offset-4">
              Search again
            </button>
          </>
        )}
      </main>
    );
  }

  // ── Search screen (default + loading-search) ───────────────────
  return (
    <main className="flex h-screen w-screen items-center justify-center bg-zinc-950 p-4">
      <form onSubmit={handleSearch} className="w-full max-w-md flex gap-2">
        <input
          type="text"
          placeholder="Movie Title / Título do Filme..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          disabled={phase === 'loading-search'}
          className="w-full px-4 py-3 bg-zinc-900 border border-zinc-800 rounded-lg text-white placeholder-zinc-500 focus:outline-none focus:border-zinc-700 disabled:opacity-50"
        />
        <button
          type="submit"
          disabled={phase === 'loading-search'}
          className="px-6 py-3 bg-white text-black font-semibold rounded-lg hover:bg-zinc-200 transition disabled:opacity-50 cursor-pointer"
        >
          {phase === 'loading-search' ? '...' : 'Check'}
        </button>
      </form>
    </main>
  );
}