resource "digitalocean_spaces_bucket" "storage" {
  name = var.space_name
  region = var.region

  cors_rule {
    allowed_headers = ["*"]
    allowed_methods = ["GET"]
    allowed_origins = ["*"]
    max_age_seconds = 3000
  }
}

output "bucket_urn" {
  value = digitalocean_spaces_bucket.storage.urn
}
