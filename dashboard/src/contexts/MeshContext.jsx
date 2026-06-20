import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { useAuth } from './AuthContext'
import { addEvent, countEvents, getKV, getStorageMode, listRecentEvents, setKV } from '../store/meshStore'
import { hashPayload, loadOrCreateMeshIdentity, shortAgentId, signPayload, stableStringify } from '../identity/meshIdentity'

const MeshContext = createContext(null)

const PROFILE_FINGERPRINT_KEY = 'mesh.profile.fingerprint.v1'

function slugify(value) {
  return String(value || 'unknown')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'unknown'
}

function deriveShard(payload = {}, fallbackRole = 'agent') {
  const crop = payload.crop || payload.cropType || 'all'
  const location = payload.location || payload.region || payload.state || payload.service_area || fallbackRole
  return `${slugify(location)}:${slugify(crop)}`
}

function deriveTrustScore(events, profile) {
  let score = 50

  for (const event of [...events].reverse()) {
    if (event.type === 'trust.updated' && typeof event.payload?.score === 'number') {
      score = event.payload.score
      continue
    }

    if (event.type === 'trade.completed') {
      score += 5
    }

    if (event.type === 'trade.failed') {
      score -= 15
    }

    if (event.type === 'delivery.status_changed' && event.payload?.status === 'payment_confirmed') {
      score += 5
    }
  }

  if (profile?.role === 'transporter' && events.some((event) => event.type === 'delivery.status_changed' && event.payload?.status === 'delivered')) {
    score += 2
  }

  return Math.max(0, Math.min(100, score))
}

function deriveNetworkHealth(eventCount, storageMode, ready) {
  if (!ready) return 0
  const base = storageMode === 'indexeddb' ? 84 : 68
  return Math.min(100, base + Math.min(eventCount, 8) * 2)
}

export function MeshProvider({ children }) {
  const { user, profile } = useAuth()
  const [identity, setIdentity] = useState(null)
  const [recentEvents, setRecentEvents] = useState([])
  const [eventCount, setEventCount] = useState(0)
  const [storageMode, setStorageMode] = useState('indexeddb')
  const [profileFingerprint, setProfileFingerprint] = useState('')
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function bootstrap() {
      const [loadedIdentity, events, totalEvents, mode, fingerprint] = await Promise.all([
        loadOrCreateMeshIdentity(),
        listRecentEvents(25),
        countEvents(),
        getStorageMode(),
        getKV(PROFILE_FINGERPRINT_KEY),
      ])

      if (cancelled) return

      setIdentity(loadedIdentity)
      setRecentEvents(events)
      setEventCount(totalEvents)
      setStorageMode(mode)
      setProfileFingerprint(fingerprint || '')
      setReady(true)
    }

    bootstrap()

    return () => {
      cancelled = true
    }
  }, [])

  async function persistEvent(event) {
    await addEvent(event)
    const [events, totalEvents, mode] = await Promise.all([
      listRecentEvents(25),
      countEvents(),
      getStorageMode(),
    ])

    setRecentEvents(events)
    setEventCount(totalEvents)
    setStorageMode(mode)
  }

  async function publishEvent(type, payload, options = {}) {
    if (!identity) return null

    const createdAt = new Date().toISOString()
    const shard = options.shard || deriveShard(payload, profile?.role || 'agent')

    const envelope = {
      type,
      shard,
      createdAt,
      author: {
        agentId: identity.agentId,
        role: profile?.role || null,
        userId: user?.id || null,
      },
      payload,
      meta: {
        bridge: options.bridge ?? true,
        origin: options.origin || 'dashboard',
        algorithm: identity.algorithm,
      },
    }

    const signaturePayload = stableStringify(envelope)
    const [signature, digest] = await Promise.all([
      signPayload(identity, signaturePayload),
      hashPayload(signaturePayload),
    ])

    const signedEvent = {
      id: digest,
      ...envelope,
      signature,
    }

    await persistEvent(signedEvent)
    return signedEvent
  }

  useEffect(() => {
    if (!ready || !identity || !profile?.role) {
      return
    }

    const nextFingerprint = stableStringify({
      role: profile.role || null,
      name: profile.name || null,
      phone: profile.phone || null,
      village: profile.village || null,
      district: profile.district || null,
      state: profile.state || null,
      email: user?.email || null,
    })

    if (nextFingerprint === profileFingerprint) {
      return
    }

    let cancelled = false

    async function syncProfile() {
      await publishEvent('profile.updated', {
        role: profile.role || null,
        name: profile.name || null,
        phone: profile.phone || null,
        village: profile.village || null,
        district: profile.district || null,
        state: profile.state || null,
        email: user?.email || null,
      }, {
        origin: 'supabase-bridge',
        shard: deriveShard({
          state: profile.state || profile.role || 'profile',
          crop: profile.role || 'profile',
        }),
      })

      if (cancelled) return

      await setKV(PROFILE_FINGERPRINT_KEY, nextFingerprint)
      if (!cancelled) {
        setProfileFingerprint(nextFingerprint)
      }
    }

    syncProfile()

    return () => {
      cancelled = true
    }
  }, [
    identity,
    profile?.district,
    profile?.name,
    profile?.phone,
    profile?.role,
    profile?.state,
    profile?.village,
    profileFingerprint,
    ready,
    user?.email,
  ])

  const value = useMemo(() => {
    const trustScore = deriveTrustScore(recentEvents, profile)
    const networkHealth = deriveNetworkHealth(eventCount, storageMode, ready)

    return {
      ready,
      identity,
      agentId: identity?.agentId || null,
      shortAgentId: shortAgentId(identity?.agentId),
      storageMode,
      eventCount,
      recentEvents,
      trustScore,
      networkHealth,
      publishEvent,
      recordListingCreated: (listing) => publishEvent('listing.created', listing, {
        shard: deriveShard({ crop: listing.crop, location: listing.location }),
      }),
      recordListingClosed: (listing) => publishEvent('listing.closed', listing, {
        shard: deriveShard({ crop: listing.crop, location: listing.location }),
      }),
      recordDemandCreated: (demand) => publishEvent('demand.created', demand, {
        shard: deriveShard({ crop: demand.crop, location: demand.location }),
      }),
      recordTransportProfileUpdated: (vehicleProfile) => publishEvent('profile.updated', {
        role: 'transporter',
        ...vehicleProfile,
      }, {
        shard: deriveShard({ location: vehicleProfile.service_area, crop: 'transport' }),
      }),
      recordDeliveryStatusChanged: (delivery) => publishEvent('delivery.status_changed', delivery, {
        shard: deriveShard({ location: delivery.location, crop: delivery.crop || 'transport' }),
      }),
    }
  }, [eventCount, identity, profile, ready, recentEvents, storageMode])

  return (
    <MeshContext.Provider value={value}>
      {children}
    </MeshContext.Provider>
  )
}

export function useMesh() {
  return useContext(MeshContext)
}
