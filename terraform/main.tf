terraform {
  required_version = ">= 1.0"
  
  required_providers {
    cloudflare = {
      source  = "cloudflare/cloudflare"
      version = "~> 4.0"
    }
  }
}

provider "cloudflare" {
  api_token = var.cloudflare_api_token
}

# KV Namespace for Heartbeat Logs
resource "cloudflare_workers_kv_namespace" "heartbeat_logs" {
  account_id = var.cloudflare_account_id
  title      = "${var.worker_name}-HEARTBEAT_LOGS"
}

# Output the namespace ID so it can be used in wrangler.toml
output "kv_namespace_id" {
  value       = cloudflare_workers_kv_namespace.heartbeat_logs.id
  description = "The ID of the KV namespace for heartbeat logs"
}

output "kv_namespace_title" {
  value       = cloudflare_workers_kv_namespace.heartbeat_logs.title
  description = "The title of the KV namespace"
}

# Optionally update wrangler.toml automatically
resource "local_file" "wrangler_toml" {
  content = templatefile("${path.module}/wrangler.toml.tpl", {
    worker_name       = var.worker_name
    kv_namespace_id   = cloudflare_workers_kv_namespace.heartbeat_logs.id
    compatibility_date = var.compatibility_date
  })
  filename = "${path.module}/../wrangler.toml"
}

