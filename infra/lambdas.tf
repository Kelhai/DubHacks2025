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
}

# --------------------------
# API Gateway HTTP
# --------------------------
resource "aws_apigatewayv2_api" "api" {
  name          = "${var.project_name}-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_origins = ["*"]           # Or your frontend domain: ["https://example.com"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_headers = ["*"]
    max_age       = 3600
  }
}


# Create integration for each Lambda
resource "aws_apigatewayv2_integration" "lambda_integ" {
  for_each = aws_lambda_function.tau

  api_id           = aws_apigatewayv2_api.api.id
  integration_type = "AWS_PROXY"
  integration_uri  = each.value.arn
  payload_format_version = "2.0"
}

# Create routes for each Lambda
resource "aws_apigatewayv2_route" "routes" {
  for_each = aws_lambda_function.tau

  api_id    = aws_apigatewayv2_api.api.id
  route_key = "GET /${replace(replace(each.key, ".zip", ""), "/_/", "/")}"
  target    = "integrations/${aws_apigatewayv2_integration.lambda_integ[each.key].id}"
}

# Deploy the API
resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.api.id
  name        = "$default"
  auto_deploy = true
}


# resource "aws_lambda_permission" "api_gateway" {
#   for_each = aws_lambda_function.tau
#
#   # Strip ".zip" from the key and replace any remaining dots with underscore
#   statement_id  = "AllowExecutionFromAPIGateway-${replace(replace(each.key, ".zip", ""), ".", "_")}"
#   action        = "lambda:InvokeFunction"
#   function_name = each.value.function_name
#   principal     = "apigateway.amazonaws.com"
#   source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
# }

resource "aws_lambda_permission" "api_gateway" {
  for_each = aws_lambda_function.tau

  statement_id  = "AllowExecutionFromAPIGateway-${replace(replace(each.key, ".zip", ""), ".", "_")}"
  action        = "lambda:InvokeFunction"
  function_name = each.value.function_name
  principal     = "apigateway.amazonaws.com"
  source_arn    = "${aws_apigatewayv2_api.api.execution_arn}/*/*"
}

