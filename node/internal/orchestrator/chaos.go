package orchestrator

import (
	"math/rand"

	"github.com/yashsingh/agrinerve/node/internal/events"
	"github.com/yashsingh/agrinerve/node/internal/node"
)

func (o *Orchestrator) KillPercentage(p int) {
	o.mu.RLock()
	defer o.mu.RUnlock()

	var alive []*node.Node
	for _, n := range o.Nodes {
		if n.IsAlive() && !n.IsDishonest() {
			alive = append(alive, n)
		}
	}

	targetCount := (len(o.Nodes) * p) / 100
	if targetCount > len(alive) {
		targetCount = len(alive)
	}

	rand.Shuffle(len(alive), func(i, j int) {
		alive[i], alive[j] = alive[j], alive[i]
	})

	for i := 0; i < targetCount; i++ {
		alive[i].SetStatus(node.Offline)
	}

	events.Emit(events.ChaosTriggered, map[string]interface{}{
		"action":        "Kill",
		"percentage":    p,
		"nodesAffected": targetCount,
	})
}

func (o *Orchestrator) RecoverPercentage(p int) {
	o.mu.RLock()
	defer o.mu.RUnlock()

	var offline []*node.Node
	for _, n := range o.Nodes {
		if !n.IsAlive() {
			offline = append(offline, n)
		}
	}

	targetCount := (len(o.Nodes) * p) / 100
	if targetCount > len(offline) {
		targetCount = len(offline)
	}

	rand.Shuffle(len(offline), func(i, j int) {
		offline[i], offline[j] = offline[j], offline[i]
	})

	for i := 0; i < targetCount; i++ {
		offline[i].SetStatus(node.Alive)
	}

	events.Emit(events.ChaosTriggered, map[string]interface{}{
		"action":        "Recover",
		"percentage":    p,
		"nodesAffected": targetCount,
	})
}

func (o *Orchestrator) InjectDishonestNodes(count int) {
	o.mu.RLock()
	defer o.mu.RUnlock()

	var honest []*node.Node
	for _, n := range o.Nodes {
		if n.IsAlive() && !n.IsDishonest() {
			honest = append(honest, n)
		}
	}

	if count > len(honest) {
		count = len(honest)
	}

	rand.Shuffle(len(honest), func(i, j int) {
		honest[i], honest[j] = honest[j], honest[i]
	})

	for i := 0; i < count; i++ {
		honest[i].SetStatus(node.Dishonest)
	}

	events.Emit(events.DishonestNodeInjected, map[string]interface{}{
		"count": count,
	})
}
