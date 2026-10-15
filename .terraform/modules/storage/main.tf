resource "digitalocean_spaces_bucket" "storage" {
  name = var.space_name
  region = var.region
}

output "bucket_urn" {
  value = digitalocean_spaces_bucket.storage.urn
}
