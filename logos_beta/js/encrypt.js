// ═══ MODULE: encrypt.js ═══
// Шифрование данных: AES-256-GCM + PBKDF2 (Web Crypto API, без зависимостей).
const ALG = {
  keyLen: 256,
  ivLen: 12,
  saltLen: 16,
  iterations: 100000,
};

async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ALG.iterations,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: ALG.keyLen },
    false,
    ['encrypt', 'decrypt']
  );
}

async function encryptData(plainText, password) {
  const salt = crypto.getRandomValues(new Uint8Array(ALG.saltLen));
  const iv = crypto.getRandomValues(new Uint8Array(ALG.ivLen));
  const key = await deriveKey(password, salt);
  const ct = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plainText)
  );
  return {
    iv: Array.from(iv),
    ct: Array.from(new Uint8Array(ct)),
    salt: Array.from(salt),
    iterations: ALG.iterations,
  };
}

async function decryptData(encrypted, password) {
  const salt = new Uint8Array(encrypted.salt);
  const iv = new Uint8Array(encrypted.iv);
  const key = await deriveKey(password, salt);
  const pt = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    new Uint8Array(encrypted.ct)
  );
  return new TextDecoder().decode(pt);
}

// encryptData / decryptData — глобальные функции (классический скрипт).
