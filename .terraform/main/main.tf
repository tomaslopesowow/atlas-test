locals {
  # Provider settings
  # "<project>-<environment>-sshkey"
  digitalocean_ssh_key_name = "atlas-main-sshkey"

  # General settings
  prefix = "atlas"
  tag    = "production"

  # Server settings (https://slugs.do-api.dev/)
  image   = "ubuntu-22-04-x64"
  size    = "s-1vcpu-2gb"
  region  = "ams3"
  backups = true

  # DNS settings
  # "<environment>.<projec>.owow.dev"
  dns_domain        = "atlas.owow.dev"
  # dns_names         = ["@", "www"]
  dns_caa_authority = "letsencrypt.org"

  # Project settings
  project_name        = "Atlas Production"
  project_environment = "Production"

  # Storage settings
  storage_space_name   = "atlas-production"
  storage_space_region = "ams3"

  # Monitoring settings
  monitor_uptime_checks = [
    {
      name = "Atlas Web Production"
      target = "https://web.atlas.owow.app"
      alerts = [
        {
          name = "Downtime"
          type = "down"
          comparison = "greater_than"
          period = "2m"
        },
        {
          name = "Latency"
          type = "latency"
          comparison = "greater_than"
          threshold = 500 # ms
          period = "5m"
        },
        {
          name = "SSL expiry"
          type = "ssl_expiry"
          # 29 because renewal should begin if lower than 30 days.
          threshold = 29 # days
          period = "2m"
        },
        {
          name = "SSL expiry is nearing"
          type = "ssl_expiry"
          threshold = 9 # days
          period    = "2m"
        },
        {
          name = "SSL expires in a week, please fix ASAP"
          type = "ssl_expiry"
          threshold = 7 # days
          period    = "2m"
        }
      ]
    }
  ]
  monitor_uptime_check_regions = ["eu_west"]
  monitor_uptime_alert_notifications = {
    email = ["infrastructure@owow.io"]
    slack = {
      channel = "server-homies"
      url = "https://hooks.slack.com/services/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"
    }
  }
}

terraform {
  backend "s3" {
    bucket = "owow-terraform"
    key    = "atlas-production.tfstate"
    region = "eu-central-1"
    # These should be provided using the AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY environment variables.
    # access_key = ""
    # secret_key = ""
  }
}

module "provider" {
  source                    = "../modules/provider"
  DIGITALOCEAN_TOKEN        = var.DIGITALOCEAN_TOKEN
  SPACES_ACCESS_KEY_ID      = var.SPACES_ACCESS_KEY_ID
  SPACES_SECRET_ACCESS_KEY  = var.SPACES_SECRET_ACCESS_KEY
  digitalocean_ssh_key_name = local.digitalocean_ssh_key_name
}

module "server" {
  source   = "../modules/server"
  image    = local.image
  prefix   = local.prefix
  region   = local.region
  size     = local.size
  backups  = local.backups
  tag      = local.tag
  ssh_keys = [module.provider.ssh_key_id]
}

module "dns" {
  source            = "../modules/dns"
  dns_domain        = local.dns_domain
  # dns_names         = local.dns_names
  dns_ip_address    = module.server.server_ip
  dns_caa_authority = local.dns_caa_authority
}

module "storage" {
  source     = "../modules/storage"
  space_name = local.storage_space_name
  region     = local.storage_space_region
}

module "project" {
  source              = "../modules/project"
  project_environment = local.project_environment
  project_name        = local.project_name
  resource_urns = [
    module.server.server_urn,
    module.dns.domain_urn,
    module.storage.bucket_urn,
  ]
}

module "monitor" {
  source = "../modules/monitor"
  uptime_checks = local.monitor_uptime_checks
  uptime_check_regions = local.monitor_uptime_check_regions
  uptime_alert_notifications = local.monitor_uptime_alert_notifications
}

output "server_ip" {
  value = module.server.server_ip
}
