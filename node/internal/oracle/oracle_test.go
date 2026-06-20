package oracle

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestPriceOracle_Fallback(t *testing.T) {
	o := NewPriceOracle()
	// No API key set
	price := o.GetFairPrice("Wheat", "")
	if price != 2200.0 {
		t.Errorf("expected fallback price 2200.0, got %f", price)
	}

	// Should be cached now
	o.mu.RLock()
	cached, exists := o.cache["Wheat_"]
	o.mu.RUnlock()
	if !exists || cached != 2200.0 {
		t.Errorf("expected cache to hold 2200.0")
	}
}

func TestPriceOracle_LiveFetch(t *testing.T) {
	mockServer := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		resp := map[string]interface{}{
			"records": []map[string]string{
				{"modal_price": "2450.50"},
			},
		}
		json.NewEncoder(w).Encode(resp)
	}))
	defer mockServer.Close()

	o := NewPriceOracle()
	o.APIKey = "test_key"
	o.BaseURL = mockServer.URL

	price := o.GetFairPrice("Soybean", "MP")
	if price != 2450.50 {
		t.Errorf("expected live price 2450.50, got %f", price)
	}

	// Verify cache
	o.mu.RLock()
	cached, exists := o.cache["Soybean_MP"]
	o.mu.RUnlock()
	if !exists || cached != 2450.50 {
		t.Errorf("expected cache to hold 2450.50")
	}
}
