variable "project_name" {
  description = "This is the name of the project that is shown in the DigitalOcean project list"
}

variable "project_environment" {
  description = "This is the name of the environment that is shown in the DigitalOcean project list"
  validation {
    condition     = contains(["Development", "Staging", "Production"], var.project_environment)
    error_message = "The project environment must be one of the following: Development, Staging, Production"
  }
}

variable "resource_urns" {
  type        = list(string)
  description = "This is a list of resource urns that will be added to the project"
}
