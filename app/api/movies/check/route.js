import { NextResponse } from 'next/server';
import {
  fetchFromTMDB,
  getWikidataQIDByIMDb,
  getWikidataEntity,
  extractWarnerRelatedQIDs,
  WARNER_QIDS
} from '../_warner';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const tmdbId = searchParams.get('tmdb_id');

  if (!tmdbId) {
    return NextResponse.json({ result: 'NO' });
  }

  try {
    const movie = await fetchFromTMDB(
      `/movie/${tmdbId}?append_to_response=external_ids`
    );

    if (!movie) {
      return NextResponse.json({ result: 'NO' });
    }

    // 1. TMDB production check (fast path)
    const productionMatch = movie.production_companies?.some(c =>
      c.name.toLowerCase().includes('warner')
    );

    if (productionMatch) {
      return NextResponse.json({ result: 'YES' });
    }

    // 2. Wikidata fallback via IMDb ID → QID (SPARQL, unambiguous)
    const imdbId = movie.external_ids?.imdb_id;
    if (!imdbId) return NextResponse.json({ result: 'NO' });

    const qid = await getWikidataQIDByIMDb(imdbId);
    const entity = await getWikidataEntity(qid);

    const relatedQIDs = extractWarnerRelatedQIDs(entity, qid);
    const isWarner = relatedQIDs.some(id => WARNER_QIDS.has(id));

    return NextResponse.json({ result: isWarner ? 'YES' : 'NO' });

  } catch {
    return NextResponse.json({ result: 'NO' });
  }
}