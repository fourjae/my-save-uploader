import { safeEqual } from './password';

export type Account = {
  name: string;
  password: string;
};

export function getAccounts(): Account[] {
  const raw = process.env.USER_ACCOUNTS;
  if (!raw) return [];

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];

    return parsed.filter(
      (a): a is Account =>
        a && typeof a.name === 'string' && typeof a.password === 'string',
    );
  } catch {
    return [];
  }
}

export function findAccount(name: string, password: string): Account | null {
  const account = getAccounts().find((a) => a.name === name);
  if (!account) return null;
  return safeEqual(password, account.password) ? account : null;
}

export function accountPrefix(name: string) {
  return `uploads/${encodeURIComponent(name)}/`;
}
