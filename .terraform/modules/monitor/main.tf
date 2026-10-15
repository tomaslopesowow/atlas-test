resource "digitalocean_uptime_check" "uptime_check" {
  for_each = { for check in var.uptime_checks : check.name => check }

  name    = each.value.name
  target  = each.value.target
  regions = var.uptime_check_regions
}

resource "digitalocean_uptime_alert" "alert" {
  for_each = {
    for i, item in flatten([
      for check in var.uptime_checks : [
        for alert in  check.alerts : {
          check_name = check.name
          alert      = alert
        }
      ]
    ])
    : "${item.check_name}-${i}" => item
  }

  name       = each.value.alert.name
  check_id   = digitalocean_uptime_check.uptime_check[each.value.check_name].id
  type       = each.value.alert.type
  comparison = each.value.alert.comparison
  threshold  = each.value.alert.threshold
  period     = each.value.alert.period

  notifications {
    email = var.uptime_alert_notifications.email
    slack {
      channel = var.uptime_alert_notifications.slack.channel
      url     = var.uptime_alert_notifications.slack.url
    }
  }
}
