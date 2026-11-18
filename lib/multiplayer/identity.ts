export interface Identity { id: string; name: string }
const K_ID = 'lolloop:pid';
const K_NAME = 'lolloop:name';

export const cleanName = (s: string) =>
  String(s ?? '').replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);

export function loadIdentity(): Identity {
  let id = localStorage.getItem(K_ID);
  if (!id) { id = crypto.randomUUID(); localStorage.setItem(K_ID, id); }
  return { id, name: cleanName(localStorage.getItem(K_NAME) ?? '') };
}

export function saveName(name: string): Identity {
  const n = cleanName(name);
  localStorage.setItem(K_NAME, n);
  return { ...loadIdentity(), name: n };
}

const CODE_CHARS = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
export const makeCode = () =>
  Array.from(crypto.getRandomValues(new Uint8Array(5)), (b) => CODE_CHARS[b % CODE_CHARS.length]).join('');
export const isValidCode = (c: string) => /^[A-HJKMNP-Z2-9]{5}$/.test(c);
