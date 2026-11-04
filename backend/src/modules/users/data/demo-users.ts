// There is no sign-up yet: these users are created on startup so the app
// (and the recommendation training) always has more than one user.
//
// Each profile has a clear taste and favorites from the movie catalog
// (src/modules/movies/data/seed-movies.ts). That is the signal the
// recommendation model learns from: users who like the same kind of movie.
export interface DemoUser {
  username: string;
  name: string;
  taste?: string;
  // imdbIDs, saved as favorites only while the user has none
  favorites?: string[];
}

export const DEMO_USERS: DemoUser[] = [
  // Starts empty: the person testing the app fills it from the UI
  { username: 'guest', name: 'Guest' },
  {
    username: 'ana-lima',
    name: 'Ana Lima',
    taste: 'Horror',
    favorites: [
      'tt0081505', // The Shining
      'tt5052448', // Get Out
      'tt7784604', // Hereditary
      'tt0070047', // The Exorcist
      'tt6644200', // A Quiet Place
      'tt1457767', // The Conjuring
      'tt0077651', // Halloween
      'tt2321549', // The Babadook
      'tt3235888', // It Follows
      'tt8772262', // Midsommar
      'tt1591095', // Insidious
      'tt1922777', // Sinister
    ],
  },
  {
    username: 'bruno-ferreira',
    name: 'Bruno Ferreira',
    taste: 'Animation and family',
    favorites: [
      'tt0114709', // Toy Story
      'tt0435761', // Toy Story 3
      'tt0266543', // Finding Nemo
      'tt0110357', // The Lion King
      'tt2380307', // Coco
      'tt2096673', // Inside Out
      'tt0382932', // Ratatouille
      'tt0126029', // Shrek
      'tt0198781', // Monsters, Inc.
      'tt0317705', // The Incredibles
      'tt2948356', // Zootopia
      'tt3521164', // Moana
    ],
  },
  {
    username: 'carla-souza',
    name: 'Carla Souza',
    taste: 'Drama',
    favorites: [
      'tt0111161', // The Shawshank Redemption
      'tt0109830', // Forrest Gump
      'tt0120689', // The Green Mile
      'tt0119217', // Good Will Hunting
      'tt0097165', // Dead Poets Society
      'tt0454921', // The Pursuit of Happyness
      'tt4975722', // Moonlight
      'tt3170832', // Room
      'tt1504320', // The King's Speech
      'tt0405159', // Million Dollar Baby
      'tt1895587', // Spotlight
      'tt9770150', // Nomadland
    ],
  },
  {
    username: 'diego-alves',
    name: 'Diego Alves',
    taste: 'Action',
    favorites: [
      'tt0468569', // The Dark Knight
      'tt1392190', // Mad Max: Fury Road
      'tt0172495', // Gladiator
      'tt0095016', // Die Hard
      'tt2911666', // John Wick
      'tt4912910', // Mission: Impossible - Fallout
      'tt1745960', // Top Gun: Maverick
      'tt0381061', // Casino Royale
      'tt1074638', // Skyfall
      'tt0111257', // Speed
      'tt0258463', // The Bourne Identity
      'tt3890160', // Baby Driver
    ],
  },
  {
    username: 'eduarda-rocha',
    name: 'Eduarda Rocha',
    taste: 'Science fiction',
    favorites: [
      'tt1375666', // Inception
      'tt0816692', // Interstellar
      'tt0083658', // Blade Runner
      'tt1856101', // Blade Runner 2049
      'tt2543164', // Arrival
      'tt0470752', // Ex Machina
      'tt1798709', // Her
      'tt1136608', // District 9
      'tt3659388', // The Martian
      'tt1160419', // Dune
      'tt0206634', // Children of Men
      'tt0062622', // 2001: A Space Odyssey
    ],
  },
  {
    username: 'gabriel-costa',
    name: 'Gabriel Costa',
    taste: 'Crime',
    favorites: [
      'tt0110912', // Pulp Fiction
      'tt0099685', // GoodFellas
      'tt0407887', // The Departed
      'tt0114369', // Seven
      'tt0114814', // The Usual Suspects
      'tt0113277', // Heat
      'tt0105236', // Reservoir Dogs
      'tt0477348', // No Country for Old Men
      'tt0086250', // Scarface
      'tt1302006', // The Irishman
      'tt0116282', // Fargo
      'tt0208092', // Snatch
    ],
  },
  {
    username: 'helena-martins',
    name: 'Helena Martins',
    taste: 'Comedy',
    favorites: [
      'tt2278388', // The Grand Budapest Hotel
      'tt0829482', // Superbad
      'tt1119646', // The Hangover
      'tt0107048', // Groundhog Day
      'tt0377092', // Mean Girls
      'tt1478338', // Bridesmaids
      'tt0838283', // Step Brothers
      'tt0118715', // The Big Lebowski
      'tt0425112', // Hot Fuzz
      'tt0365748', // Shaun of the Dead
      'tt0449059', // Little Miss Sunshine
      'tt0109686', // Dumb and Dumber
    ],
  },
  {
    username: 'igor-santos',
    name: 'Igor Santos',
    taste: 'War and history',
    favorites: [
      'tt0120815', // Saving Private Ryan
      'tt8579674', // 1917
      'tt5013056', // Dunkirk
      'tt0078788', // Apocalypse Now
      'tt0093058', // Full Metal Jacket
      'tt2119532', // Hacksaw Ridge
      'tt0091763', // Platoon
      'tt0112573', // Braveheart
      'tt0253474', // The Pianist
      'tt0108052', // Schindler's List
      'tt1016150', // All Quiet on the Western Front
      'tt0265086', // Black Hawk Down
    ],
  },
  {
    username: 'julia-pereira',
    name: 'Julia Pereira',
    taste: 'Romance',
    favorites: [
      'tt0120338', // Titanic
      'tt3783958', // La La Land
      'tt0332280', // The Notebook
      'tt0414387', // Pride & Prejudice
      'tt0112471', // Before Sunrise
      'tt0338013', // Eternal Sunshine of the Spotless Mind
      'tt0125439', // Notting Hill
      'tt0100405', // Pretty Woman
      'tt5726616', // Call Me by Your Name
      'tt0314331', // Love Actually
      'tt2194499', // About Time
      'tt13238346', // Past Lives
    ],
  },
  {
    username: 'lucas-oliveira',
    name: 'Lucas Oliveira',
    taste: 'Fantasy and adventure',
    favorites: [
      'tt0120737', // The Lord of the Rings: The Fellowship of the Ring
      'tt0167260', // The Lord of the Rings: The Return of the King
      'tt0241527', // Harry Potter and the Sorcerer's Stone
      'tt0304141', // Harry Potter and the Prisoner of Azkaban
      'tt0325980', // Pirates of the Caribbean: The Curse of the Black Pearl
      'tt0093779', // The Princess Bride
      'tt0097576', // Indiana Jones and the Last Crusade
      'tt0082971', // Raiders of the Lost Ark
      'tt0454876', // Life of Pi
      'tt2015381', // Guardians of the Galaxy
      'tt0457430', // Pan's Labyrinth
      'tt0319061', // Big Fish
    ],
  },
  {
    username: 'mariana-ribeiro',
    name: 'Mariana Ribeiro',
    taste: 'Musicals and music',
    favorites: [
      'tt0059742', // The Sound of Music
      'tt0077631', // Grease
      'tt0045152', // Singin' in the Rain
      'tt0795421', // Mamma Mia!
      'tt1485796', // The Greatest Showman
      'tt1727824', // Bohemian Rhapsody
      'tt2066051', // Rocketman
      'tt1707386', // Les Misérables
      'tt3783958', // La La Land
      'tt2582802', // Whiplash
    ],
  },
  {
    username: 'nicolas-almeida',
    name: 'Nicolas Almeida',
    taste: 'TV series',
    favorites: [
      'tt0903747', // Breaking Bad
      'tt0108778', // Friends
      'tt4574334', // Stranger Things
      'tt0386676', // The Office
      'tt0944947', // Game of Thrones
      'tt5753856', // Dark
      'tt4786824', // The Crown
      'tt7366338', // Chernobyl
      'tt1475582', // Sherlock
      'tt2085059', // Black Mirror
      'tt3581920', // The Last of Us
      'tt7660850', // Succession
    ],
  },
  {
    username: 'olivia-carvalho',
    name: 'Olivia Carvalho',
    taste: 'Brazilian and world cinema',
    favorites: [
      'tt0317248', // City of God
      'tt0861739', // Elite Squad
      'tt1555149', // Elite Squad 2: The Enemy Within
      'tt0140888', // Central Station
      'tt2762506', // Bacurau
      'tt3742378', // The Second Mother
      'tt14961016', // I'm Still Here
      'tt6751668', // Parasite
      'tt0211915', // Amélie
      'tt1675434', // The Intouchables
      'tt0364569', // Oldboy
      'tt0245429', // Spirited Away
    ],
  },
  {
    username: 'pedro-gomes',
    name: 'Pedro Gomes',
    taste: 'Action and sci-fi',
    favorites: [
      'tt0133093', // The Matrix
      'tt0103064', // Terminator 2: Judgment Day
      'tt0090605', // Aliens
      'tt1631867', // Edge of Tomorrow
      'tt0499549', // Avatar
      'tt4154796', // Avengers: Endgame
      'tt3315342', // Logan
      'tt1825683', // Black Panther
      'tt1375666', // Inception
      'tt1392190', // Mad Max: Fury Road
      'tt0107290', // Jurassic Park
      'tt0088247', // The Terminator
    ],
  },
  {
    username: 'rafaela-lima',
    name: 'Rafaela Lima',
    taste: 'Psychological thrillers',
    favorites: [
      'tt1130884', // Shutter Island
      'tt0482571', // The Prestige
      'tt0947798', // Black Swan
      'tt2267998', // Gone Girl
      'tt1392214', // Prisoners
      'tt0443706', // Zodiac
      'tt0114369', // Seven
      'tt0102926', // The Silence of the Lambs
      'tt0167404', // The Sixth Sense
      'tt0209144', // Memento
      'tt2872718', // Nightcrawler
      'tt7784604', // Hereditary
    ],
  },
  {
    username: 'thiago-barbosa',
    name: 'Thiago Barbosa',
    taste: 'Classics',
    favorites: [
      'tt0034583', // Casablanca
      'tt0054215', // Psycho
      'tt0047396', // Rear Window
      'tt0052357', // Vertigo
      'tt0068646', // The Godfather
      'tt0075314', // Taxi Driver
      'tt0062622', // 2001: A Space Odyssey
      'tt0045152', // Singin' in the Rain
      'tt0059742', // The Sound of Music
      'tt0071853', // Monty Python and the Holy Grail
      'tt0076759', // Star Wars: Episode IV - A New Hope
      'tt0078748', // Alien
    ],
  },
];

// Before the users collection, favorites stored a free-text userId.
// Legacy ids not listed here are kept as the username of a new user.
export const LEGACY_USER_IDS: Record<string, string> = {
  'user-123': 'guest',
};
