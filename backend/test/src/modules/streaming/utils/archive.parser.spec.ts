import {
  buildDownloadUrl,
  escapeSearchTerm,
  isValidIdentifier,
  parseDuration,
  parseYear,
  pickVideoFile,
  toPlainText,
  toText,
} from '../../../../../src/modules/streaming/utils/archive.parser';

describe('archive.parser', () => {
  describe('isValidIdentifier', () => {
    it.each(['sex_madness', 'Night.Of.The.Living.Dead_1080p', 'a-b_c.d', 'x'])(
      'accepts %s',
      (id) => expect(isValidIdentifier(id)).toBe(true),
    );

    it.each([
      undefined,
      '',
      '../etc/passwd',
      'has space',
      '_starts_with_underscore',
      'a/b',
      'a'.repeat(101),
    ])('rejects %p', (id) => expect(isValidIdentifier(id)).toBe(false));
  });

  describe('toText', () => {
    it('returns the first non-empty value of a list', () => {
      expect(toText(['', '  ', 'Van Bueren Studios', 'Other'])).toBe(
        'Van Bueren Studios',
      );
    });

    it('trims strings and turns empty values into null', () => {
      expect(toText('  Nosferatu ')).toBe('Nosferatu');
      expect(toText('   ')).toBeNull();
      expect(toText(undefined)).toBeNull();
      expect(toText([])).toBeNull();
    });
  });

  describe('toPlainText', () => {
    it('strips HTML tags and decodes common entities', () => {
      expect(
        toPlainText('A <b>classic</b> film<br/>by Romero &amp; Russo&nbsp;!'),
      ).toBe('A classic film by Romero & Russo !');
    });

    it('truncates very long descriptions', () => {
      const text = toPlainText('word '.repeat(500));

      expect(text!.length).toBeLessThanOrEqual(600);
      expect(text!.endsWith('…')).toBe(true);
    });

    it('returns null when nothing is left', () => {
      expect(toPlainText('<p></p>')).toBeNull();
    });
  });

  describe('parseYear', () => {
    it('prefers the year field', () => {
      expect(parseYear(1968, '1970-01-01')).toBe('1968');
    });

    it('falls back to the date', () => {
      expect(parseYear(undefined, '1922-03-04')).toBe('1922');
    });

    it('returns null without a 4-digit year', () => {
      expect(parseYear(undefined, 'unknown')).toBeNull();
      expect(parseYear(undefined, undefined)).toBeNull();
    });
  });

  describe('pickVideoFile', () => {
    const file = (name: string, format: string) => ({ name, format });

    it('prefers the h.264 MP4 over other MP4 derivatives', () => {
      const picked = pickVideoFile([
        file('movie_512kb.mp4', '512Kb MPEG4'),
        file('movie.mp4', 'h.264'),
        file('movie.ogv', 'Ogg Video'),
      ]);

      expect(picked?.name).toBe('movie.mp4');
    });

    it('skips HD and non-MP4 files', () => {
      expect(
        pickVideoFile([
          file('movie_hd.mp4', 'h.264 HD'),
          file('movie.mpeg', 'MPEG2'),
          file('movie.ogv', 'Ogg Video'),
        ]),
      ).toBeNull();
    });

    it('accepts an MP4 with an unknown format name', () => {
      expect(pickVideoFile([file('movie.MP4', 'Cinepack')])?.name).toBe(
        'movie.MP4',
      );
    });

    it('returns null without files', () => {
      expect(pickVideoFile(undefined)).toBeNull();
      expect(pickVideoFile([])).toBeNull();
    });
  });

  describe('parseDuration', () => {
    it('parses seconds', () => {
      expect(parseDuration('3117.52')).toBe(3118);
    });

    it('parses HH:MM:SS and MM:SS', () => {
      expect(parseDuration('01:02:03')).toBe(3723);
      expect(parseDuration('05:30')).toBe(330);
    });

    it('returns null for missing or invalid values', () => {
      expect(parseDuration(undefined)).toBeNull();
      expect(parseDuration('abc')).toBeNull();
      expect(parseDuration('0')).toBeNull();
    });
  });

  describe('buildDownloadUrl', () => {
    it('encodes each path segment of the file name', () => {
      expect(
        buildDownloadUrl('https://archive.org', 'item', 'dir/My Movie #1.mp4'),
      ).toBe('https://archive.org/download/item/dir/My%20Movie%20%231.mp4');
    });
  });

  describe('escapeSearchTerm', () => {
    it('removes Lucene operators', () => {
      expect(escapeSearchTerm('title:(x) OR "y"*')).toBe('title x OR y');
    });
  });
});
