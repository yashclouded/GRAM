package orchestrator_test

import (
	"testing"
	"time"

	"github.com/yashsingh/agrinerve/node/internal/orchestrator"
)

func TestOrchestrator_ChaosSurvival(t *testing.T) {
	tests := []struct {
		name       string
		killPct    int
		dishonest  int
		expectSucc bool
	}{
		{"Survive 10% Failure", 10, 0, true},
		{"Survive 25% Failure", 25, 0, true},
		{"Survive 40% Failure", 40, 0, true},
		{"Survive 25% Dishonest", 0, 12, true}, // 12/50 = 24% dishonest
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			o := orchestrator.NewOrchestrator()
			o.SpawnNodes(50)
			o.StartMetricsListener()
			o.StartNetwork()

			// Apply Chaos
			if tc.killPct > 0 {
				o.KillPercentage(tc.killPct)
			}
			if tc.dishonest > 0 {
				o.InjectDishonestNodes(tc.dishonest)
			}

			// Propose Trade
			tradeID := o.SubmitTradeProposal("Wheat", 100, 20)
			if tradeID == "" {
				t.Fatalf("Failed to submit trade proposal")
			}

			// Wait for consensus
			time.Sleep(3 * time.Second)

			// Check Results
			m := o.GetMetrics()
			m.Mu.RLock()
			accepted := m.AcceptedTrades
			m.Mu.RUnlock()

			if tc.expectSucc && accepted == 0 {
				t.Fatalf("Expected consensus success, but trade was not accepted")
			}
			
			score := o.GetHealthScore()
			t.Logf("Final Health Score: %d", score)

			o.StopNetwork()
		})
	}
}

func TestOrchestrator_MetricsAccuracy(t *testing.T) {
	o := orchestrator.NewOrchestrator()
	o.SpawnNodes(50)
	o.StartMetricsListener()

	// Wait for listener to boot up
	time.Sleep(100 * time.Millisecond)

	o.StartNetwork()
	time.Sleep(100 * time.Millisecond)

	o.KillPercentage(20) // kill 10 nodes
	time.Sleep(100 * time.Millisecond)

	m := o.GetMetrics()
	m.Mu.RLock()
	offline := m.OfflineNodes
	m.Mu.RUnlock()

	if offline != 10 {
		t.Fatalf("Expected 10 offline nodes, got %d", offline)
	}

	o.RecoverPercentage(100) // recover all offline nodes
	time.Sleep(100 * time.Millisecond)

	m.Mu.RLock()
	offline = m.OfflineNodes
	m.Mu.RUnlock()

	if offline != 0 {
		t.Fatalf("Expected 0 offline nodes after recovery, got %d", offline)
	}

	o.StopNetwork()
}
