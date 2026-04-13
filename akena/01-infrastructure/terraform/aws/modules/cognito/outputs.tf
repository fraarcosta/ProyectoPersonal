output "user_pool_id" {
  description = "Cognito User Pool ID → COGNITO_USER_POOL_ID"
  value       = aws_cognito_user_pool.main.id
}

output "user_pool_arn" {
  description = "User Pool ARN — used for IAM policy references"
  value       = aws_cognito_user_pool.main.arn
}

output "client_id" {
  description = "App Client ID → COGNITO_CLIENT_ID"
  value       = aws_cognito_user_pool_client.app.id
  sensitive   = true
}

output "user_pool_endpoint" {
  description = "Cognito User Pool endpoint (issuer URL for JWT validation)"
  value       = aws_cognito_user_pool.main.endpoint
}
