variable "image" {
  description = "This is the DigitalOcean image used for the droplet, see https://slugs.do-api.dev/."
}

variable "prefix" {
  description = "This is the resource name prefix visible in DigitalOcean resource names"
}

variable "region" {
  description = "This is the DigitalOcean region where the application will be deployed, see https://slugs.do-api.dev/."
}

variable "size" {
  description = "This is the DigitalOcean droplet size, see https://slugs.do-api.dev/."
}

variable "tag" {
  description = "This is the environment tag the resources in DigitalOcean are tagged with"
}

variable "ssh_keys" {
  type        = list(string)
  description = "The SSH keys to be added to the droplet"
}

variable "backups" {
  type        = bool
  description = "Whether backups should be created automatically."
}

variable "backup_plan" {
  type        = string
  description = "Backup plan frequency. Can be 'daily' or 'weekly'."
}
