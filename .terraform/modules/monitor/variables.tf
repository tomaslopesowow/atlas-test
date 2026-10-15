variable "uptime_checks" {
  type = list(
    object({
      name   = string
      target = string
      alerts = list(
        object({
          name       = string
          type       = string
          comparison = optional(string)
          threshold  = optional(number)
          period     = string
        })
      )
    })
  )
  description = "A list of uptime checks"
}

variable "uptime_check_regions" {
  type        = list(string)
  description = "A list of regions used in all given uptime checks"
}

variable "uptime_alert_notifications" {
  type = object({
    email = list(string)
    slack = object({
      channel = string
      url     = string
    })
  })
  description = "A configuration of where to send notifications to when alerts need to be made"
}
