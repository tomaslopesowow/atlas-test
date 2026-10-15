# Terraform/OpenTofu Infrastructure

This directory contains Infrastructure as Code (IaC) configuration using OpenTofu (Terraform-compatible) for provisioning cloud resources on DigitalOcean.

## Directory Structure

### Environments
- **`main/`**: Production environment configuration
- **`develop/`**: Development environment configuration (referenced but not detailed)

### Modules
Reusable infrastructure components:

#### `modules/provider/`
- **Purpose**: Configure DigitalOcean and Spaces providers
- **Resources**: API tokens, SSH keys, provider authentication

#### `modules/server/`
- **Purpose**: Provision DigitalOcean droplets (virtual machines)
- **Resources**: 
  - Ubuntu 22.04 droplet with monitoring enabled
  - SSH key configuration
  - Lifecycle protection to prevent accidental destruction
  - Tags for organization and billing

#### `modules/dns/` (Currently disabled)
- **Purpose**: Manage DNS records for the application
- **Resources**: Domain configuration, A records, CAA records for SSL

#### `modules/storage/` (Currently disabled)  
- **Purpose**: DigitalOcean Spaces (S3-compatible object storage)
- **Resources**: Storage buckets for static assets, backups

#### `modules/project/` (Currently disabled)
- **Purpose**: DigitalOcean project organization
- **Resources**: Group related resources under a project

#### `modules/monitor/` (Currently disabled)
- **Purpose**: Uptime monitoring and alerting
- **Resources**: 
  - HTTP/HTTPS uptime checks
  - SSL certificate monitoring
  - Latency monitoring
  - Slack/email notifications

## Production Configuration (`main/main.tf`)

### Current Resources
- **Droplet**: `s-1vcpu-2gb` Ubuntu 22.04 in Amsterdam (ams3)
- **Monitoring**: Basic DigitalOcean monitoring enabled
- **Backups**: Enabled for data protection
- **SSH Access**: Configured with project SSH key
- **SSL/TLS**: Automatic Let's Encrypt certificate management via nginx-certbot
- **Network**: Ports 22 (SSH), 80 (HTTP), 443 (HTTPS) configured

### Disabled Resources (commented out)
- DNS management for `atlas.owow.dev`
- DigitalOcean Spaces storage
- Project organization
- Comprehensive uptime monitoring with alerts

### Backend Configuration
- **Type**: S3 (AWS)
- **Bucket**: `owow-terraform`
- **State File**: `atlas-production.tfstate`
- **Region**: `eu-central-1`

## Monitoring Configuration (when enabled)

Comprehensive monitoring setup includes:
- **Uptime Checks**: HTTPS endpoint monitoring
- **SSL Monitoring**: Certificate expiration alerts (29, 9, 7 days)
- **Latency Alerts**: Response time > 500ms
- **Notifications**: 
  - Email: `infrastructure@owow.io`
  - Slack: `#server-homies` channel

## Variables and Secrets

### Required Environment Variables
- `DIGITALOCEAN_TOKEN`: DigitalOcean API access
- `SPACES_ACCESS_KEY_ID`: DigitalOcean Spaces access key
- `SPACES_SECRET_ACCESS_KEY`: DigitalOcean Spaces secret key
- `AWS_ACCESS_KEY_ID`: AWS S3 access for Terraform state
- `AWS_SECRET_ACCESS_KEY`: AWS S3 secret for Terraform state

### Local Variables
- Server specifications (size, region, image)
- DNS domain configuration
- Project naming and tagging
- Monitoring alert thresholds

## Usage

### Via GitHub Actions (Recommended)
Infrastructure is automatically managed through the deployment workflow.

### Manual Operations
```bash
# Initialize
cd .terraform/main
tofu init

# Plan changes
tofu plan

# Apply changes
tofu apply

# Get outputs (used by Ansible)
tofu output -json
```

## Security Features

- **Lifecycle Protection**: Prevents accidental server destruction
- **SSH Key Management**: Centralized SSH key configuration
- **Backup Strategy**: Automated droplet backups
- **Monitoring**: Proactive alerting for service issues
- **SSL/TLS Encryption**: Automatic certificate provisioning and renewal
- **Network Security**: Configured firewall rules for essential ports only

## Cost Optimization

- **Minimal Droplet**: 1 vCPU, 2GB RAM for cost efficiency
- **Regional Selection**: Amsterdam region for EU compliance
- **Resource Tagging**: Proper labeling for cost tracking

## Known Limitations

- Most modules are disabled (DNS, storage, monitoring, project)
- Single environment setup (production only active)
- Manual state management for disabled resources
- No automated scaling configuration

## Future Enhancements

- Enable DNS module for domain management
- Implement Spaces storage for static assets
- Activate comprehensive monitoring
- Add development environment provisioning
- Implement blue-green deployment infrastructure