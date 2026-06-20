import { getKV, setKV } from '../store/meshStore'

const IDENTITY_KEY = 'mesh.identity.v1'

const encoder = new TextEncoder()

function stableStringify(value) {
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`
  }

  if (value && typeof value === 'object') {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(',')}}`
  }

  return JSON.stringify(value)
}

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

async function digestString(value) {
  const data = encoder.encode(value)
  const digest = await crypto.subtle.digest('SHA-256', data)
  return new Uint8Array(digest)
}

async function deriveAgentId(publicJwk) {
  const digest = await digestString(stableStringify(publicJwk))
  return `agent_${bytesToBase64Url(digest).slice(0, 24)}`
}

async function generateKeyPair() {
  try {
    const keyPair = await crypto.subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])
    return { keyPair, algorithm: 'Ed25519' }
  } catch {
    const keyPair = await crypto.subtle.generateKey(
      { name: 'ECDSA', namedCurve: 'P-256' },
      true,
      ['sign', 'verify'],
    )
    return { keyPair, algorithm: 'ECDSA-P256' }
  }
}

async function exportIdentity(keyPair, algorithm) {
  const publicJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  const privateJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)
  const agentId = await deriveAgentId(publicJwk)

  return {
    version: 1,
    agentId,
    algorithm,
    publicJwk,
    privateJwk,
    createdAt: new Date().toISOString(),
  }
}

export function getSignatureAlgorithm(identity) {
  return identity.algorithm === 'Ed25519'
    ? { name: 'Ed25519' }
    : { name: 'ECDSA', namedCurve: 'P-256', hash: 'SHA-256' }
}

async function importPrivateKey(identity) {
  const algorithm = identity.algorithm === 'Ed25519'
    ? { name: 'Ed25519' }
    : { name: 'ECDSA', namedCurve: 'P-256' }

  return crypto.subtle.importKey('jwk', identity.privateJwk, algorithm, false, ['sign'])
}

export async function loadOrCreateMeshIdentity() {
  const existing = await getKV(IDENTITY_KEY)
  if (existing?.agentId && existing?.privateJwk && existing?.publicJwk) {
    return existing
  }

  const { keyPair, algorithm } = await generateKeyPair()
  const identity = await exportIdentity(keyPair, algorithm)
  await setKV(IDENTITY_KEY, identity)
  return identity
}

export async function signPayload(identity, payload) {
  const privateKey = await importPrivateKey(identity)
  const data = encoder.encode(typeof payload === 'string' ? payload : stableStringify(payload))
  const params = identity.algorithm === 'Ed25519' ? 'Ed25519' : { name: 'ECDSA', hash: 'SHA-256' }
  const signature = await crypto.subtle.sign(params, privateKey, data)
  return bytesToBase64Url(new Uint8Array(signature))
}

export async function hashPayload(payload) {
  const digest = await digestString(typeof payload === 'string' ? payload : stableStringify(payload))
  return bytesToBase64Url(digest)
}

export function shortAgentId(agentId) {
  if (!agentId) return 'unknown'
  return `${agentId.slice(0, 10)}...${agentId.slice(-4)}`
}

export function signatureBytes(signature) {
  return base64UrlToBytes(signature)
}

export { stableStringify }
