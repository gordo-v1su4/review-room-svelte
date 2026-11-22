import { expect, test } from 'bun:test';
import { keepSignedInChoice, ownerSessionCookie, ownerSessionValid, SESSION_ONLY_SECONDS, type KeepSignedIn } from '../src/lib/session-lifetime';

const DAY = 24 * 60 * 60;
const NOW = 1_795_000_000;
const sign = (value: string) => `sig(${value})`;
const verify = (expiry: string, mac: string) => mac === sign(expiry);

const cases: { choice: KeepSignedIn; maxAge: number | undefined; lifetime: number }[] = [
  { choice: 'session', maxAge: undefined, lifetime: SESSION_ONLY_SECONDS },
  { choice: '30d', maxAge: 30 * DAY, lifetime: 30 * DAY },
  { choice: '60d', maxAge: 60 * DAY, lifetime: 60 * DAY }
];

for (const { choice, maxAge, lifetime } of cases) {
  test(`${choice}: cookie max-age and signed expiry agree`, () => {
    const cookie = ownerSessionCookie(choice, NOW, sign, true);
    expect(cookie.options.maxAge).toBe(maxAge);
    if (maxAge === undefined) expect('maxAge' in cookie.options).toBe(false);
    expect(cookie.options).toMatchObject({ path: '/', httpOnly: true, secure: true, sameSite: 'lax' });
    const [expiry] = cookie.value.split('.');
    expect(Number(expiry)).toBe(NOW + lifetime);
  });

  test(`${choice}: server accepts the session until its expiry, then rejects it`, () => {
    const { value } = ownerSessionCookie(choice, NOW, sign, true);
    expect(ownerSessionValid(value, NOW, verify)).toBe(true);
    expect(ownerSessionValid(value, NOW + lifetime - 1, verify)).toBe(true);
    expect(ownerSessionValid(value, NOW + lifetime, verify)).toBe(false);
    expect(ownerSessionValid(value, NOW + lifetime + DAY, verify)).toBe(false);
  });
}

test('session-only keeps the previous seven-day server cap', () => {
  expect(SESSION_ONLY_SECONDS).toBe(7 * DAY);
});

test('a 30-day session has ended by day 31 while a 60-day one is still valid', () => {
  const thirty = ownerSessionCookie('30d', NOW, sign, true).value;
  const sixty = ownerSessionCookie('60d', NOW, sign, true).value;
  expect(ownerSessionValid(thirty, NOW + 31 * DAY, verify)).toBe(false);
  expect(ownerSessionValid(sixty, NOW + 31 * DAY, verify)).toBe(true);
});

test('form values outside the three choices fall back to this session only', () => {
  expect(keepSignedInChoice('30d')).toBe('30d');
  expect(keepSignedInChoice('60d')).toBe('60d');
  expect(keepSignedInChoice('session')).toBe('session');
  for (const value of [null, undefined, '', '365d', '30', 'on']) expect(keepSignedInChoice(value)).toBe('session');
});

test('signed-out, tampered or malformed cookies are rejected', () => {
  const { value } = ownerSessionCookie('60d', NOW, sign, true);
  const [expiry] = value.split('.');
  expect(ownerSessionValid(undefined, NOW, verify)).toBe(false);
  expect(ownerSessionValid('', NOW, verify)).toBe(false);
  expect(ownerSessionValid(`${Number(expiry) + DAY}.${sign(expiry)}`, NOW, verify)).toBe(false);
  expect(ownerSessionValid(`${expiry}.`, NOW, verify)).toBe(false);
  expect(ownerSessionValid(`${expiry}.${sign(expiry)}.x`, NOW, verify)).toBe(false);
  expect(ownerSessionValid(`1e12.${sign('1e12')}`, NOW, verify)).toBe(false);
});
