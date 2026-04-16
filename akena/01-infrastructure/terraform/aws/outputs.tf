# ─────────────────────────────────────────────────────────────────────────────
# These output NAMES must match the keys in infrastructure.yaml (aws: column).
# They are consumed by scripts/export_manifest.sh → manifests/dev-aws.json.
# Do NOT rename outputs without updating infrastructure.yaml.
# ─────────────────────────────────────────────────────────────────────────────

output "ecr_repository_base" {
  description = "ECR base URL for Docker image pushes → CONTAINER_REGISTRY"
  value       = module.ecr.repository_base
}

output "eks_cluster_name" {
  description = "EKS cluster name → CLUSTER_NAME"
  value       = module.eks.cluster_name
}

output "k8s_namespace" {
  description = "Kubernetes namespace where agents run → NAMESPACE"
  value       = var.namespace
}

output "alb_domain" {
  description = "ALB ingress domain for external traffic → DOMAIN"
  value       = module.eks.alb_domain
}

output "aws_region" {
  description = "Deployment region → AWS_REGION and COGNITO_REGION"
  value       = var.region
}

output "cognito_user_pool_id" {
  description = "Cognito User Pool ID → COGNITO_USER_POOL_ID"
  value       = module.cognito.user_pool_id
}

output "cognito_client_id" {
  description = "Cognito App Client ID → COGNITO_CLIENT_ID"
  value       = module.cognito.client_id
  sensitive   = true
}

output "dynamodb_conversations_table" {
  description = "DynamoDB table name for conversation memory → DYNAMODB_CONVERSATIONS_TABLE"
  value       = module.dynamodb.conversations_table_name
}

# Bedrock resources are provisioned manually via AWS Console / separate pipeline.
# These outputs are placeholders so export_manifest.sh can generate a complete manifest.
output "bedrock_kb_id" {
  description = "Bedrock Knowledge Base ID → BEDROCK_KB_ID (set after manual provisioning)"
  value       = ""
}

output "bedrock_guardrail_id" {
  description = "Bedrock Guardrail ID → BEDROCK_GUARDRAIL_ID (set after manual provisioning)"
  value       = ""
}

# ── Frontend ─────────────────────────────────────────────────────────────────

output "s3_bucket_name" {
  description = "S3 bucket name for frontend assets → S3_BUCKET (deploy-frontend workflow)"
  value       = module.frontend.bucket_name
}

output "cloudfront_distribution_id" {
  description = "CloudFront distribution ID → CLOUDFRONT_DISTRIBUTION_ID (deploy-frontend workflow)"
  value       = module.frontend.cloudfront_distribution_id
}

output "cloudfront_domain_name" {
  description = "CloudFront public URL for the frontend SPA"
  value       = module.frontend.cloudfront_domain_name
}

# ── Diagnostic outputs (not in infrastructure.yaml contract) ─────────────────

output "eks_cluster_endpoint" {
  description = "EKS API server endpoint"
  value       = module.eks.cluster_endpoint
}

output "vpc_id" {
  description = "VPC ID"
  value       = module.vpc.vpc_id
}

output "dynamodb_token_store_table" {
  description = "DynamoDB table name for OAuth token store"
  value       = module.dynamodb.token_store_table_name
}
