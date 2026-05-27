import { NextResponse } from 'next/server';

const TMDB_TOKEN = process.env.TMDB_ACCESS_TOKEN;

// strict known Warner-related Wikidata IDs
const WARNER_QIDS = new Set([
  "Q168383", // Warner Bros.
  "Q126399", // Warner Bros. Pictures
  "Q181486", // New Line Cinema
  "Q154150"  // HBO
]);

async function fetchFromTMDB(endpoint) {
  const res = await fetch(`https://api.themoviedb.org/3${endpoint}`, {
    headers: {
      Authorization: TMDB_TOKEN,
      accept: 'application/json',
    },
    next: { revalidate: 3600 }
  });

  if (!res.ok) return null;
  return res.json();
}

function extractWarnerRelatedQIDs(entityJson, qid) {
  const entity = entityJson?.entities?.[`Q${qid}`];
  const claims = entity?.claims ?? {};

  // P750 = distributed by, P272 = production company
  const relevant = [...(claims.P750 ?? []), ...(claims.P272 ?? [])];

  return relevant
    .map(c => c?.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
}

function isWarnerDistributor(distributorQIDs) {
  return distributorQIDs.some(id => WARNER_QIDS.has(id));
}

async function getWikidataQIDByIMDb(imdbId) {
  const url = 'https://query.wikidata.org/sparql?' +
    new URLSearchParams({
      query: `SELECT ?item WHERE { ?item wdt:P345 "${imdbId}". }`,
      format: 'json'
    });

  const res = await fetch(url, {
    headers: {
      'User-Agent': 'MovieChecker/1.0',
      Accept: 'application/sparql-results+json'
    }
  });

  if (!res.ok) return null;

  const data = await res.json();
  const uri = data?.results?.bindings?.[0]?.item?.value;
  return uri ? uri.split('/').pop().replace('Q', '') : null;
}

async function getWikidataEntity(qid) {
  if (!qid) return null;

  const res = await fetch(
    `https://www.wikidata.org/wiki/Special:EntityData/Q${qid}.json`,
    {
      headers: {
        'User-Agent': 'MovieChecker/1.0'
      }
    }
  );

  if (!res.ok) return null;
  return res.json();
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const movieName = searchParams.get('name');

  if (!movieName) {
    return NextResponse.json({ result: 'NO' });
  }

  try {
    let movieId = null;

    const search = async (lang) =>
      fetchFromTMDB(
        `/search/movie?query=${encodeURIComponent(movieName)}&language=${lang}&page=1`
      );

    const [en, pt] = await Promise.all([search('en-US'), search('pt-BR')]);

    const enResult = en?.results?.[0];
    const ptResult = pt?.results?.[0];

    console.log(ptResult)

    // Pick whichever has more popularity, deduplicating by id
    if (enResult && ptResult && enResult.id !== ptResult.id) {
      movieId = (ptResult.popularity > enResult.popularity ? ptResult : enResult).id;
    } else {
      movieId = enResult?.id ?? ptResult?.id ?? null;
    }

    if (!movieId) {
      return NextResponse.json({ result: 'NO' });
    }

    const movie = await fetchFromTMDB(
      `/movie/${movieId}?append_to_response=external_ids`
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

    // Check both P750 (distributed by) and P272 (production company)
    const relatedQIDs = extractWarnerRelatedQIDs(entity, qid);
    const isWarner = isWarnerDistributor(relatedQIDs);

    return NextResponse.json({ result: isWarner ? 'YES' : 'NO' });

  } catch {
    return NextResponse.json({ result: 'NO' });
  }
}