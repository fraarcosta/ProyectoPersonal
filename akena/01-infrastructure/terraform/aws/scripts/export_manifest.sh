#!/usr/bin/env bash
# Exports Terraform outputs → manifests/dev-aws.json
# Run from: akena/01-infrastructure/terraform/aws/
#
# Usage:
#   ./scripts/export_manifest.sh         (defaults to "dev")
#   ./scripts/export_manifest.sh prod
#
# After running, commit manifests/dev-aws.json so generate_config.py can read it
# without requiring terraform access. See infrastructure.yaml for the contract.

set -euo pipefail

ENV=${1:-dev}
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANIFEST_FILE="${SCRIPT_DIR}/../../manifests/${ENV}-aws.json"

echo "→ Initializing (if needed)..."
terraform init -input=false -no-color > /dev/null 2>&1 || true

echo "→ Exporting Terraform outputs..."

tf_raw() {
  terraform output -raw "$1" 2>/dev/null || echo ""
}

cat > "${MANIFEST_FILE}" <<EOF
{
  "cloud": "aws",
  "environment": "${ENV}",
  "CONTAINER_REGISTRY": "$(tf_raw ecr_repository_base)",
  "CLUSTER_NAME": "$(tf_raw eks_cluster_name)",
  "NAMESPACE": "$(tf_raw k8s_namespace)",
  "DOMAIN": "$(tf_raw alb_domain)",
  "AWS_REGION": "$(tf_raw aws_region)",
  "GCP_PROJECT_ID": "",
  "GCP_REGION": "",
  "COGNITO_USER_POOL_ID": "$(tf_raw cognito_user_pool_id)",
  "COGNITO_CLIENT_ID": "$(tf_raw cognito_client_id)",
  "COGNITO_REGION": "$(tf_raw aws_region)",
  "DYNAMODB_CONVERSATIONS_TABLE": "$(tf_raw dynamodb_conversations_table)",
  "BEDROCK_KB_ID": "$(tf_raw bedrock_kb_id)",
  "VERTEX_SEARCH_ENGINE_ID": "",
  "BEDROCK_GUARDRAIL_ID": "$(tf_raw bedrock_guardrail_id)",
  "MODEL_ARMOR_TEMPLATE_NAME": ""
}
EOF

echo "✓ Manifest written to ${MANIFEST_FILE}"
echo ""
echo "  Next: commit this file so generate_config.py can use it without terraform access."
echo "  If DOMAIN is empty, update it manually after the ALB Ingress Controller creates an ingress."
