variable "space_name" {
  description = "This is the name of the project that is shown in the DigitalOcean project list"
}

variable "region" {
  description = "This is the DigitalOcean region where the space will be deployed, see https://slugs.do-api.dev/."
}

variable "cdn" {
  type        = bool
  description = "If the storage bucket should use a CDN"
  default     = false
}
