# IAM policy to allow Lambda to call Bedrock
resource "aws_iam_role_policy" "lambda_bedrock_policy" {
  name = "${var.project_name}-lambda-bedrock"
  role = aws_iam_role.lambda_exec.id

  policy = jsonencode({
    Version = "2012-10-17",
    Statement = [
      {
        Effect   = "Allow",
        Action   = [
          "bedrock:InvokeModel"
        ],
        Resource = "*" # You can restrict to specific Bedrock model ARN later
      }
    ]
  })
}

