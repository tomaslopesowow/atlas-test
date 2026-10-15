resource "digitalocean_project" "project" {
  name        = var.project_name
  description = "${var.project_name} environment"
  purpose     = "Web Application"
  environment = var.project_environment
  resources   = var.resource_urns
}
