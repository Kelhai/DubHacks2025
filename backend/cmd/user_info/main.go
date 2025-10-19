package main

import (
	"context"
	"encoding/json"
	"net/http"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"
)

type ChatInfo struct {
	ID   string `json:"id"`
	Name string `json:"name"`
}

type UserInfo struct {
	UserID string     `json:"user_id"`
	Chats  []ChatInfo `json:"chats"`
}

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	// Dummy user info with 3 chat UUIDs and names
	user := UserInfo{
		UserID: "user-1234",
		Chats: []ChatInfo{
			{ID: "b7a3e2f1-1c2d-4a7f-b8d2-123456789abc", Name: "Algebra practice"},
			{ID: "a1c2b3d4-5e6f-7a8b-9c0d-abcdef123456", Name: "Calculus Q&A"},
			{ID: "9f8e7d6c-5b4a-3c2d-1e0f-fedcba987654", Name: "Geometry help"},
		},
	}

	body, _ := json.Marshal(user)

	return events.APIGatewayV2HTTPResponse{
		StatusCode: http.StatusOK,
		Body:       string(body),
		Headers: map[string]string{
			"Content-Type":                 "application/json",
			"Access-Control-Allow-Origin":  "*", // enable CORS
			"Access-Control-Allow-Methods": "GET,OPTIONS",
		},
	}, nil
}

func main() {
	lambda.Start(handler)
}

