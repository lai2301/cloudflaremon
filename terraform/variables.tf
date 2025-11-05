variable "cloudflare_api_token" {
  description = "Cloudflare API Token with Workers KV permissions"
  type        = string
  sensitive   = true
}

variable "cloudflare_account_id" {
  description = "Cloudflare Account ID"
  type        = string
}

variable "worker_name" {
  description = "Name of the Cloudflare Worker"
  type        = string
  default     = "heartbeat-monitor"
}

variable "compatibility_date" {
  description = "Cloudflare Workers compatibility date"
  type        = string
  default     = "2024-01-01"
}

