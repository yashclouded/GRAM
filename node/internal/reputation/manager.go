package reputation

import (
	"sync"
	"time"

	"github.com/yashsingh/agrinerve/node/internal/events"
)

type Manager struct {
	mu       sync.RWMutex
	profiles map[string]*ReputationProfile
}

func NewManager() *Manager {
	return &Manager{
		profiles: make(map[string]*ReputationProfile),
	}
}

func (m *Manager) GetProfile(nodeID string) *ReputationProfile {
	m.mu.RLock()
	p, exists := m.profiles[nodeID]
	m.mu.RUnlock()

	if !exists {
		m.mu.Lock()
		p = NewProfile(nodeID)
		m.profiles[nodeID] = p
		m.mu.Unlock()
	}
	return p
}

func (m *Manager) ApplyScore(nodeID string, delta int, reason string) {
	m.mu.Lock()
	defer m.mu.Unlock()

	p, exists := m.profiles[nodeID]
	if !exists {
		p = NewProfile(nodeID)
		m.profiles[nodeID] = p
	}

	p.Score += delta
	if p.Score > 100 {
		p.Score = 100
	} else if p.Score < 0 {
		p.Score = 0
	}

	p.LastUpdated = time.Now()

	if delta < 0 {
		if reason == "FailedTrade" {
			p.FailedTrades++
		} else if reason == "Dishonest" {
			p.DishonestIncidents++
		}
	} else if delta > 0 && reason == "TradeSettled" {
		p.CompletedTrades++
	}

	events.Emit(events.ReputationUpdated, p)
}

func (m *Manager) GetAverageReputation() float64 {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if len(m.profiles) == 0 {
		return 0
	}
	sum := 0
	for _, p := range m.profiles {
		sum += p.Score
	}
	return float64(sum) / float64(len(m.profiles))
}

func (m *Manager) GetAllProfiles() []*ReputationProfile {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var list []*ReputationProfile
	for _, p := range m.profiles {
		// Make a copy so callers don't mutate
		cp := *p
		list = append(list, &cp)
	}
	return list
}
