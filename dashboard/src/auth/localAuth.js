import { getKV, getStorageMode, setKV } from '../store/meshStore'
import {
  createVaultParameters,
  decryptJsonWithKey,
  deriveVaultKey,
  encryptJsonWithKey,
  isSecureVaultSupported,
} from './secureVault'

const LOCAL_AUTH_KEY = 'auth.local.secure.v1'
export const LOCAL_PASSPHRASE_MIN = 12

function createLocalUserId() {
  return `local_${crypto.randomUUID()}`
}

function normalizeText(value) {
  return String(value || '').trim()
}

function createLocalUserProfile({ id, name, phone, email }) {
  return {
    id,
    name,
    phone,
    email,
    role: null,
    village: '',
    district: '',
    state: '',
    auth_provider: 'local',
  }
}

function createLocalUser({ id, name, phone, email }) {
  return {
    id,
    email: email || null,
    aud: 'local',
    app_metadata: { provider: 'local' },
    user_metadata: {
      name,
      phone,
    },
  }
}

async function requirePersistentSecureStorage() {
  if (!isSecureVaultSupported()) {
    throw new Error('Local secure authentication requires HTTPS or localhost plus Web Crypto support.')
  }

  const mode = await getStorageMode()
  if (mode !== 'indexeddb') {
    throw new Error('Local secure authentication requires IndexedDB. Private browsing or restricted storage is not supported.')
  }
}

async function loadEnvelope() {
  await requirePersistentSecureStorage()
  return getKV(LOCAL_AUTH_KEY)
}

export async function getLocalAuthMetadata() {
  const envelope = await loadEnvelope().catch(() => null)
  if (!envelope) {
    return { exists: false }
  }

  return {
    exists: true,
    createdAt: envelope.createdAt,
    label: envelope.label,
    hint: envelope.hint || {},
  }
}

export async function createLocalAccount({ name, phone, email, passphrase }) {
  const cleanName = normalizeText(name)
  const cleanPhone = normalizeText(phone)
  const cleanEmail = normalizeText(email)
  const cleanPassphrase = String(passphrase || '')

  if (!cleanName) {
    throw new Error('Name is required for local secure authentication.')
  }

  if (cleanPassphrase.length < LOCAL_PASSPHRASE_MIN) {
    throw new Error(`Passphrase must be at least ${LOCAL_PASSPHRASE_MIN} characters.`)
  }

  const existing = await getLocalAuthMetadata()
  if (existing.exists) {
    throw new Error('This device already has a local secure account. Unlock it instead of creating a new one.')
  }

  const params = createVaultParameters()
  const vaultKey = await deriveVaultKey(cleanPassphrase, params.salt, params.iterations)
  const userId = createLocalUserId()
  const createdAt = new Date().toISOString()

  const user = createLocalUser({
    id: userId,
    name: cleanName,
    phone: cleanPhone,
    email: cleanEmail,
  })
  const profile = createLocalUserProfile({
    id: userId,
    name: cleanName,
    phone: cleanPhone,
    email: cleanEmail,
  })

  const vault = {
    version: 1,
    createdAt,
    updatedAt: createdAt,
    user,
    profile,
  }

  const encrypted = await encryptJsonWithKey(vault, vaultKey)
  await setKV(LOCAL_AUTH_KEY, {
    version: 1,
    createdAt,
    label: cleanName,
    hint: {
      name: cleanName,
      phone: cleanPhone || null,
      email: cleanEmail || null,
    },
    params,
    encrypted,
  })

  return {
    user,
    profile,
    vaultKey,
    metadata: {
      exists: true,
      createdAt,
      label: cleanName,
      hint: {
        name: cleanName,
        phone: cleanPhone || null,
        email: cleanEmail || null,
      },
    },
  }
}

export async function unlockLocalAccount(passphrase) {
  const envelope = await loadEnvelope()
  if (!envelope) {
    throw new Error('No local secure account exists on this device yet.')
  }

  try {
    const vaultKey = await deriveVaultKey(String(passphrase || ''), envelope.params.salt, envelope.params.iterations)
    const vault = await decryptJsonWithKey(envelope.encrypted, vaultKey)

    return {
      user: vault.user,
      profile: vault.profile,
      vaultKey,
      metadata: {
        exists: true,
        createdAt: envelope.createdAt,
        label: envelope.label,
        hint: envelope.hint || {},
      },
    }
  } catch {
    throw new Error('Incorrect passphrase or corrupted local secure vault.')
  }
}

export async function updateLocalAccount(vaultKey, updates) {
  const envelope = await loadEnvelope()
  if (!envelope) {
    throw new Error('Local secure account vault is missing.')
  }

  const vault = await decryptJsonWithKey(envelope.encrypted, vaultKey)
  const nextProfile = {
    ...vault.profile,
    ...updates,
  }
  const nextUser = {
    ...vault.user,
    email: nextProfile.email || vault.user.email || null,
    user_metadata: {
      ...vault.user.user_metadata,
      name: nextProfile.name,
      phone: nextProfile.phone,
    },
  }
  const nextVault = {
    ...vault,
    updatedAt: new Date().toISOString(),
    user: nextUser,
    profile: nextProfile,
  }

  const encrypted = await encryptJsonWithKey(nextVault, vaultKey)
  await setKV(LOCAL_AUTH_KEY, {
    ...envelope,
    label: nextProfile.name || envelope.label,
    hint: {
      name: nextProfile.name || '',
      phone: nextProfile.phone || null,
      email: nextProfile.email || null,
    },
    encrypted,
  })

  return {
    user: nextUser,
    profile: nextProfile,
    metadata: {
      exists: true,
      createdAt: envelope.createdAt,
      label: nextProfile.name || envelope.label,
      hint: {
        name: nextProfile.name || '',
        phone: nextProfile.phone || null,
        email: nextProfile.email || null,
      },
    },
  }
}

export { isSecureVaultSupported as isLocalAuthSupported }
