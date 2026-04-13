# Conversation memory table — consumed by the DynamoDB adapter in shared/adapters/memory_store/
# Schema: session_id (PK) + timestamp (SK)
# Corresponds to: DYNAMODB_CONVERSATIONS_TABLE in infrastructure.yaml
resource "aws_dynamodb_table" "conversations" {
  name         = var.conversations_table_name
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "session_id"
  range_key    = "timestamp"

  attribute {
    name = "session_id"
    type = "S"
  }

  attribute {
    name = "timestamp"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  # Point-in-time recovery is cost-free on dev; enabled on prod for safety
  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  tags = var.tags
}

# OAuth token store — consumed by the OAuth Gateway for short-lived access tokens
# Schema: user_id (PK) + provider (SK)
resource "aws_dynamodb_table" "token_store" {
  name         = "${var.conversations_table_name}-tokens"
  billing_mode = "PAY_PER_REQUEST"
  hash_key     = "user_id"
  range_key    = "provider"

  attribute {
    name = "user_id"
    type = "S"
  }

  attribute {
    name = "provider"
    type = "S"
  }

  ttl {
    attribute_name = "expires_at"
    enabled        = true
  }

  point_in_time_recovery {
    enabled = var.environment == "prod"
  }

  tags = var.tags
}
