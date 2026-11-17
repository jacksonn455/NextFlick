import {
  ContentType,
  FreeMovie,
  MovieSource,
} from '../interfaces/free-movie.interface';

// From this length on a video counts as a full-length film
export const FEATURE_MIN_SECONDS = 40 * 60;

export function classifyContentType(
  seconds: number | null | undefined,
  fallback: ContentType = 'unknown',
): ContentType {
  if (!seconds || seconds <= 0) return fallback;
  return seconds >= FEATURE_MIN_SECONDS ? 'feature' : 'short';
}

// Titles that point to trailers, clips, reviews and other non-film uploads
const NOT_A_FILM =
  /\b(trailer|teaser|clip|clips|review|reaction|reacts?|explained|recap|ending|breakdown|music video|official video|lyric|soundtrack|ost|behind the scenes|making of|interview|featurette|scene|scenes|episode|ep\.?\s?\d+|season \d+|podcast|live stream|livestream|gameplay|walkthrough|tutorial|unboxing|compilation|shorts)\b|#shorts/i;

export const looksLikeNonFilm = (title: string) => NOT_A_FILM.test(title);

// Genre vocabulary shown in the filters, with the keywords that map source
// subjects, tags and categories to it
export const GENRES: Record<string, RegExp> = {
  Action: /\baction\b|martial arts|kung fu/i,
  Adventure: /adventure/i,
  Animation: /animat|cartoon|anime/i,
  Comedy: /comed|comic|humou?r|slapstick/i,
  Crime: /\bcrime|gangster|noir|detective/i,
  Documentary: /documentar|nonfiction|non-fiction|actualit|newsreel/i,
  Drama: /\bdrama/i,
  Family: /family|children|kids/i,
  Horror: /horror|zombie|vampire|monster/i,
  Musical: /musical/i,
  Mystery: /myster|suspense/i,
  Romance: /romanc|romantic|love stor/i,
  'Sci-Fi': /science fiction|sci-?fi|space|futur/i,
  Silent: /silent film|silent movie|\bsilent\b/i,
  Thriller: /thriller/i,
  War: /\bwar\b|world war|military/i,
  Western: /western|cowboy/i,
};

export const GENRE_NAMES = Object.keys(GENRES);

export function mapGenres(values: (string | null | undefined)[]): string[] {
  const text = values.filter(Boolean).join(' | ');
  if (!text) return [];
  return GENRE_NAMES.filter((genre) => GENRES[genre].test(text));
}

// Release year written in a title, e.g. "Nosferatu (1922)". "loose" also accepts
// a bare year ("Metropolis 1927"), for sources whose titles rarely use brackets.
export function extractYear(
  text: string | null | undefined,
  loose = false,
): string | null {
  const pattern = loose
    ? /(?:^|\D)(18[89]\d|19\d\d|20[0-4]\d)(?:\D|$)/
    : /[([]\s*(18[89]\d|19\d\d|20[0-4]\d)\s*[)\]]/;
  return text?.match(pattern)?.[1] ?? null;
}

// ISO 8601 duration used by YouTube ("PT1H32M10S", "P1DT2H") to seconds
export function parseIsoDuration(value: string | undefined): number | null {
  const match = value?.match(
    /^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?)?$/,
  );
  if (!match) return null;
  const [, d = 0, h = 0, m = 0, s = 0] = match;
  const seconds =
    Number(d) * 86400 + Number(h) * 3600 + Number(m) * 60 + Number(s);
  return seconds > 0 ? Math.round(seconds) : null;
}

const TITLE_NOISE =
  /\b(full movie|full film|full length|complete film|public domain|hd|4k|1080p|720p|restored|remastered|sub(titles?|bed)?|eng(lish)?|subs?)\b/g;

// Key used to recognize the same film on different sources
export function normalizeTitle(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[([{][^)\]}]*[)\]}]/g, ' ')
    .replace(TITLE_NOISE, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/^(the|a|an) /, '')
    .trim();
}

// Sources whose records are usually the richest come first
const SOURCE_PRIORITY: Record<MovieSource, number> = {
  archive: 0,
  loc: 1,
  peertube: 2,
  youtube: 3,
};

const rank = (movie: FreeMovie) =>
  (movie.freeToWatch ? 0 : 100) +
  (movie.license.allowed ? 0 : 10) +
  SOURCE_PRIORITY[movie.source];

const DURATION_TOLERANCE = 0.15;

// Two records describe the same film when the titles match and nothing
// (release year, running time) says otherwise
export function isSameFilm(a: FreeMovie, b: FreeMovie): boolean {
  if (a.source === b.source) return a.externalId === b.externalId;
  const title = normalizeTitle(a.title);
  if (!title || title !== normalizeTitle(b.title)) return false;
  if (a.year && b.year && a.year !== b.year) return false;
  if (a.durationSeconds && b.durationSeconds) {
    const longest = Math.max(a.durationSeconds, b.durationSeconds);
    const diff = Math.abs(a.durationSeconds - b.durationSeconds);
    if (diff / longest > DURATION_TOLERANCE) return false;
  }
  return true;
}

// Keeps the best record and only fills the fields it is missing, so richer
// metadata is never overwritten by incomplete data
function mergeRecords(group: FreeMovie[]): FreeMovie {
  const [primary, ...others] = [...group].sort((a, b) => rank(a) - rank(b));
  if (!others.length) return primary;

  const merged: FreeMovie = { ...primary };
  for (const other of others) {
    merged.year ??= other.year;
    merged.description ??= other.description;
    merged.creator ??= other.creator;
    merged.durationSeconds ??= other.durationSeconds;
    merged.publishedAt ??= other.publishedAt;
    if (merged.contentType === 'unknown')
      merged.contentType = other.contentType;
  }
  merged.genres = [...new Set(group.flatMap((movie) => movie.genres))];
  merged.alsoAvailableOn = [
    ...(primary.alsoAvailableOn ?? []),
    ...others.map(({ source, identifier }) => ({ source, identifier })),
  ];
  return merged;
}

export function deduplicate(movies: FreeMovie[]): FreeMovie[] {
  const groups: FreeMovie[][] = [];
  for (const movie of movies) {
    const group = groups.find((items) =>
      items.some((item) => isSameFilm(item, movie)),
    );
    if (!group) groups.push([movie]);
    // Exact same item returned twice by one source: keep the first
    else if (!group.some((item) => item.identifier === movie.identifier)) {
      group.push(movie);
    }
  }
  return groups.map(mergeRecords);
}

// Alternates sources so every list shows a mix instead of one source first
export function interleaveBySource(movies: FreeMovie[]): FreeMovie[] {
  const queues = new Map<MovieSource, FreeMovie[]>();
  for (const movie of movies) {
    const queue = queues.get(movie.source) ?? [];
    queue.push(movie);
    queues.set(movie.source, queue);
  }

  const result: FreeMovie[] = [];
  while (result.length < movies.length) {
    for (const queue of queues.values()) {
      const next = queue.shift();
      if (next) result.push(next);
    }
  }
  return result;
}
