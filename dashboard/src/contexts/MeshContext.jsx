import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { useAuth } from './AuthContext'
import { addEvent, countEvents, getKV, getStorageMode, listRecentEvents, setKV } from '../store/meshStore'
import { hashPayload, loadOrCreateMeshIdentity, shortAgentId, signPayload, stableStringify } from '../identity/meshIdentity'

const MeshContext = createContext(null)

const PROFILE_FINGERPRINT_KEY = 'mesh.profile.fingerprint.v1'
const EVENT_WINDOW = 250
const HELLO_INTERVAL_MS = 15000
const PEER_STALE_MS = 35000

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

function sortByCreatedAtAsc(events) {
  return [...events].sort((left, right) => (left.createdAt || '').localeCompare(right.createdAt || ''))
}

function entityKeyFromPayload(payload = {}) {
  return payload.client_id || payload.local_id || payload.id || payload.server_id || null
}

function resolveEntityKey(map, payload = {}) {
  const directKey = entityKeyFromPayload(payload)
  if (directKey && map.has(directKey)) {
    return directKey
  }

  const candidates = [payload.server_id, payload.id, payload.client_id, payload.local_id].filter(Boolean)
  for (const [key, value] of map.entries()) {
    if (candidates.some((candidate) => candidate === value.server_id || candidate === value.local_id || candidate === value.id)) {
      return key
    }
  }

  return directKey
}

function toEntityArray(map) {
  return [...map.values()].sort((left, right) => (right.updated_at || right.created_at || '').localeCompare(left.updated_at || left.created_at || ''))
}

function materializeMeshState(events, currentUserId, currentAgentId) {
  const listings = new Map()
  const demands = new Map()
  const deliveries = new Map()
  const profiles = new Map()

  for (const event of sortByCreatedAtAsc(events)) {
    const payload = event.payload || {}
    const author = event.author || {}

    if (event.type === 'profile.updated') {
      profiles.set(author.agentId || entityKeyFromPayload(payload), {
        agentId: author.agentId || null,
        userId: author.userId || null,
        role: payload.role || author.role || null,
        name: payload.name || null,
        state: payload.state || null,
        district: payload.district || null,
        village: payload.village || null,
        vehicle_type: payload.vehicle_type || null,
        service_area: payload.service_area || null,
        updated_at: event.createdAt,
      })
      continue
    }

    if (event.type === 'listing.created') {
      const key = resolveEntityKey(listings, payload)
      if (!key) continue

      const existing = listings.get(key) || {}
      listings.set(key, {
        ...existing,
        id: existing.id || payload.server_id || null,
        local_id: payload.client_id || existing.local_id || key,
        server_id: payload.server_id || existing.server_id || null,
        crop: payload.crop,
        quantity: payload.quantity,
        unit: payload.unit,
        grade: payload.grade,
        price_per_unit: payload.price_per_unit,
        location: payload.location,
        description: payload.description || null,
        farmer_id: payload.farmer_id || author.userId || null,
        agentId: author.agentId || null,
        status: payload.status || existing.status || 'available',
        sync_state: payload.sync_state || existing.sync_state || 'pending',
        source: 'mesh',
        created_at: existing.created_at || event.createdAt,
        updated_at: event.createdAt,
      })
      continue
    }

    if (event.type === 'listing.synced') {
      const key = resolveEntityKey(listings, payload)
      if (!key) continue
      const existing = listings.get(key) || {}
      listings.set(key, {
        ...existing,
        id: payload.server_id || existing.id || null,
        server_id: payload.server_id || existing.server_id || null,
        sync_state: 'synced',
        status: payload.status || existing.status || 'available',
        updated_at: event.createdAt,
      })
      continue
    }

    if (event.type === 'listing.closed') {
      const key = resolveEntityKey(listings, payload)
      if (!key) continue
      const existing = listings.get(key) || {}
      listings.set(key, {
        ...existing,
        id: existing.id || payload.server_id || null,
        local_id: existing.local_id || payload.client_id || key,
        server_id: existing.server_id || payload.server_id || null,
        status: 'closed',
        sync_state: payload.sync_state || existing.sync_state || 'pending',
        updated_at: event.createdAt,
      })
      continue
    }

    if (event.type === 'demand.created') {
      const key = resolveEntityKey(demands, payload)
      if (!key) continue

      const existing = demands.get(key) || {}
      demands.set(key, {
        ...existing,
        id: existing.id || payload.server_id || null,
        local_id: payload.client_id || existing.local_id || key,
        server_id: payload.server_id || existing.server_id || null,
        listing_id: payload.listing_id || null,
        crop: payload.crop,
        quantity: payload.quantity,
        unit: payload.unit || existing.unit || null,
        location: payload.location || existing.location || null,
        agreed_price: payload.bid_price ?? payload.agreed_price ?? existing.agreed_price ?? null,
        buyer_id: payload.buyer_id || author.userId || null,
        farmer_id: payload.farmer_id || existing.farmer_id || null,
        status: payload.status || existing.status || 'pending',
        sync_state: payload.sync_state || existing.sync_state || 'pending',
        source: 'mesh',
        created_at: existing.created_at || event.createdAt,
        updated_at: event.createdAt,
      })
      continue
    }

    if (event.type === 'demand.synced') {
      const key = resolveEntityKey(demands, payload)
      if (!key) continue
      const existing = demands.get(key) || {}
      demands.set(key, {
        ...existing,
        id: payload.server_id || existing.id || null,
        server_id: payload.server_id || existing.server_id || null,
        status: payload.status || existing.status || 'pending',
        sync_state: 'synced',
        updated_at: event.createdAt,
      })
      continue
    }

    if (event.type === 'offer.updated') {
      const key = resolveEntityKey(demands, payload)
      if (!key) continue
      const existing = demands.get(key) || {}
      demands.set(key, {
        ...existing,
        agreed_price: payload.agreed_price ?? existing.agreed_price ?? null,
        updated_at: event.createdAt,
      })
      continue
    }

    if (event.type === 'trade.accepted' || event.type === 'trade.rejected' || event.type === 'trade.completed') {
      const key = resolveEntityKey(demands, payload)
      if (!key) continue
      const existing = demands.get(key) || {}
      const nextStatus = payload.status || (
        event.type === 'trade.accepted' ? 'accepted'
          : event.type === 'trade.rejected' ? 'rejected'
            : 'payment_confirmed'
      )
      demands.set(key, {
        ...existing,
        status: nextStatus,
        updated_at: event.createdAt,
      })

      if (event.type === 'trade.completed') {
        deliveries.set(key, {
          id: payload.id || existing.id || key,
          listing_id: payload.listing_id || existing.listing_id || null,
          crop: payload.crop || existing.crop || null,
          location: payload.location || existing.location || null,
          transporter_id: payload.transporter_id || null,
          agentId: author.agentId || null,
          status: nextStatus,
          updated_at: event.createdAt,
        })
      }
      continue
    }

    if (event.type === 'delivery.status_changed') {
      const key = resolveEntityKey(deliveries, payload)
      if (!key) continue
      const existing = deliveries.get(key) || {}
      deliveries.set(key, {
        ...existing,
        id: payload.id || existing.id || key,
        listing_id: payload.listing_id || existing.listing_id || null,
        crop: payload.crop || existing.crop || null,
        location: payload.location || existing.location || null,
        transporter_id: payload.transporter_id || existing.transporter_id || null,
        agentId: author.agentId || existing.agentId || null,
        status: payload.status || existing.status || 'transporter_assigned',
        updated_at: event.createdAt,
      })

      const demandKey = resolveEntityKey(demands, payload)
      if (demandKey && demands.has(demandKey)) {
        const existingDemand = demands.get(demandKey)
        demands.set(demandKey, {
          ...existingDemand,
          status: payload.status || existingDemand.status || 'transporter_assigned',
          updated_at: event.createdAt,
        })
      }
    }
  }

  const allListings = toEntityArray(listings)
  const allDemands = toEntityArray(demands)
  const allDeliveries = toEntityArray(deliveries)
  const allProfiles = toEntityArray(profiles)

  return {
    profiles: allProfiles,
    listings: allListings,
    activeListings: allListings.filter((listing) => listing.status !== 'closed'),
    myListings: allListings.filter((listing) => listing.farmer_id === currentUserId || listing.agentId === currentAgentId),
    demands: allDemands,
    myDemands: allDemands.filter((demand) => demand.buyer_id === currentUserId || demand.agentId === currentAgentId),
    deliveries: allDeliveries,
    myDeliveries: allDeliveries.filter((delivery) => delivery.transporter_id === currentUserId || delivery.agentId === currentAgentId),
  }
}

export function MeshProvider({ children }) {
  const { user, profile, authMode, hasLocalAccount, loading: authLoading, vaultKey } = useAuth()
  const [identity, setIdentity] = useState(null)
  const [recentEvents, setRecentEvents] = useState([])
  const [eventCount, setEventCount] = useState(0)
  const [storageMode, setStorageMode] = useState('indexeddb')
  const [profileFingerprint, setProfileFingerprint] = useState('')
  const [peerSessions, setPeerSessions] = useState({})
  const [ready, setReady] = useState(false)
  const channelRef = useRef(null)
  const sessionIdRef = useRef(typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `session-${Date.now()}`)

  useEffect(() => {
    let cancelled = false

    if (authLoading) {
      return () => {
        cancelled = true
      }
    }

    if ((authMode === 'local' || authMode === 'local-locked' || (!authMode && hasLocalAccount)) && !vaultKey) {
      setIdentity(null)
      setRecentEvents([])
      setEventCount(0)
      setPeerSessions({})
      setReady(false)
      return () => {
        cancelled = true
      }
    }

    async function bootstrap() {
      const [loadedIdentity, events, totalEvents, mode, fingerprint] = await Promise.all([
        loadOrCreateMeshIdentity(vaultKey || null),
        listRecentEvents(EVENT_WINDOW),
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
  }, [authLoading, authMode, hasLocalAccount, vaultKey])

  async function persistEvent(event) {
    await addEvent(event)
    const [events, totalEvents, mode] = await Promise.all([
      listRecentEvents(EVENT_WINDOW),
      countEvents(),
      getStorageMode(),
    ])

    setRecentEvents(events)
    setEventCount(totalEvents)
    setStorageMode(mode)
  }

  function broadcastMessage(message) {
    if (!channelRef.current) return
    channelRef.current.postMessage({
      ...message,
      sessionId: sessionIdRef.current,
    })
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
    if (options.broadcast !== false) {
      broadcastMessage({ kind: 'event', event: signedEvent })
    }
    return signedEvent
  }

  useEffect(() => {
    if (typeof BroadcastChannel === 'undefined') {
      return undefined
    }

    const channel = new BroadcastChannel('gram-phase1-mesh')
    channelRef.current = channel

    const handleMessage = (incoming) => {
      const message = incoming.data
      if (!message || message.sessionId === sessionIdRef.current) {
        return
      }

      if (message.kind === 'hello') {
        setPeerSessions((current) => ({
          ...current,
          [message.sessionId]: {
            agentId: message.agentId || null,
            role: message.role || null,
            seenAt: Date.now(),
          },
        }))
        return
      }

      if (message.kind === 'event' && message.event?.id) {
        persistEvent(message.event)
      }
    }

    channel.addEventListener('message', handleMessage)
    return () => {
      channel.removeEventListener('message', handleMessage)
      channel.close()
      channelRef.current = null
    }
  }, [identity])

  useEffect(() => {
    if (!ready || !identity) {
      return undefined
    }

    const sendHello = () => {
      broadcastMessage({
        kind: 'hello',
        agentId: identity.agentId,
        role: profile?.role || null,
      })
    }

    sendHello()
    const helloTimer = setInterval(sendHello, HELLO_INTERVAL_MS)
    const peerCleanup = setInterval(() => {
      const cutoff = Date.now() - PEER_STALE_MS
      setPeerSessions((current) => Object.fromEntries(
        Object.entries(current).filter(([, value]) => value.seenAt >= cutoff),
      ))
    }, HELLO_INTERVAL_MS)

    return () => {
      clearInterval(helloTimer)
      clearInterval(peerCleanup)
    }
  }, [identity, profile?.role, ready])

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
    const peerCount = Object.keys(peerSessions).length
    const networkHealth = Math.min(100, deriveNetworkHealth(eventCount, storageMode, ready) + Math.min(peerCount, 3) * 4)
    const meshState = materializeMeshState(recentEvents, user?.id || null, identity?.agentId || null)

    return {
      ready,
      identity,
      agentId: identity?.agentId || null,
      shortAgentId: shortAgentId(identity?.agentId),
      storageMode,
      eventCount,
      recentEvents,
      peerCount,
      peerSessions,
      trustScore,
      networkHealth,
      ...meshState,
      publishEvent,
      recordListingCreated: (listing, options = {}) => publishEvent('listing.created', listing, {
        shard: deriveShard({ crop: listing.crop, location: listing.location }),
        ...options,
      }),
      recordListingSynced: (clientId, listing, options = {}) => publishEvent('listing.synced', {
        client_id: clientId,
        server_id: listing.id,
        status: listing.status || 'available',
      }, {
        shard: deriveShard({ crop: listing.crop, location: listing.location }),
        ...options,
      }),
      recordListingClosed: (listing, options = {}) => publishEvent('listing.closed', listing, {
        shard: deriveShard({ crop: listing.crop, location: listing.location }),
        ...options,
      }),
      recordDemandCreated: (demand, options = {}) => publishEvent('demand.created', demand, {
        shard: deriveShard({ crop: demand.crop, location: demand.location }),
        ...options,
      }),
      recordDemandSynced: (clientId, demand, options = {}) => publishEvent('demand.synced', {
        client_id: clientId,
        server_id: demand.id,
        status: demand.status || 'pending',
      }, {
        shard: deriveShard({ crop: demand.crop, location: demand.location }),
        ...options,
      }),
      recordTransportProfileUpdated: (vehicleProfile, options = {}) => publishEvent('profile.updated', {
        role: 'transporter',
        ...vehicleProfile,
      }, {
        shard: deriveShard({ location: vehicleProfile.service_area, crop: 'transport' }),
        ...options,
      }),
      recordDeliveryStatusChanged: (delivery, options = {}) => publishEvent('delivery.status_changed', delivery, {
        shard: deriveShard({ location: delivery.location, crop: delivery.crop || 'transport' }),
        ...options,
      }),
    }
  }, [eventCount, identity, peerSessions, profile, ready, recentEvents, storageMode, user?.id])

  return (
    <MeshContext.Provider value={value}>
      {children}
    </MeshContext.Provider>
  )
}

export function useMesh() {
  return useContext(MeshContext)
}
