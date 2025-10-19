locals {
  lambda_zips = fileset("${path.module}/../build", "*.zip")
}

# --------------------------
# IAM Role for Lambda
# --------------------------
resource "aws_iam_role" "lambda_exec" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = { Service = "lambda.amazonaws.com" }
      Action = "sts:AssumeRole"
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_logging" {
  role       = aws_iam_role.lambda_exec.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

# --------------------------
# Deploy each Lambda
# --------------------------
resource "aws_lambda_function" "tau" {
  for_each = toset(local.lambda_zips)

  function_name = "${var.project_name}-${replace(each.key, ".zip", "")}"
  runtime       = "provided.al2"
  handler       = "bootstrap"
  filename      = "${path.module}/../build/${each.key}"
  role          = aws_iam_role.lambda_exec.arn
  architectures = ["x86_64"]

  source_code_hash = filebase64sha256("${path.module}/../build/${each.key}")

  environment {
    variables = {
      USER_CHATS_TABLE = aws_dynamodb_table.user_chats.name
      CHATS_TABLE      = aws_dynamodb_table.chats.name
      BEDROCK_AGENT_ID = "3IS4TGAPXY"
      BEDROCK_AGENT_ALIAS = "IZOF7ATCOP"
    }
  }
}

# --------------------------
# API Gateway HTTP
# --------------------------
resource "aws_apigatewayv2_api" "api" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["*"]
    max_age       = 3600
  }
}

# Lambda Integrations
resource "aws_apigatewayv2_integration" "lambda_integ" {
  for_each = aws_lambda_function.tau

  api_id                 = aws_apigatewayv2_api.api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = each.value.arn
  payload_format_version = "2.0"
}

# Routes (you can adjust to POST/GET per lambda)
resource "aws_apigatewayv2_route" "routes" {
  for_each = aws_lambda_function.tau

  api_id    = aws_apigatewayv2_api.api.id
  route_key = "ANY /${replace(replace(each.key, ".zip", ""), "/_/", "/")}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integ[each.key].id}"
}

# Stage
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}

# Permission for API Gateway to call Lambda
resource "aws_lambda_permission" "api_gateway" {
  for_each = aws_lambda_function.tau

  statement_id  = "AllowExecutionFromAPIGateway-${replace(replace(each.key, ".zip", ""), ".", "_")}"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

resource "aws_iam_role_policy" "lambda_bedrock" {
  name = "${var.project_name}-lambda-bedrock"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect = "Allow",
        Action = [
          "bedrock:InvokeAgent"
        ],
        Resource = "arn:aws:bedrock:us-east-2:205930618404:agent-alias/*"
      }
    ]
  })
}

