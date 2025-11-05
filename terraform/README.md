# Terraform Configuration for Cloudflare Heartbeat Monitor

This directory contains Terraform configuration to automatically provision the required Cloudflare resources.

## What Does This Create?

- **Cloudflare Workers KV Namespace** - For storing heartbeat logs
- **Updated wrangler.toml** - Automatically populated with the KV namespace ID

## Prerequisites

1. **Terraform installed** - [Download](https://www.terraform.io/downloads)
   ```bash
   # Verify installation
   terraform version
   ```

2. **Cloudflare API Token** with permissions:
   - Account → Workers KV Storage → Edit

3. **Cloudflare Account ID**
   - Find in: Cloudflare Dashboard → Workers & Pages (right sidebar)

## Quick Start

### Step 1: Install Terraform

**macOS (with Homebrew):**
```bash
brew install terraform
```

**Linux:**
```bash
# Download from https://www.terraform.io/downloads
# Or use package manager
```

**Windows:**
```bash
# Download from https://www.terraform.io/downloads
# Or use Chocolatey: choco install terraform
```

### Step 2: Configure Variables

```bash
cd terraform

# Copy the example file
cp terraform.tfvars.example terraform.tfvars

# Edit with your values
# Replace:
# - your-cloudflare-api-token-here
# - your-cloudflare-account-id-here
```

**terraform.tfvars** should look like:
```hcl
cloudflare_api_token   = "your_actual_token_abc123..."
cloudflare_account_id  = "b84daa8905fd9308de08dc214b4f5dfb"
worker_name            = "heartbeat-monitor"
compatibility_date     = "2024-01-01"
```

### Step 3: Initialize Terraform

```bash
terraform init
```

This downloads the Cloudflare provider plugin.

### Step 4: Preview Changes

```bash
terraform plan
```

You'll see what Terraform will create:
```
Terraform will perform the following actions:

  # cloudflare_workers_kv_namespace.heartbeat_logs will be created
  + resource "cloudflare_workers_kv_namespace" "heartbeat_logs" {
      + account_id = "b84daa8905fd9308de08dc214b4f5dfb"
      + id         = (known after apply)
      + title      = "heartbeat-monitor-HEARTBEAT_LOGS"
    }

  # local_file.wrangler_toml will be created
  + resource "local_file" "wrangler_toml" {
      + content  = (known after apply)
      + filename = "../wrangler.toml"
      + id       = (known after apply)
    }

Plan: 2 to add, 0 to change, 0 to destroy.
```

### Step 5: Apply Changes

```bash
terraform apply
```

Type `yes` when prompted.

**Output:**
```
Apply complete! Resources: 2 added, 0 changed, 0 destroyed.

Outputs:

kv_namespace_id = "abc123def456ghi789jkl0"
kv_namespace_title = "heartbeat-monitor-HEARTBEAT_LOGS"
```

### Step 6: Verify

```bash
# Check that wrangler.toml was updated
cat ../wrangler.toml

# You should see a real KV namespace ID (not placeholder)
```

### Step 7: Deploy

```bash
cd ..
npm run deploy
```

## What Just Happened?

1. ✅ Created a KV namespace in your Cloudflare account
2. ✅ Generated `wrangler.toml` with the correct namespace ID
3. ✅ Saved Terraform state to track resources

## Managing Changes

### View Current State

```bash
terraform show
```

### View Outputs

```bash
terraform output
```

### Update Configuration

Edit `terraform.tfvars` or `variables.tf`, then:

```bash
terraform plan
terraform apply
```

### Destroy Resources

**Warning:** This deletes the KV namespace and all data!

```bash
terraform destroy
```

## Using with GitHub Actions

You can integrate Terraform into your CI/CD pipeline:

### Option 1: Run Terraform Locally (Recommended)

1. Run Terraform locally to create KV namespace
2. Commit the generated `wrangler.toml`
3. GitHub Actions deploys the worker

### Option 2: Run Terraform in GitHub Actions

Add a Terraform workflow:

```yaml
name: Terraform Apply

on:
  workflow_dispatch:

jobs:
  terraform:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - uses: hashicorp/setup-terraform@v3
      
      - name: Terraform Init
        run: terraform init
        working-directory: terraform
      
      - name: Terraform Apply
        run: terraform apply -auto-approve
        working-directory: terraform
        env:
          TF_VAR_cloudflare_api_token: ${{ secrets.CLOUDFLARE_API_TOKEN }}
          TF_VAR_cloudflare_account_id: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
      
      - name: Commit Updated wrangler.toml
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add wrangler.toml
          git commit -m "Update wrangler.toml with KV namespace ID" || exit 0
          git push
```

## File Structure

```
terraform/
├── main.tf                    # Main Terraform configuration
├── variables.tf               # Variable definitions
├── terraform.tfvars.example   # Example variables file
├── wrangler.toml.tpl          # Template for wrangler.toml
├── README.md                  # This file
├── .terraform/                # Terraform plugins (created after init)
├── terraform.tfstate          # Terraform state (DO NOT commit)
└── terraform.tfvars           # Your variables (DO NOT commit)
```

## Terraform State

Terraform keeps track of resources in `terraform.tfstate`. This file:

- ✅ Should be backed up
- ❌ Should NOT be committed to git (contains sensitive data)
- 💡 Can be stored in Terraform Cloud or S3 for teams

### Remote State (Optional, for Teams)

For team collaboration, use remote state:

```hcl
# Add to main.tf
terraform {
  backend "s3" {
    bucket = "my-terraform-state"
    key    = "cloudflare-heartbeat-monitor/terraform.tfstate"
    region = "us-east-1"
  }
}
```

Or use [Terraform Cloud](https://cloud.hashicorp.com/products/terraform) (free for small teams).

## Troubleshooting

### "Error: Invalid API Token"

- Verify your API token in `terraform.tfvars`
- Ensure token has Workers KV permissions
- Token format should be a long alphanumeric string

### "Error: Invalid Account ID"

- Verify your Account ID in `terraform.tfvars`
- Find it in Cloudflare Dashboard → Workers & Pages

### "Error: Resource already exists"

If you manually created the KV namespace:

```bash
# Import it into Terraform
terraform import cloudflare_workers_kv_namespace.heartbeat_logs \
  <account_id>/<namespace_id>
```

### State File Conflicts

If multiple people run Terraform:

1. Use remote state (see above)
2. Or designate one person to run Terraform
3. Commit the generated `wrangler.toml` to git

## Advantages of Using Terraform

✅ **Reproducible** - Same setup every time
✅ **Version Controlled** - Infrastructure as code
✅ **Automated** - No manual steps
✅ **Documented** - Configuration is self-documenting
✅ **Idempotent** - Safe to run multiple times
✅ **Team Friendly** - Everyone uses the same config

## Alternatives

If you prefer not to use Terraform:

1. **Manual Creation** - See main README.md
   ```bash
   npx wrangler kv:namespace create "HEARTBEAT_LOGS"
   # Then update wrangler.toml manually
   ```

2. **Wrangler Only** - Use Wrangler CLI
   ```bash
   npx wrangler kv:namespace create "HEARTBEAT_LOGS"
   ```

## Resources

- [Cloudflare Terraform Provider](https://registry.terraform.io/providers/cloudflare/cloudflare/latest/docs)
- [Terraform Documentation](https://www.terraform.io/docs)
- [Terraform Best Practices](https://www.terraform-best-practices.com/)

## Support

For issues:
- Check Terraform logs: `terraform apply` output
- Verify credentials in `terraform.tfvars`
- See main project README.md

