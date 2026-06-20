package oracle

import (
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"net/url"
	"os"
	"sync"
	"time"

	"github.com/joho/godotenv"
)

// Fallback values for demo/chaos if API fails
var fallbackPrices = map[string]float64{
	"Wheat_MH": 2200.0,
	"Rice_MH":  3100.0,
	"Corn_MH":  1800.0,
	"Wheat":    2200.0,
	"Rice":     3100.0,
	"Corn":     1800.0,
}

type PriceOracle struct {
	cache      map[string]float64
	cacheTime  map[string]time.Time
	mu         sync.RWMutex
	HTTPClient *http.Client
	APIKey     string
	BaseURL    string
}

func NewPriceOracle() *PriceOracle {
	_ = godotenv.Load()
	return &PriceOracle{
		cache:      make(map[string]float64),
		cacheTime:  make(map[string]time.Time),
		HTTPClient: &http.Client{Timeout: 5 * time.Second},
		APIKey:     os.Getenv("AGMARKNET_API_KEY"),
		BaseURL:    "https://api.data.gov.in/resource/9ef84268-d588-465a-a308-a864a43d0070",
	}
}

// GetFairPrice returns the price from cache or fetches it from API.
// State can be empty for a generic fallback.
func (o *PriceOracle) GetFairPrice(commodity, state string) float64 {
	key := fmt.Sprintf("%s_%s", commodity, state)
	
	o.mu.RLock()
	price, exists := o.cache[key]
	cachedAt := o.cacheTime[key]
	o.mu.RUnlock()

	// Cache valid for 24 hours (simulated demo session)
	if exists && time.Since(cachedAt) < 24*time.Hour {
		return price
	}

	// Fetch live
	fetchedPrice, err := o.fetchFromAPI(commodity, state)
	if err != nil {
		log.Printf("[Oracle] Live fetch failed for %s: %v. Using fallback.", key, err)
		
		// Fallback
		fb, ok := fallbackPrices[key]
		if !ok {
			fb, ok = fallbackPrices[commodity]
			if !ok {
				fb = 2000.0 // ultimate fallback
			}
		}
		
		o.mu.Lock()
		o.cache[key] = fb
		o.cacheTime[key] = time.Now()
		o.mu.Unlock()
		return fb
	}

	o.mu.Lock()
	o.cache[key] = fetchedPrice
	o.cacheTime[key] = time.Now()
	o.mu.Unlock()

	return fetchedPrice
}

func (o *PriceOracle) fetchFromAPI(commodity, state string) (float64, error) {
	if o.APIKey == "" {
		return 0, fmt.Errorf("AGMARKNET_API_KEY not set")
	}

	u, _ := url.Parse(o.BaseURL)
	q := u.Query()
	q.Set("api-key", o.APIKey)
	q.Set("format", "json")
	q.Set("filters[commodity]", commodity)
	if state != "" {
		q.Set("filters[state]", state)
	}
	u.RawQuery = q.Encode()

	req, _ := http.NewRequest("GET", u.String(), nil)
	
	resp, err := o.HTTPClient.Do(req)
	if err != nil {
		return 0, err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return 0, fmt.Errorf("API returned status %d", resp.StatusCode)
	}

	body, _ := io.ReadAll(resp.Body)
	
	var data struct {
		Records []struct {
			ModalPrice string `json:"modal_price"`
		} `json:"records"`
	}

	if err := json.Unmarshal(body, &data); err != nil {
		return 0, err
	}

	if len(data.Records) == 0 {
		return 0, fmt.Errorf("no records found")
	}

	var price float64
	_, err = fmt.Sscanf(data.Records[0].ModalPrice, "%f", &price)
	if err != nil {
		return 0, fmt.Errorf("failed to parse price: %v", err)
	}

	return price, nil
}
