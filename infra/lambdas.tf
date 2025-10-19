locals {
  lambda_zips = fileset("${path.module}/../build", "*.zip")
}

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

