const encoder = new TextEncoder()
const decoder = new TextDecoder()

const DEFAULT_ITERATIONS = 600000
const SALT_BYTES = 16
const IV_BYTES = 12

function bytesToBase64Url(bytes) {
  let binary = ''
  for (const byte of bytes) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

function base64UrlToBytes(value) {
  const base64 = value.replace(/-/g, '+').replace(/_/g, '/')
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
  const binary = atob(padded)
  const bytes = new Uint8Array(binary.length)
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }
  return bytes
}

function randomBytes(length) {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes
}

export function isSecureVaultSupported() {
  return typeof window !== 'undefined'
    && typeof indexedDB !== 'undefined'
    && window.isSecureContext
    && !!crypto?.subtle
}

export async function deriveVaultKey(passphrase, saltBase64Url, iterations = DEFAULT_ITERATIONS) {
  const salt = base64UrlToBytes(saltBase64Url)
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  )

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt'],
  )
}

export async function encryptJsonWithKey(value, key) {
  const iv = randomBytes(IV_BYTES)
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    key,
    encoder.encode(JSON.stringify(value)),
  )

  return {
    algorithm: 'AES-GCM-256',
    iv: bytesToBase64Url(iv),
    ciphertext: bytesToBase64Url(new Uint8Array(ciphertext)),
  }
}

export async function decryptJsonWithKey(encrypted, key) {
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: base64UrlToBytes(encrypted.iv),
    },
    key,
    base64UrlToBytes(encrypted.ciphertext),
  )

  return JSON.parse(decoder.decode(plaintext))
}

export function createVaultParameters(iterations = DEFAULT_ITERATIONS) {
  return {
    iterations,
    salt: bytesToBase64Url(randomBytes(SALT_BYTES)),
  }
}

export { DEFAULT_ITERATIONS }
