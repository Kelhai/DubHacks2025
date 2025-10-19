package main

import (
	"context"
	"encoding/json"
	"fmt"
	"os"
	"strings"
	"time"

	"github.com/aws/aws-lambda-go/events"
	"github.com/aws/aws-lambda-go/lambda"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/feature/dynamodb/attributevalue"
	"github.com/aws/aws-sdk-go-v2/service/bedrockagentruntime"
	btypes "github.com/aws/aws-sdk-go-v2/service/bedrockagentruntime/types"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb"
	"github.com/aws/aws-sdk-go-v2/service/dynamodb/types"
)

var (
	dynamoClient  *dynamodb.Client
	tableName     string
	bedrockClient *bedrockagentruntime.Client
)

type Message struct {
	Role    string `json:"role"`
	Content string `json:"content"`
}

type ChatItem struct {
	ChatID    string `dynamodbav:"chat_id"`
	Timestamp int64  `dynamodbav:"timestamp"`
	Role      string `dynamodbav:"role"`
	Content   string `dynamodbav:"content"`
}

func init() {
	cfg, err := config.LoadDefaultConfig(context.TODO())
	if err != nil {
		panic(fmt.Sprintf("unable to load SDK config: %v", err))
	}

	dynamoClient = dynamodb.NewFromConfig(cfg)
	bedrockClient = bedrockagentruntime.NewFromConfig(cfg)

	tableName = os.Getenv("CHATS_TABLE")
}

func callNovaAgent(input string) (string, error) {
	agentID := os.Getenv("BEDROCK_AGENT_ID")
	agentAliasID := os.Getenv("BEDROCK_AGENT_ALIAS")
	sessionID := fmt.Sprintf("chat-%d", time.Now().Unix())

	req := &bedrockagentruntime.InvokeAgentInput{
		AgentId:      aws.String(agentID),
		AgentAliasId: aws.String(agentAliasID),
		SessionId:    aws.String(sessionID),
		InputText:    &input,
	}

	resp, err := bedrockClient.InvokeAgent(context.TODO(), req)
	if err != nil {
		return "", err
	}

	eventsChan := resp.GetStream().Events()
	output := ""

	timeout := time.After(5 * time.Second)

	for {
		select {
		case ev, ok := <-eventsChan:
			if !ok {
				// channel closed
				return output, nil
			}
			switch e := ev.(type) {
			case *btypes.ResponseStreamMemberChunk:
				output += string(e.Value.Bytes)
			case *btypes.ResponseStreamMemberFiles:
				output += "file: " + *e.Value.Files[0].Name
			case *btypes.ResponseStreamMemberReturnControl:
				output += "return control: " + *e.Value.InvocationId
			default:
				output += "error"
			}

		case <-timeout:
			output = strings.ReplaceAll(output, "\"", "")
			return output, nil // return whatever has been received so far
		}
	}
}

func handler(ctx context.Context, req events.APIGatewayV2HTTPRequest) (events.APIGatewayV2HTTPResponse, error) {
	chatID := req.QueryStringParameters["id"]

	switch req.RequestContext.HTTP.Method {
	case "POST":
		var body struct {
			Message string `json:"message"`
		}
		if err := json.Unmarshal([]byte(req.Body), &body); err != nil {
			return events.APIGatewayV2HTTPResponse{StatusCode: 400}, err
		}

		// Store user message in DynamoDB
		userItem := ChatItem{
			ChatID:    chatID,
			Timestamp: time.Now().Unix(),
			Role:      "user",
			Content:   body.Message,
		}
		av, _ := attributevalue.MarshalMap(userItem)
		_, err := dynamoClient.PutItem(ctx, &dynamodb.PutItemInput{
			TableName: aws.String(tableName),
			Item:      av,
		})
		if err != nil {
			return events.APIGatewayV2HTTPResponse{StatusCode: 500}, err
		}

		// Call Bedrock model
		assistantContent, err := callNovaAgent(body.Message)
		if err != nil {
			return events.APIGatewayV2HTTPResponse{StatusCode: 500}, err
		}

		// Store assistant response in DynamoDB
		assistantItem := ChatItem{
			ChatID:    chatID,
			Timestamp: time.Now().Unix() + 1,
			Role:      "assistant",
			Content:   assistantContent,
		}
		av2, _ := attributevalue.MarshalMap(assistantItem)
		_, err = dynamoClient.PutItem(ctx, &dynamodb.PutItemInput{
			TableName: aws.String(tableName),
			Item:      av2,
		})
		if err != nil {
			return events.APIGatewayV2HTTPResponse{StatusCode: 500}, err
		}

		return events.APIGatewayV2HTTPResponse{
			StatusCode: 200,
			Headers: map[string]string{
				"Content-Type":                "application/json",
				"Access-Control-Allow-Origin": "*",
			},
			Body: fmt.Sprintf(`{"message": "%s"}`, assistantContent),
		}, nil

	case "GET":
		// Fetch all messages for chatID
		out, err := dynamoClient.Query(ctx, &dynamodb.QueryInput{
			TableName:              aws.String(tableName),
			KeyConditionExpression: aws.String("chat_id = :c"),
			ExpressionAttributeValues: map[string]types.AttributeValue{
				":c": &types.AttributeValueMemberS{Value: chatID},
			},
			ScanIndexForward: aws.Bool(true),
		})
		if err != nil {
			return events.APIGatewayV2HTTPResponse{StatusCode: 500}, err
		}

		var messages []Message
		for _, item := range out.Items {
			var ci ChatItem
			if err := attributevalue.UnmarshalMap(item, &ci); err != nil {
				continue
			}
			messages = append(messages, Message{Role: ci.Role, Content: ci.Content})
		}

		body, _ := json.Marshal(struct {
			ID       string    `json:"id"`
			Messages []Message `json:"messages"`
		}{
			ID:       chatID,
			Messages: messages,
		})

		return events.APIGatewayV2HTTPResponse{
			StatusCode: 200,
			Headers: map[string]string{
				"Content-Type":                "application/json",
				"Access-Control-Allow-Origin": "*",
			},
			Body: string(body),
		}, nil
	case "OPTIONS":
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 200,
			Headers: map[string]string{
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "OPTIONS,GET,POST",
				"Access-Control-Allow-Headers": "*",
			},
		}, nil

	default:
		return events.APIGatewayV2HTTPResponse{
			StatusCode: 405,
			Headers: map[string]string{
				"Access-Control-Allow-Origin":  "*",
				"Access-Control-Allow-Methods": "OPTIONS,GET,POST",
				"Access-Control-Allow-Headers": "*",
			},
		}, nil
	}
}

func main() {
	lambda.Start(handler)
}

