output "conversations_table_name" {
  description = "Table name exported as DYNAMODB_CONVERSATIONS_TABLE"
  value       = aws_dynamodb_table.conversations.name
}

output "conversations_table_arn" {
  description = "ARN for IAM policy attachments"
  value       = aws_dynamodb_table.conversations.arn
}

output "token_store_table_name" {
  description = "OAuth token store table name"
  value       = aws_dynamodb_table.token_store.name
}

output "token_store_table_arn" {
  description = "ARN for IAM policy attachments"
  value       = aws_dynamodb_table.token_store.arn
}
