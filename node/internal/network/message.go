package network

import "time"

type MsgType string

const (
	MsgGossip        MsgType = "Gossip" // generic test message
	MsgTradeProposal MsgType = "TradeProposal"
	MsgListing       MsgType = "Listing"
	MsgDemand        MsgType = "Demand"
	MsgOffer         MsgType = "Offer"
)

type Message struct {
	ID        string
	Type      MsgType
	SenderID  string
	Payload   interface{}
	TTL       int
	Timestamp time.Time
}
