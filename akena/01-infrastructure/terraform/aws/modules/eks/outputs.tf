output "cluster_name" {
  description = "EKS cluster name"
  value       = module.eks.cluster_name
}

output "cluster_endpoint" {
  description = "EKS API server endpoint"
  value       = module.eks.cluster_endpoint
}

output "cluster_certificate_authority_data" {
  description = "Base64-encoded certificate authority data for the cluster"
  value       = module.eks.cluster_certificate_authority_data
}

output "cluster_oidc_issuer_url" {
  description = "OIDC issuer URL — used to create IAM roles for service accounts (IRSA)"
  value       = module.eks.cluster_oidc_issuer_url
}

output "node_group_role_arn" {
  description = "IAM role ARN of the managed node group"
  value       = module.eks.eks_managed_node_groups["default"].iam_role_arn
}

# ALB domain is populated externally once the AWS Load Balancer Controller
# creates an Ingress resource. Use `kubectl get ingress -n <namespace>` to retrieve it
# and update manifests/dev-aws.json manually or via the export script.
output "alb_domain" {
  description = "ALB ingress hostname (empty until first Ingress resource is created)"
  value       = ""
}
