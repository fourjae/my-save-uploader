import { list, put } from '@vercel/blob';
import { safeEqual } from './password';

export type Account = {
  name: string;
  password: string;
};

const REGISTRY_PATHNAME = 'accounts/registry.json';

async function loadRegistry(): Promise<Account[]> {
  const { blobs } = await list({ prefix: REGISTRY_PATHNAME, limit: 1 });
  const registryBlob = blobs[0];
  if (!registryBlob) return [];

  try {
    const res = await fetch(registryBlob.url, { cache: 'no-store' });
    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data.filter(
      (a): a is Account =>
        a && typeof a.name === 'string' && typeof a.password === 'string',
    );
  } catch {
    return [];
  }
}

async function saveRegistry(accounts: Account[]): Promise<void> {
  await put(REGISTRY_PATHNAME, JSON.stringify(accounts), {
    access: 'public',
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  });
}

export async function getAccounts(): Promise<Account[]> {
  return loadRegistry();
}

export async function loginOrRegister(
  name: string,
  password: string,
): Promise<Account | null> {
  const accounts = await loadRegistry();
  const existing = accounts.find((a) => a.name === name);

  if (existing) {
    return safeEqual(password, existing.password) ? existing : null;
  }

  const newAccount: Account = { name, password };
  await saveRegistry([...accounts, newAccount]);
  return newAccount;
}

export function accountPrefix(name: string) {
  return `uploads/${encodeURIComponent(name)}/`;
}
