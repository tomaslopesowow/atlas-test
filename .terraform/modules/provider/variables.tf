variable "DIGITALOCEAN_TOKEN" {
  type        = string
  description = "Your DigitalOcean Personal Access Token. \nUsage: `export TF_VAR_DIGITALOCEAN_TOKEN=\"your-token\"`"
  sensitive   = true
}

variable "SPACES_ACCESS_KEY_ID" {
  type        = string
  description = "The access key for DO spaces. \nUsage: `export TF_VAR_SPACES_ACCESS_KEY_ID=\"your-token\"`"
  sensitive   = true
}

variable "SPACES_SECRET_ACCESS_KEY" {
  type        = string
  description = "The secret access key for DO spaces. \nUsage: `export TF_VAR_SPACES_SECRET_ACCESS_KEY=\"your-token\"`"
  sensitive   = true
}

variable "digitalocean_ssh_key_name" {
  description = "The name of the SSH key to use for DigitalOcean droplets"
}
