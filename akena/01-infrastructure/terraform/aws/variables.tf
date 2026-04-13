variable "region" {
  description = "AWS region where all resources are deployed"
  type        = string
  default     = "eu-north-1"
}

variable "environment" {
  description = "Deployment environment (dev, staging, prod)"
  type        = string
  default     = "dev"

  validation {
    condition     = contains(["dev", "staging", "prod"], var.environment)
    error_message = "environment must be one of: dev, staging, prod."
  }
}

variable "project" {
  description = "Project name — used as prefix for all resource names"
  type        = string
  default     = "akena"
}

variable "namespace" {
  description = "Kubernetes namespace where agents and MCP servers are deployed"
  type        = string
  default     = "akena-dev"
}

# ── EKS ──────────────────────────────────────────────────────────────────────

variable "eks_cluster_version" {
  description = "Kubernetes version for the EKS cluster"
  type        = string
  default     = "1.29"
}

variable "eks_node_instance_type" {
  description = "EC2 instance type for EKS managed node group"
  type        = string
  default     = "t3.medium"
}

variable "eks_node_desired_size" {
  description = "Desired number of EKS worker nodes"
  type        = number
  default     = 2
}

variable "eks_node_min_size" {
  description = "Minimum number of EKS worker nodes"
  type        = number
  default     = 1
}

variable "eks_node_max_size" {
  description = "Maximum number of EKS worker nodes"
  type        = number
  default     = 4
}

# ── DynamoDB ─────────────────────────────────────────────────────────────────

variable "dynamodb_conversations_table" {
  description = "DynamoDB table name for agent conversation memory"
  type        = string
  default     = "akena-conversations"
}

# ── Cognito ──────────────────────────────────────────────────────────────────

variable "cognito_callback_urls" {
  description = "Allowed OAuth2 callback URLs for the Cognito app client"
  type        = list(string)
  default     = ["http://localhost:3000/callback"]
}
