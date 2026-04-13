# The base URL is used as CONTAINER_REGISTRY in manifests.
# Docker tags follow the pattern: <repository_base>/agents:<tag>
output "repository_base" {
  description = "ECR registry base URL (account.dkr.ecr.region.amazonaws.com/project)"
  value       = "${local.account_id}.dkr.ecr.${local.region}.amazonaws.com/${var.project}"
}

output "agents_repository_url" {
  description = "Full ECR URL for agent images"
  value       = aws_ecr_repository.agents.repository_url
}

output "mcp_servers_repository_url" {
  description = "Full ECR URL for MCP server images"
  value       = aws_ecr_repository.mcp_servers.repository_url
}

output "registry_id" {
  description = "ECR registry ID (AWS account ID)"
  value       = aws_ecr_repository.agents.registry_id
}
