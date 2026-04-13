region      = "eu-north-1"
environment = "dev"
project     = "akena"
namespace   = "akena-dev"

# EKS
eks_cluster_version    = "1.30"
eks_node_instance_type = "t3.small"
eks_node_desired_size  = 1
eks_node_min_size      = 1
eks_node_max_size      = 2

# DynamoDB
dynamodb_conversations_table = "akena-conversations"

# Cognito — add your real frontend URL before deploying to staging/prod
cognito_callback_urls = [
  "http://localhost:3000/callback",
  "http://localhost:5173/callback",
]
