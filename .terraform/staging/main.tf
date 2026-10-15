locals {
  # Provider settings
  digitalocean_ssh_key_name = "feadship-staging-sshkey"

  # General settings
  prefix = "feadship"
  tag    = "staging"

  # Server settings (https://slugs.do-api.dev/)
  image       = "ubuntu-22-04-x64"
  size        = "s-2vcpu-4gb"
  region      = "ams3"
  backups     = true
  backup_plan = "weekly"

  # DNS settings
  dns_domain        = "staging.feadship.owow.dev"
  # dns_names         = ["@", "www"]
  dns_caa_authority = "letsencrypt.org"

  # Project settings
  project_name        = "Feadship Staging"
  project_environment = "Staging"

  # Storage settings
  storage_space_name   = "feadship-staging"
  storage_space_region = "ams3"
}

terraform {
  backend "s3" {
    bucket = "owow-terraform"
    key    = "feadship-staging.tfstate"
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
  source            = "../modules/dns"
  dns_domain        = local.dns_domain
  # dns_names       = local.dns_names
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

output "server_ip" {
  value = module.server.server_ip
}
