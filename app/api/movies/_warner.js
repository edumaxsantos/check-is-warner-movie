const TMDB_TOKEN = process.env.TMDB_ACCESS_TOKEN;

export const WARNER_QIDS = new Set([
  "Q168383", // Warner Bros.
  "Q126399", // Warner Bros. Pictures
  "Q181486", // New Line Cinema
  "Q154150"  // HBO
]);

export async function fetchFromTMDB(endpoint) {
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

export async function getWikidataQIDByIMDb(imdbId) {
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

export async function getWikidataEntity(qid) {
  if (!qid) return null;

  const res = await fetch(
    `https://www.wikidata.org/wiki/Special:EntityData/Q${qid}.json`,
    { headers: { 'User-Agent': 'MovieChecker/1.0' } }
  );

  if (!res.ok) return null;
  return res.json();
}

export function extractWarnerRelatedQIDs(entityJson, qid) {
  const entity = entityJson?.entities?.[`Q${qid}`];
  const claims = entity?.claims ?? {};

  const relevant = [...(claims.P750 ?? []), ...(claims.P272 ?? [])];

  return relevant
    .map(c => c?.mainsnak?.datavalue?.value?.id)
    .filter(Boolean);
}