package ai

import (
	"bytes"
	"io"
	"net/http"
	"testing"
)

// RoundTripFunc .
type RoundTripFunc func(req *http.Request) *http.Response

// RoundTrip .
func (f RoundTripFunc) RoundTrip(req *http.Request) (*http.Response, error) {
	return f(req), nil
}

//NewTestClient returns *http.Client with Transport replaced to avoid making real calls
func NewTestClient(fn RoundTripFunc) *http.Client {
	return &http.Client{
		Transport: RoundTripFunc(fn),
	}
}

func TestGrader_ValidResponse(t *testing.T) {
	client := NewTestClient(func(req *http.Request) *http.Response {
		jsonResp := `{"choices": [{"message": {"role": "assistant", "content": "{\"grade\": \"A\", \"confidence\": 95.5, \"reasoning\": \"Looks great\"}"}}]}`
		return &http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(bytes.NewBufferString(jsonResp)),
			Header:     make(http.Header),
		}
	})

	g := &Grader{
		Client: &Client{
			HTTPClient: client,
			APIKey:     "test-key",
			BaseURL:    "http://test.com",
		},
	}

	res := g.GradeCropImage("fake-base64")
	if res.Grade != "A" {
		t.Errorf("Expected grade A, got %s", res.Grade)
	}
	if res.Confidence != 95.5 {
		t.Errorf("Expected confidence 95.5, got %f", res.Confidence)
	}
}

func TestGrader_MissingAPIKey(t *testing.T) {
	g := &Grader{
		Client: &Client{
			APIKey: "", // Missing
		},
	}

	res := g.GradeCropImage("fake")
	if res.Grade != "Unknown" {
		t.Errorf("Expected Unknown grade on failure, got %s", res.Grade)
	}
}

func TestGrader_APIError(t *testing.T) {
	client := NewTestClient(func(req *http.Request) *http.Response {
		return &http.Response{
			StatusCode: 500,
			Body:       io.NopCloser(bytes.NewBufferString("Internal Server Error")),
			Header:     make(http.Header),
		}
	})

	g := &Grader{
		Client: &Client{
			HTTPClient: client,
			APIKey:     "test-key",
			BaseURL:    "http://test.com",
		},
	}

	res := g.GradeCropImage("fake-base64")
	if res.Grade != "Unknown" {
		t.Errorf("Expected Unknown grade on API error, got %s", res.Grade)
	}
}

func TestGrader_InvalidJSON(t *testing.T) {
	client := NewTestClient(func(req *http.Request) *http.Response {
		jsonResp := `{"choices": [{"message": {"role": "assistant", "content": "I think it is an A but I am not returning JSON"}}]}`
		return &http.Response{
			StatusCode: 200,
			Body:       io.NopCloser(bytes.NewBufferString(jsonResp)),
			Header:     make(http.Header),
		}
	})

	g := &Grader{
		Client: &Client{
			HTTPClient: client,
			APIKey:     "test-key",
			BaseURL:    "http://test.com",
		},
	}

	res := g.GradeCropImage("fake-base64")
	if res.Grade != "Unknown" {
		t.Errorf("Expected Unknown grade on bad JSON, got %s", res.Grade)
	}
}
