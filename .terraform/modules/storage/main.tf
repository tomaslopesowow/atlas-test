resource "digitalocean_spaces_bucket" "storage" {
  name   = var.space_name
  region = var.region
}

resource "digitalocean_cdn" "storage_cdn" {
  count = var.cdn ? 1 : 0

  origin = digitalocean_spaces_bucket.storage.bucket_domain_name
}

output "bucket_urn" {
  value = digitalocean_spaces_bucket.storage.urn
}
