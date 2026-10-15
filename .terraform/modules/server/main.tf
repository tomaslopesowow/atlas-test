resource "digitalocean_droplet" "server" {
  backups  = var.backups
  image    = var.image
  name     = "${var.prefix}-${var.tag}"
  region   = var.region
  size     = var.size
  tags     = [var.tag, var.prefix, "${var.prefix}-${var.tag}"]
  ssh_keys = var.ssh_keys

  monitoring        = true
  resize_disk       = false
  droplet_agent     = true
  graceful_shutdown = true

  lifecycle {
    prevent_destroy = true
    ignore_changes  = [user_data]
  }
}

output "server_urn" {
  value = digitalocean_droplet.server.urn
}

output "server_ip" {
  value = digitalocean_droplet.server.ipv4_address
}
