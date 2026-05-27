import { NextResponse } from 'next/server';
import { fetchFromTMDB } from '../_warner';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const movieName = searchParams.get('name');

  if (!movieName) {
    return NextResponse.json({ results: [] });
  }

  try {
    const [en, pt] = await Promise.all([
      fetchFromTMDB(`/search/movie?query=${encodeURIComponent(movieName)}&language=en-US&page=1`),
      fetchFromTMDB(`/search/movie?query=${encodeURIComponent(movieName)}&language=pt-BR&page=1`)
    ]);

    const seen = new Set();
    const results = [...(en?.results ?? []), ...(pt?.results ?? [])]
      .filter(r => {
        if (seen.has(r.id)) return false;
        seen.add(r.id);
        return r.vote_count > 10;
      })
      .slice(0, 5)
      .map(r => ({
        tmdb_id: r.id,
        title: r.title,
        original_title: r.original_title,
        release_date: r.release_date?.slice(0, 4) ?? null,
        poster_path: r.poster_path
          ? `https://image.tmdb.org/t/p/w185${r.poster_path}`
          : null,
      }));

    return NextResponse.json({ results });
  } catch {
    return NextResponse.json({ results: [] });
  }
}