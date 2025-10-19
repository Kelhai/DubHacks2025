output "lambda_functions" {
  description = "List of deployed Lambda function names"
  value       = [for fn in aws_lambda_function.tau : fn.function_name]
}

output "frontend_s3_url" {
  description = "S3 website URL"
  value       = aws_s3_bucket.frontend.website_domain
}

output "frontend_cloudfront_url" {
  description = "CloudFront URL"
  value       = aws_cloudfront_distribution.frontend.domain_name
}

