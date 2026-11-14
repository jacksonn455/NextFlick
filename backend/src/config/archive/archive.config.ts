import { registerAs } from '@nestjs/config';

export default registerAs('archive', () => ({
  // Base URL of the Internet Archive (search, metadata, download and thumbnails)
  baseUrl: process.env.ARCHIVE_BASE_URL || 'https://archive.org',
  // Curated collection of full-length films on archive.org
  collection: process.env.ARCHIVE_COLLECTION || 'feature_films',
  timeout: 15000,
}));
