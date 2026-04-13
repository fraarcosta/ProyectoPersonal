provider "aws" {
  region = var.region

  default_tags {
    tags = {
      Project     = var.project
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Configure kubernetes provider after EKS is created
provider "kubernetes" {
  host                   = module.eks.cluster_endpoint
  cluster_ca_certificate = base64decode(module.eks.cluster_certificate_authority_data)

  exec {
    api_version = "client.authentication.k8s.io/v1beta1"
    command     = "aws"
    args        = ["eks", "get-token", "--cluster-name", module.eks.cluster_name, "--region", var.region]
  }
}

data "aws_availability_zones" "available" {
  state = "available"
}

locals {
  cluster_name = "${var.project}-${var.environment}"

  common_tags = {
    Project     = var.project
    Environment = var.environment
  }
}

# ── VPC ───────────────────────────────────────────────────────────────────────
# Dedicated VPC with public + private subnets across 3 AZs.
# Private subnets host EKS nodes; public subnets host the ALB.

module "vpc" {
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "${local.cluster_name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = slice(data.aws_availability_zones.available.names, 0, 3)
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway   = true
  single_nat_gateway   = true
  enable_dns_hostnames = true

  # Tags required by AWS Load Balancer Controller for subnet autodiscovery
  public_subnet_tags = {
    "kubernetes.io/role/elb" = "1"
  }
  private_subnet_tags = {
    "kubernetes.io/role/internal-elb" = "1"
  }
}

# ── EKS ───────────────────────────────────────────────────────────────────────

module "eks" {
  source = "./modules/eks"

  cluster_name    = local.cluster_name
  cluster_version = var.eks_cluster_version
  region          = var.region
  vpc_id          = module.vpc.vpc_id
  subnet_ids      = module.vpc.private_subnets
  namespace       = var.namespace

  node_instance_type = var.eks_node_instance_type
  node_desired_size  = var.eks_node_desired_size
  node_min_size      = var.eks_node_min_size
  node_max_size      = var.eks_node_max_size

  tags = local.common_tags
}

# ── ECR ───────────────────────────────────────────────────────────────────────

module "ecr" {
  source = "./modules/ecr"

  project     = var.project
  environment = var.environment
  tags        = local.common_tags
}

# ── DynamoDB ──────────────────────────────────────────────────────────────────

module "dynamodb" {
  source = "./modules/dynamodb"

  conversations_table_name = var.dynamodb_conversations_table
  environment              = var.environment
  tags                     = local.common_tags
}

# ── Cognito ───────────────────────────────────────────────────────────────────

module "cognito" {
  source = "./modules/cognito"

  project       = var.project
  environment   = var.environment
  callback_urls = var.cognito_callback_urls
  tags          = local.common_tags
}
