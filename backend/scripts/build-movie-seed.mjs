// Builds src/modules/movies/data/seed-movies.ts from the running NextFlick API.
//
// For every title below it calls GET /movies/search to find the IMDb id and
// GET /movies/:imdbID for the details, so the OMDb key never leaves the API
// and every response goes through its Redis cache.
//
// Usage (with the API running):  npm run seed:movies:build
//   API_URL=http://localhost:3005 npm run seed:movies:build
import { writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const API_URL = (process.env.API_URL ?? 'http://localhost:3000').replace(/\/$/, '');
const OUTPUT = fileURLToPath(new URL('../src/modules/movies/data/seed-movies.ts', import.meta.url));
const CONCURRENCY = 4;

// Picked to cover many genres, decades and ratings, so the recommendation
// model has something to tell apart. [title, year of release]
const TITLES = [
  // Drama
  ['The Shawshank Redemption', 1994], ['Forrest Gump', 1994], ['The Green Mile', 1999],
  ["Schindler's List", 1993], ['Good Will Hunting', 1997], ['Whiplash', 2014],
  ['The Pursuit of Happyness', 2006], ['The Social Network', 2010], ['12 Years a Slave', 2013],
  ['Moonlight', 2016], ['Parasite', 2019], ['Joker', 2019], ['Oppenheimer', 2023],
  ['The Godfather', 1972], ['Dead Poets Society', 1989], ['American Beauty', 1999],
  ['The Truman Show', 1998], ['Million Dollar Baby', 2004], ['Spotlight', 2015],
  ["The King's Speech", 2010], ['Slumdog Millionaire', 2008], ['Green Book', 2018],
  ['Nomadland', 2020], ['Room', 2015], ['Gran Torino', 2008],
  // Crime
  ['Pulp Fiction', 1994], ['Goodfellas', 1990], ['The Departed', 2006], ['Seven', 1995],
  ['The Usual Suspects', 1995], ['Heat', 1995], ['Reservoir Dogs', 1992],
  ['No Country for Old Men', 2007], ['Scarface', 1983], ['The Irishman', 2019],
  ['Prisoners', 2013], ['Zodiac', 2007], ['Gone Girl', 2014], ['Memento', 2000],
  ['Knives Out', 2019], ['Catch Me If You Can', 2002], ['The Silence of the Lambs', 1991],
  ['Drive', 2011], ['Nightcrawler', 2014], ['Fargo', 1996], ['Snatch', 2000],
  // Action
  ['The Dark Knight', 2008], ['Mad Max: Fury Road', 2015], ['Gladiator', 2000],
  ['Die Hard', 1988], ['John Wick', 2014], ['Mission: Impossible - Fallout', 2018],
  ['Top Gun: Maverick', 2022], ['The Matrix', 1999], ['Terminator 2: Judgment Day', 1991],
  ['Kill Bill: Vol. 1', 2003], ['The Bourne Identity', 2002], ['Casino Royale', 2006],
  ['Skyfall', 2012], ['Speed', 1994], ['Raiders of the Lost Ark', 1981], ['Logan', 2017],
  ['Black Panther', 2018], ['Avengers: Endgame', 2019], ['Baby Driver', 2017],
  ['Edge of Tomorrow', 2014],
  // Science fiction
  ['Inception', 2010], ['Interstellar', 2014], ['Blade Runner', 1982],
  ['Blade Runner 2049', 2017], ['Arrival', 2016], ['Alien', 1979], ['Aliens', 1986],
  ['The Terminator', 1984], ['Back to the Future', 1985], ['E.T. the Extra-Terrestrial', 1982],
  ['Star Wars', 1977], ['The Empire Strikes Back', 1980], ['Dune', 2021],
  ['Dune: Part Two', 2024], ['Ex Machina', 2014], ['Her', 2013], ['District 9', 2009],
  ['Gravity', 2013], ['The Martian', 2015], ['Jurassic Park', 1993],
  ['2001: A Space Odyssey', 1968], ['Children of Men', 2006],
  ['Everything Everywhere All at Once', 2022], ['Avatar', 2009],
  // Animation
  ['Toy Story', 1995], ['Toy Story 3', 2010], ['Finding Nemo', 2003], ['The Lion King', 1994],
  ['Spirited Away', 2001], ['My Neighbor Totoro', 1988], ['Princess Mononoke', 1997],
  ['Coco', 2017], ['Inside Out', 2015], ['Ratatouille', 2007], ['Shrek', 2001],
  ['Monsters, Inc.', 2001], ['The Incredibles', 2004], ['Zootopia', 2016], ['Frozen', 2013],
  ['Moana', 2016], ['Spider-Man: Into the Spider-Verse', 2018],
  ['How to Train Your Dragon', 2010], ['Kung Fu Panda', 2008], ['Soul', 2020],
  ['The Iron Giant', 1999], ["Howl's Moving Castle", 2004], ['Grave of the Fireflies', 1988],
  // Comedy
  ['The Grand Budapest Hotel', 2014], ['Superbad', 2007], ['The Hangover', 2009],
  ['Groundhog Day', 1993], ['Home Alone', 1990], ['Mean Girls', 2004], ['Bridesmaids', 2011],
  ['Step Brothers', 2008], ['The Big Lebowski', 1998], ["Ferris Bueller's Day Off", 1986],
  ['Hot Fuzz', 2007], ['Shaun of the Dead', 2004], ['Little Miss Sunshine', 2006],
  ['Barbie', 2023], ['The Mask', 1994], ['Dumb and Dumber', 1994], ['Mrs. Doubtfire', 1993],
  ['Monty Python and the Holy Grail', 1975], ['Jojo Rabbit', 2019], ['The Intouchables', 2011],
  // Horror
  ['The Shining', 1980], ['Get Out', 2017], ['Hereditary', 2018], ['The Exorcist', 1973],
  ['A Quiet Place', 2018], ['The Conjuring', 2013], ['Halloween', 1978], ['Psycho', 1960],
  ['The Babadook', 2014], ['It Follows', 2014], ['Midsommar', 2019], ['Scream', 1996],
  ['The Ring', 2002], ['Sinister', 2012], ['Insidious', 2010], ['Nope', 2022],
  ['Talk to Me', 2022], ['The Thing', 1982], ['Train to Busan', 2016], ['The Others', 2001],
  // Romance
  ['Titanic', 1997], ['La La Land', 2016], ['The Notebook', 2004], ['Pride & Prejudice', 2005],
  ['Before Sunrise', 1995], ['Eternal Sunshine of the Spotless Mind', 2004],
  ['Notting Hill', 1999], ['Pretty Woman', 1990], ['Amélie', 2001],
  ['Call Me by Your Name', 2017], ['500 Days of Summer', 2009], ['Crazy Rich Asians', 2018],
  ['Love Actually', 2003], ['About Time', 2013], ['A Star Is Born', 2018], ['Casablanca', 1942],
  ['Past Lives', 2023],
  // Fantasy and adventure
  ['The Lord of the Rings: The Fellowship of the Ring', 2001],
  ['The Lord of the Rings: The Return of the King', 2003],
  ["Harry Potter and the Sorcerer's Stone", 2001],
  ['Harry Potter and the Prisoner of Azkaban', 2004],
  ['Pirates of the Caribbean: The Curse of the Black Pearl', 2003], ["Pan's Labyrinth", 2006],
  ['The Princess Bride', 1987], ['Indiana Jones and the Last Crusade', 1989],
  ['The Shape of Water', 2017], ['Life of Pi', 2012], ['Big Fish', 2003],
  ['Guardians of the Galaxy', 2014],
  // War and history
  ['Saving Private Ryan', 1998], ['1917', 2019], ['Dunkirk', 2017], ['Apocalypse Now', 1979],
  ['Full Metal Jacket', 1987], ['Hacksaw Ridge', 2016], ['Platoon', 1986], ['Braveheart', 1995],
  ['The Pianist', 2002], ['Life Is Beautiful', 1997], ['Inglourious Basterds', 2009],
  ['All Quiet on the Western Front', 2022], ['Black Hawk Down', 2001],
  // Thriller and mystery
  ['Shutter Island', 2010], ['The Prestige', 2006], ['Black Swan', 2010], ['Oldboy', 2003],
  ['Rear Window', 1954], ['Vertigo', 1958], ['Mulholland Drive', 2001], ['Sicario', 2015],
  ['The Sixth Sense', 1999], ['Mystic River', 2003], ['Taxi Driver', 1976],
  ['Uncut Gems', 2019], ['The Girl with the Dragon Tattoo', 2011],
  // Brazilian
  ['City of God', 2002], ['Elite Squad', 2007], ['Elite Squad: The Enemy Within', 2010],
  ['Central Station', 1998], ['Bacurau', 2019], ['The Second Mother', 2015],
  ["I'm Still Here", 2024],
  // Musical
  ['The Sound of Music', 1965], ['Grease', 1978], ["Singin' in the Rain", 1952],
  ['Mamma Mia!', 2008], ['The Greatest Showman', 2017], ['Bohemian Rhapsody', 2018],
  ['Rocketman', 2019], ['Les Misérables', 2012],
  // Series
  ['Breaking Bad', 2008], ['Friends', 1994], ['Stranger Things', 2016], ['The Office', 2005],
  ['Game of Thrones', 2011], ['Dark', 2017], ['The Crown', 2016], ['Chernobyl', 2019],
  ['Sherlock', 2010], ['Black Mirror', 2011], ['The Last of Us', 2023], ['Succession', 2018],
];

// Fields the catalog keeps; the API service parses them into numbers and lists
const FIELDS = [
  'imdbID', 'Title', 'Year', 'Type', 'Poster', 'Rated', 'Runtime',
  'Genre', 'Director', 'Language', 'Country', 'imdbRating',
];

const normalize = (title) =>
  title
    .normalize('NFD')
    // drops the accents NFD split off: "Amélie" -> "Amelie"
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]/g, '')
    .replace(/^the/, '');

async function getJson(path) {
  const response = await fetch(`${API_URL}${path}`);
  if (!response.ok) {
    throw new Error(`${response.status} on ${path}`);
  }
  return (await response.json()).data;
}

// OMDb's Year is the US release, often a year or two after the original one
// (Spirited Away: 2001 -> 2003), so nearby years count, the closest first
const YEAR_TOLERANCE = 2;

// OMDb titles don't always match ours ("Star Wars" is "Star Wars: Episode IV - A New Hope").
// Candidates in order of preference: exact titles (closest year first), then same-year
// titles that contain ours, then a lone same-year result
function rankCandidates(results, title, year) {
  const wanted = normalize(title);
  const distance = (movie) => Math.abs(Number.parseInt(movie.Year, 10) - year);
  const nearby = results
    .filter((movie) => distance(movie) <= YEAR_TOLERANCE)
    .sort((a, b) => distance(a) - distance(b));
  const sameYear = nearby.filter((movie) => distance(movie) === 0);

  const candidates = [
    ...nearby.filter((movie) => normalize(movie.Title) === wanted),
    ...sameYear.filter((movie) => normalize(movie.Title).includes(wanted)),
    ...(sameYear.length === 1 ? sameYear : []),
  ];
  return [...new Map(candidates.map((movie) => [movie.imdbID, movie])).values()];
}

// Shorts, clips and fan videos share titles with real movies ("Insidious" has an
// 8-minute short from 2010): they have no genre/runtime, or the genre "Short"
const isFeature = (details) =>
  Boolean(details.Genre && details.Runtime) && !details.Genre.includes('Short');

// OMDb search returns nothing for some punctuated titles ("Mission: Impossible - Fallout"),
// so the second try drops the punctuation
const searchQueries = (title) => [
  ...new Set([title, title.replace(/[:\-–!.,]/g, ' ').replace(/\s+/g, ' ').trim()]),
];

async function resolve([title, year]) {
  const rejected = [];

  for (const query of searchQueries(title)) {
    const results = await getJson(`/movies/search?q=${encodeURIComponent(query)}`);

    for (const candidate of rankCandidates(results, title, year)) {
      const details = await getJson(`/movies/${candidate.imdbID}`);
      if (isFeature(details)) {
        return Object.fromEntries(FIELDS.map((field) => [field, details[field] ?? null]));
      }
      rejected.push(`${candidate.imdbID} "${candidate.Title}"`);
    }
  }

  throw new Error(
    rejected.length
      ? `only shorts or clips found: ${rejected.join(', ')}`
      : 'no search result with a matching title and year',
  );
}

async function main() {
  const movies = new Map();
  const failures = [];
  let next = 0;

  const worker = async () => {
    while (next < TITLES.length) {
      const entry = TITLES[next++];
      try {
        const movie = await resolve(entry);
        movies.set(movie.imdbID, movie);
        process.stdout.write('.');
      } catch (error) {
        failures.push(`${entry[0]} (${entry[1]}): ${error.message}`);
        process.stdout.write('x');
      }
    }
  };

  console.log(`Resolving ${TITLES.length} titles through ${API_URL}`);
  await Promise.all(Array.from({ length: CONCURRENCY }, worker));
  console.log();

  const sorted = [...movies.values()].sort((a, b) => a.Title.localeCompare(b.Title));
  const source = `// Generated by scripts/build-movie-seed.mjs from the NextFlick API (OMDb data).
// Do not edit by hand: change the titles in the script and run \`npm run seed:movies:build\`.
import { SeedMovieDetails } from '../interfaces/catalog-movie.interface';

export const SEED_MOVIES: SeedMovieDetails[] = ${JSON.stringify(sorted, null, 2)};
`;
  await writeFile(OUTPUT, source);

  console.log(`Wrote ${sorted.length} movies to ${OUTPUT}`);
  if (failures.length) {
    console.log(`\n${failures.length} titles not resolved:`);
    failures.forEach((failure) => console.log(`  - ${failure}`));
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
