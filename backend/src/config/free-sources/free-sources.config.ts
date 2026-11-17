import { registerAs } from '@nestjs/config';

// Default PeerTube search: SepiaSearch indexes videos from hundreds of federated
// instances through the standard PeerTube search API
const DEFAULT_PEERTUBE_INSTANCES = 'https://sepiasearch.org';

const parseList = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((item) => item.trim().replace(/\/+$/, ''))
    .filter((item) => /^https:\/\/[^/\s]+$/i.test(item));

// Extra free movie sources. Internet Archive keeps its own config (archive.config).
export default registerAs('freeSources', () => ({
  youtube: {
    // Without a key the YouTube source is disabled; nothing else changes
    apiKey: process.env.YOUTUBE_API_KEY?.trim() || null,
    baseUrl: 'https://www.googleapis.com/youtube/v3',
    timeout: 8000,
    // search.list costs 100 quota units (10,000/day by default): cap searches per day
    dailySearchBudget: 80,
  },
  peertube: {
    // Comma-separated HTTPS base URLs of PeerTube instances or search indexes
    instances: parseList(
      process.env.PEERTUBE_INSTANCES ?? DEFAULT_PEERTUBE_INSTANCES,
    ),
    timeout: 8000,
  },
  loc: {
    baseUrl: 'https://www.loc.gov',
    collection: 'national-screening-room',
    // loc.gov is slow (often 10-30s); results are cached for a day
    timeout: 30000,
  },
}));
