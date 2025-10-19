# Table: user -> chats
resource "aws_dynamodb_table" "user_chats" {
  name         = "${var.project_name}-user-chats"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "chat_id"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "chat_id"
    type = "S"
  }

  tags = {
    Project = var.project_name
  }
}

# Table: chat -> messages
resource "aws_dynamodb_table" "chats" {
  name         = "${var.project_name}-chats"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "chat_id"
  range_key    = "timestamp"

  attribute {
    name = "chat_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "N"
  }

  tags = {
    Project = var.project_name
  }
}

# IAM policy to allow Lambda to access these tables
resource "aws_iam_role_policy" "lambda_dynamo_policy" {
  name = "${var.project_name}-lambda-dynamo"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "dynamodb:GetItem",
          "dynamodb:PutItem",
          "dynamodb:Query",
          "dynamodb:Scan",
          "dynamodb:UpdateItem"
        ],
        Resource = [
          aws_dynamodb_table.user_chats.arn,
          aws_dynamodb_table.chats.arn
        ]
      }
    ]
  })
}

