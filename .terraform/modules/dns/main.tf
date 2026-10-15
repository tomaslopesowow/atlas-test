resource "digitalocean_domain" "domain" {
  name = var.dns_domain
}

resource "digitalocean_record" "www" {
  count  = length(var.dns_names)
  domain = digitalocean_domain.domain.id
  type   = "A"
  name   = var.dns_names[count.index]
  value  = var.dns_ip_address
}

# Temporarily disable because of unknown error: "Data needs to be a FQDN with
# issue or issuewild".
# resource "digitalocean_record" "caa" {
#   count  = length(var.dns_names)
#   domain = digitalocean_domain.domain.id
#   type   = "CAA"
#   name   = var.dns_names[count.index]
#   value  = var.dns_caa_authority
#   flags  = 0
#   tag    = "issue"
# }

output "domain_urn" {
    value = digitalocean_domain.domain.urn
}
