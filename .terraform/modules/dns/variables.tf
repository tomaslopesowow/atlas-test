variable "dns_domain" {
  description = "This is the domain for which the record will be created."
}

variable "dns_names" {
  description = "These are the names/prefixes for which the records will be created. Defaults to the domain name."
  default = ["@"]
}

variable "dns_ip_address" {
  description = "This is the IP address to which the record will point."
}

variable "dns_caa_authority" {
  description = "This is the CAA authority value. Example: 'letsencrypt.org'."
}
