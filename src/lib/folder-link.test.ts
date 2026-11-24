import { describe, expect, test } from 'bun:test';
import { folderLink, requireFolderLink } from '../../convex/lib/folderLock';

describe('folder link', () => {
  test('an https URL is kept as sent and its host is named', () => {
    expect(folderLink('https://studio.example.com/series/blood-rush?tab=shots#ep101')).toEqual({ href: 'https://studio.example.com/series/blood-rush?tab=shots#ep101', host: 'studio.example.com' });
    expect(folderLink('  https://studio.example.com:8443/a  ')).toEqual({ href: 'https://studio.example.com:8443/a', host: 'studio.example.com:8443' });
  });

  test('anything that is not plain https is refused', () => {
    for (const value of ['http://studio.example.com/', 'javascript:alert(1)', 'data:text/html,hi', '//studio.example.com/a', '/series/1', 'studio.example.com', 'ftp://studio.example.com', '', '   ', 'https://', 'https:///path']) {
      expect(folderLink(value)).toBeNull();
    }
    for (const value of [undefined, null, 7, {}, ['https://studio.example.com']]) expect(folderLink(value)).toBeNull();
  });

  test('a URL carrying a username or password is refused', () => {
    expect(folderLink('https://user@studio.example.com/')).toBeNull();
    expect(folderLink('https://user:secret@studio.example.com/')).toBeNull();
    expect(folderLink('https://:secret@studio.example.com/')).toBeNull();
  });

  test('whitespace, control characters and backslashes inside the URL are refused', () => {
    for (const value of ['https://studio.example.com/a b', 'https://studio.example.com/a\nb', 'https://studio.example.com\\@evil.example/', 'https://studio.example.com/\u0000']) {
      expect(folderLink(value)).toBeNull();
    }
  });

  test('the limit is 500 characters', () => {
    const base = 'https://studio.example.com/';
    expect(folderLink(base + 'a'.repeat(500 - base.length))?.href.length).toBe(500);
    expect(folderLink(base + 'a'.repeat(501 - base.length))).toBeNull();
  });

  test('requireFolderLink returns the stored value or says what is wrong', () => {
    expect(requireFolderLink(' https://studio.example.com/s/1 ')).toBe('https://studio.example.com/s/1');
    expect(() => requireFolderLink('http://studio.example.com/')).toThrow('Folder link must be an https URL without a username or password, at most 500 characters');
  });
});
