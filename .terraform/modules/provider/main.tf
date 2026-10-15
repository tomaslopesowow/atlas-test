terraform {
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

# Docs: https://registry.terraform.io/providers/digitalocean/digitalocean/latest/docs
provider "digitalocean" {
  token             = var.DIGITALOCEAN_TOKEN
  spaces_access_id  = var.SPACES_ACCESS_KEY_ID
  spaces_secret_key = var.SPACES_SECRET_ACCESS_KEY
}

data "digitalocean_ssh_key" "terraform" {
  name = var.digitalocean_ssh_key_name
}

output "ssh_key_id" {
  value = data.digitalocean_ssh_key.terraform.id
}
