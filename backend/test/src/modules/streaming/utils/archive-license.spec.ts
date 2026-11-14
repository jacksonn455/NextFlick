import {
  buildAttribution,
  classifyLicense,
} from '../../../../../src/modules/streaming/utils/archive-license';

describe('classifyLicense', () => {
  it.each([
    ['http://creativecommons.org/licenses/publicdomain/', 'public-domain'],
    ['https://creativecommons.org/publicdomain/mark/1.0/', 'public-domain'],
    ['http://creativecommons.org/publicdomain/zero/1.0/', 'cc0'],
    ['https://creativecommons.org/licenses/by/4.0/', 'cc-by'],
    ['https://creativecommons.org/licenses/by-sa/3.0/', 'cc-by-sa'],
  ])('allows %s as %s', (url, type) => {
    const license = classifyLicense(url);

    expect(license.allowed).toBe(true);
    expect(license.type).toBe(type);
    expect(license.url).toBe(url);
  });

  it.each([
    'https://creativecommons.org/licenses/by-nc/4.0/',
    'https://creativecommons.org/licenses/by-nc-sa/3.0/',
    'https://creativecommons.org/licenses/by-nd/4.0/',
    'https://creativecommons.org/licenses/by-nc-nd/4.0/',
    'https://example.com/all-rights-reserved',
  ])('rejects %s', (url) => {
    const license = classifyLicense(url);

    expect(license.allowed).toBe(false);
    expect(license.type).toBeNull();
    expect(license.label).toBe('Unsupported license');
  });

  it.each([undefined, null, '', '   '])(
    'rejects a missing license (%p)',
    (url) => {
      const license = classifyLicense(url);

      expect(license).toEqual({
        type: null,
        label: 'No license information',
        url: null,
        allowed: false,
      });
    },
  );
});

describe('buildAttribution', () => {
  const license = classifyLicense(
    'http://creativecommons.org/licenses/publicdomain/',
  );

  it('credits the creator, the source and the license', () => {
    expect(
      buildAttribution(
        'Nosferatu',
        'F. W. Murnau',
        license,
        'https://archive.org/details/nosferatu',
      ),
    ).toBe(
      '"Nosferatu" by F. W. Murnau, from the Internet Archive (https://archive.org/details/nosferatu), Public Domain.',
    );
  });

  it('omits the creator when unknown', () => {
    expect(
      buildAttribution('Nosferatu', null, license, 'https://archive.org/x'),
    ).toBe(
      '"Nosferatu", from the Internet Archive (https://archive.org/x), Public Domain.',
    );
  });
});
