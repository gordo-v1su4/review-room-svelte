import { describe, expect, test } from 'bun:test';
import { afterSignIn, safeReturnPath, signInPath } from './return-path';

describe('return path after sign-in', () => {
  test('a path on this site is kept with its query', () => {
    expect(safeReturnPath('/')).toBe('/');
    expect(safeReturnPath('/?project=p1&folder=f1&asset=BLR_TR100_SHT_0010&version=v003&t=12.5')).toBe('/?project=p1&folder=f1&asset=BLR_TR100_SHT_0010&version=v003&t=12.5');
    expect(safeReturnPath('/docs/operations')).toBe('/docs/operations');
    expect(safeReturnPath('/studio?tab=keys#audit')).toBe('/studio?tab=keys#audit');
  });

  test('anything that could leave the site is refused', () => {
    for (const value of ['//evil.example', '//evil.example/path', '///evil.example', 'https://evil.example/', 'http://evil.example', 'javascript:alert(1)', 'evil.example', 'studio', '',
      '/\\evil.example', '\\\\evil.example', '/\\/evil.example', '/a\\b', '/..//evil.example', '/.//evil.example', '/a/..//evil.example',
      '/\tevil', '/\n/evil.example', '/\u0000', ' /', '/%09/evil.example\u007f']) {
      expect(safeReturnPath(value)).toBeNull();
    }
    for (const value of [undefined, null, 7, ['/'], { path: '/' }]) expect(safeReturnPath(value)).toBeNull();
    expect(safeReturnPath('/' + 'a'.repeat(2100))).toBeNull();
  });

  test('sign-in itself is never a return path', () => {
    expect(safeReturnPath('/studio/sign-in')).toBeNull();
    expect(safeReturnPath('/studio/sign-in?next=%2F')).toBeNull();
    expect(safeReturnPath('/studio/sign-in/')).toBeNull();
    expect(safeReturnPath('/studio/./sign-in')).toBeNull();
  });

  test('the sign-in address carries the target, and stays plain for the bare workspace', () => {
    expect(signInPath('/')).toBe('/studio/sign-in');
    expect(signInPath('//evil.example')).toBe('/studio/sign-in');
    expect(signInPath('/?project=p1&asset=a1')).toBe('/studio/sign-in?next=%2F%3Fproject%3Dp1%26asset%3Da1');
    expect(signInPath('/docs/operations')).toBe('/studio/sign-in?next=%2Fdocs%2Foperations');
    const carried = new URL(signInPath('/?project=p 1&t=12.5'), 'https://review.invalid').searchParams.get('next');
    expect(afterSignIn(carried)).toBe('/?project=p%201&t=12.5');
  });

  test('after sign-in the target is honoured, otherwise the workspace opens', () => {
    expect(afterSignIn('/?project=p1')).toBe('/?project=p1');
    expect(afterSignIn(null)).toBe('/');
    expect(afterSignIn('//evil.example')).toBe('/');
    expect(afterSignIn('https://evil.example')).toBe('/');
  });
});
