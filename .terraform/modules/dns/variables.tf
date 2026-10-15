variable "dns_ip_address" {
  description = "This is the IP address to which A records will point by default (when no explicit value is provided)."
}

variable "domains" {
  description = "List of domains to manage. Each domain should have: domain (domain name), records (list of DNS records)."
  type = list(object({
    domain = string
    records = list(object({
      type     = string
      name     = string
      value    = optional(string)
      priority = optional(number) # For MX and SRV records
      weight   = optional(number) # For SRV records
      port     = optional(number) # For SRV records
      flags    = optional(number) # For CAA records
      tag      = optional(string) # For CAA records
      ttl      = optional(number)
    }))
  }))
  default = []
}
