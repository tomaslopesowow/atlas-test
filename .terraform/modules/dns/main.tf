locals {
  # Flatten domains and records into a single list with unique keys
  dns_records_flat = flatten([
    for domain_idx, domain in var.domains : [
      for record_idx, record in domain.records : {
        key      = "${domain_idx}-${record_idx}"
        domain   = domain.domain
        type     = record.type
        name     = record.name
        value    = record.value
        priority = record.priority
        weight   = record.weight
        port     = record.port
        flags    = record.flags
        tag      = record.tag
        ttl      = record.ttl
      }
    ]
  ])
}

resource "digitalocean_domain" "domains" {
  for_each = { for idx, domain in var.domains : domain.domain => domain }
  name     = each.value.domain
}

resource "digitalocean_record" "records" {
  for_each = { for record in local.dns_records_flat : record.key => record }

  domain   = digitalocean_domain.domains[each.value.domain].id
  type     = each.value.type
  name     = each.value.name
  priority = each.value.priority
  weight   = each.value.weight
  port     = each.value.port
  flags    = each.value.flags
  tag      = each.value.tag
  ttl      = each.value.ttl

  # For A records without explicit value, use dns_ip_address
  value = each.value.value != null ? each.value.value : (
    each.value.type == "A" ? var.dns_ip_address : ""
  )
}

output "domain_urns" {
  value = { for domain_name, domain in digitalocean_domain.domains : domain_name => domain.urn }
}
