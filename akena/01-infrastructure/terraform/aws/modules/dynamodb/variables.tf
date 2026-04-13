variable "conversations_table_name" {
  description = "Name of the DynamoDB table for agent conversation memory"
  type        = string
}

variable "environment" {
  description = "Deployment environment — enables PITR on prod"
  type        = string
}

variable "tags" {
  description = "Tags applied to all resources"
  type        = map(string)
  default     = {}
}
