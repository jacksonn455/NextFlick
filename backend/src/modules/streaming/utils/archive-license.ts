import { LicenseInfo } from '../interfaces/archive.interface';

// Only licenses that clearly allow anyone to show the film are streamable.
// NonCommercial (NC) and NoDerivatives (ND) licenses, custom rights statements
// and items without a license URL are rejected: being on archive.org does not
// make a film free to redistribute.
const RULES: { pattern: RegExp; info: Omit<LicenseInfo, 'url'> }[] = [
  {
    pattern: /creativecommons\.org\/publicdomain\/zero\//i,
    info: {
      type: 'cc0',
      label: 'CC0 1.0 (Public Domain Dedication)',
      allowed: true,
    },
  },
  {
    pattern:
      /creativecommons\.org\/(publicdomain\/mark\/|licenses\/publicdomain\/?)/i,
    info: { type: 'public-domain', label: 'Public Domain', allowed: true },
  },
  {
    pattern: /creativecommons\.org\/licenses\/by-sa\//i,
    info: { type: 'cc-by-sa', label: 'CC BY-SA', allowed: true },
  },
  {
    pattern: /creativecommons\.org\/licenses\/by\//i,
    info: { type: 'cc-by', label: 'CC BY', allowed: true },
  },
];

export function classifyLicense(url: string | null | undefined): LicenseInfo {
  const value = url?.trim() || null;

  if (value) {
    const rule = RULES.find(({ pattern }) => pattern.test(value));
    if (rule) {
      return { ...rule.info, url: value };
    }
  }

  return {
    type: null,
    label: value ? 'Unsupported license' : 'No license information',
    url: value,
    allowed: false,
  };
}

// Attribution line shown under the player (required by CC BY / BY-SA)
export function buildAttribution(
  title: string,
  creator: string | null,
  license: LicenseInfo,
  sourceUrl: string,
): string {
  const by = creator ? ` by ${creator}` : '';
  return `"${title}"${by}, from the Internet Archive (${sourceUrl}), ${license.label}.`;
}
