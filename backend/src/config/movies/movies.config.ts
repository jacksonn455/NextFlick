import { registerAs } from '@nestjs/config';

export default registerAs('movies', () => ({
  apiKey: process.env.OMDB_API_KEY,
  apiUrl: process.env.OMDB_API_URL || 'http://www.omdbapi.com/',
  timeout: 10000,
  maxRedirects: 5,
}));
