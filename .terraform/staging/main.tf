locals {
  # Provider settings
  # "<project>-<environment>-sshkey"
  digitalocean_ssh_key_name = "atlas-staging-sshkey"

  # General settings
  prefix = "atlas"
  tag    = "staging"

  # Server settings (https://slugs.do-api.dev/)
  image       = "ubuntu-24-04-x64"
  size        = "s-1vcpu-2gb"
  region      = "ams3"
  backups     = true
  backup_plan = "weekly"

  # DNS settings
  # For A records without value, dns_ip_address is used automatically
  domains = [
    {
      # "<environment>.<projec>.owow.dev"
      domain = "atlas.owow.dev"
      records = [
        { type = "A", name = "@" },
        { type = "A", name = "www" },
      ],
    },
  ]

  # Project settings
  project_name        = "Atlas Staging"
  project_environment = "Staging"

  # Storage settings
  storage_space_name   = "atlas-staging"
  storage_space_region = "ams3"
}

terraform {
  backend "s3" {
    bucket = "owow-terraform"
    key    = "atlas-staging.tfstate"
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
  source      = "../modules/server"
  image       = local.image
  prefix      = local.prefix
  region      = local.region
  size        = local.size
  backups     = local.backups
  backup_plan = local.backup_plan
  tag         = local.tag
  ssh_keys    = [module.provider.ssh_key_id]
}

module "dns" {
  source         = "../modules/dns"
  dns_ip_address = module.server.server_ip
  domains        = local.domains
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
  resource_urns = concat(
    [
      module.server.server_urn,
      module.storage.bucket_urn,
    ],
    values(module.dns.domain_urns)
  )
}

output "server_ip" {
  value = module.server.server_ip
}
