/**
 * Notification System for Cloudflare Heartbeat Monitor
 * Handles all notification channels and alert routing
 */

import notificationsConfig from '../notifications.json';

/**
 * Check for status changes and send notifications
 */
export async function checkAndSendNotifications(env, currentResults, monitorData, servicesConfig) {
  if (!notificationsConfig.enabled) {
    return;
  }

  try {
    // Get previous status from KV
    const previousStatusJson = await env.HEARTBEAT_LOGS.get('notifications:previous_status');
    const previousStatus = previousStatusJson ? JSON.parse(previousStatusJson) : {};

    const now = Date.now();
    const cooldownMs = (notificationsConfig.settings.cooldownMinutes || 5) * 60 * 1000;

    for (const result of currentResults) {
      const serviceId = result.serviceId;
      const currentState = result.status;
      const previousState = previousStatus[serviceId]?.status || 'unknown';
      const lastAlertTime = previousStatus[serviceId]?.lastAlert || 0;

      // Detect status change
      const statusChanged = currentState !== previousState && previousState !== 'unknown';
      const shouldAlert = statusChanged && (now - lastAlertTime) > cooldownMs;

      if (shouldAlert) {
        // Determine event type
        let eventType = null;
        if (currentState === 'down') eventType = 'down';
        else if (currentState === 'up' && previousState === 'down') eventType = 'up';
        else if (currentState === 'degraded') eventType = 'degraded';

        if (eventType) {
          // Get service config for notification settings
          const serviceConfig = servicesConfig.services.find(s => s.id === serviceId);
          await sendNotifications(env, eventType, result, serviceConfig);
          
          // Update last alert time
          previousStatus[serviceId] = {
            status: currentState,
            lastAlert: now
          };
        }
      } else if (!statusChanged) {
        // Update current status without alert
        if (!previousStatus[serviceId]) {
          previousStatus[serviceId] = { status: currentState, lastAlert: 0 };
        } else {
          previousStatus[serviceId].status = currentState;
        }
      }
    }

    // Save updated status
    await env.HEARTBEAT_LOGS.put('notifications:previous_status', JSON.stringify(previousStatus));
  } catch (error) {
    console.error('Error in notification system:', error);
  }
}

/**
 * Send notifications to all enabled channels
 */
async function sendNotifications(env, eventType, serviceData, serviceConfig = null) {
  // Start with globally enabled channels that support this event type
  let enabledChannels = notificationsConfig.channels.filter(
    ch => ch.enabled && ch.events.includes(eventType)
  );

  // Apply per-service notification filtering if configured
  if (serviceConfig?.notifications) {
    const serviceNotifConfig = serviceConfig.notifications;
    
    // Check if notifications are enabled for this service
    if (serviceNotifConfig.enabled === false) {
      console.log(`Notifications disabled for service: ${serviceConfig.id}`);
      return;
    }

    // Filter by service-specific channels if configured
    if (serviceNotifConfig.channels && serviceNotifConfig.channels.length > 0) {
      enabledChannels = enabledChannels.filter(ch => 
        serviceNotifConfig.channels.includes(ch.type)
      );
    }

    // Filter by service-specific events if configured
    if (serviceNotifConfig.events && serviceNotifConfig.events.length > 0) {
      if (!serviceNotifConfig.events.includes(eventType)) {
        console.log(`Event '${eventType}' not configured for service: ${serviceConfig.id}`);
        return;
      }
    }
  }

  if (enabledChannels.length === 0) {
    console.log(`No enabled channels found for service: ${serviceData.serviceId}, event: ${eventType}`);
    return;
  }

  console.log(`Sending notifications for ${serviceData.serviceId} (${eventType}) to ${enabledChannels.length} channel(s): ${enabledChannels.map(ch => ch.type).join(', ')}`);

  const promises = enabledChannels.map(channel => 
    sendChannelNotification(env, channel, eventType, serviceData)
  );

  await Promise.allSettled(promises);
}

/**
 * Send notification to a specific channel
 */
async function sendChannelNotification(env, channel, eventType, serviceData) {
  try {
    switch (channel.type) {
      case 'discord':
        await sendDiscordNotification(env, channel, eventType, serviceData);
        break;
      case 'slack':
        await sendSlackNotification(env, channel, eventType, serviceData);
        break;
      case 'telegram':
        await sendTelegramNotification(env, channel, eventType, serviceData);
        break;
      case 'email':
        await sendEmailNotification(env, channel, eventType, serviceData);
        break;
      case 'webhook':
        await sendWebhookNotification(env, channel, eventType, serviceData);
        break;
      case 'pushover':
        await sendPushoverNotification(env, channel, eventType, serviceData);
        break;
      case 'pagerduty':
        await sendPagerDutyNotification(env, channel, eventType, serviceData);
        break;
      default:
        console.warn(`Unknown notification channel type: ${channel.type}`);
    }
  } catch (error) {
    console.error(`Error sending ${channel.type} notification:`, error);
  }
}

/**
 * Get credential from environment variables
 */
function getCredential(env, channel, key) {
  // Try environment variable first (format: NOTIFICATION_CHANNELNAME_KEY)
  const envKey = `NOTIFICATION_${channel.name.toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${key.toUpperCase()}`;
  return env[envKey] || channel.config[key];
}

/**
 * Send Discord notification
 */
async function sendDiscordNotification(env, channel, eventType, serviceData) {
  const webhookUrl = getCredential(env, channel, 'webhookUrl');
  if (!webhookUrl) {
    console.error('Discord webhook URL not configured');
    return;
  }

  const color = eventType === 'down' ? 15158332 : eventType === 'up' ? 3066993 : 15844367; // Red, Green, Orange
  const emoji = eventType === 'down' ? '🔴' : eventType === 'up' ? '🟢' : '🟡';
  
  const embed = {
    title: `${emoji} Service ${eventType.toUpperCase()}: ${serviceData.serviceName}`,
    description: `Service **${serviceData.serviceName}** is now **${eventType}**`,
    color: color,
    fields: [
      { name: 'Service ID', value: serviceData.serviceId, inline: true },
      { name: 'Status', value: eventType.toUpperCase(), inline: true },
      { name: 'Last Seen', value: serviceData.lastSeen || 'Never', inline: false },
      { name: 'Timestamp', value: new Date(serviceData.timestamp).toLocaleString(), inline: false }
    ],
    footer: { text: 'Cloudflare Heartbeat Monitor' },
    timestamp: new Date().toISOString()
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] })
  });
}

/**
 * Send Slack notification
 */
async function sendSlackNotification(env, channel, eventType, serviceData) {
  const webhookUrl = getCredential(env, channel, 'webhookUrl');
  if (!webhookUrl) {
    console.error('Slack webhook URL not configured');
    return;
  }

  const color = eventType === 'down' ? 'danger' : eventType === 'up' ? 'good' : 'warning';
  const emoji = eventType === 'down' ? ':red_circle:' : eventType === 'up' ? ':large_green_circle:' : ':large_orange_circle:';
  
  const payload = {
    text: `${emoji} Service Alert: ${serviceData.serviceName}`,
    attachments: [{
      color: color,
      fields: [
        { title: 'Service', value: serviceData.serviceName, short: true },
        { title: 'Status', value: eventType.toUpperCase(), short: true },
        { title: 'Service ID', value: serviceData.serviceId, short: true },
        { title: 'Last Seen', value: serviceData.lastSeen || 'Never', short: true }
      ],
      footer: 'Cloudflare Heartbeat Monitor',
      ts: Math.floor(Date.now() / 1000)
    }]
  };

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
}

/**
 * Send Telegram notification
 */
async function sendTelegramNotification(env, channel, eventType, serviceData) {
  const botToken = getCredential(env, channel, 'botToken');
  const chatId = getCredential(env, channel, 'chatId');
  
  if (!botToken || !chatId) {
    console.error('Telegram bot token or chat ID not configured');
    return;
  }

  const emoji = eventType === 'down' ? '🔴' : eventType === 'up' ? '🟢' : '🟡';
  const message = `${emoji} *Service ${eventType.toUpperCase()}*\n\n` +
    `*Service:* ${serviceData.serviceName}\n` +
    `*Status:* ${eventType.toUpperCase()}\n` +
    `*Last Seen:* ${serviceData.lastSeen || 'Never'}\n` +
    `*Time:* ${new Date(serviceData.timestamp).toLocaleString()}`;

  const url = `https://api.telegram.org/bot${botToken}/sendMessage`;
  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text: message,
      parse_mode: 'Markdown'
    })
  });
}

/**
 * Send Email notification via Mailgun
 */
async function sendEmailNotification(env, channel, eventType, serviceData) {
  const provider = channel.config.provider;
  if (provider !== 'mailgun') {
    console.warn('Only Mailgun email provider is currently supported');
    return;
  }

  const apiKey = getCredential(env, channel, 'apiKey');
  const domain = getCredential(env, channel, 'domain');
  const from = channel.config.from;
  const to = channel.config.to;

  if (!apiKey || !domain || !from || !to) {
    console.error('Mailgun configuration incomplete');
    return;
  }

  const subject = `[${eventType.toUpperCase()}] ${serviceData.serviceName} - Heartbeat Monitor Alert`;
  const text = `Service: ${serviceData.serviceName}\n` +
    `Status: ${eventType.toUpperCase()}\n` +
    `Service ID: ${serviceData.serviceId}\n` +
    `Last Seen: ${serviceData.lastSeen || 'Never'}\n` +
    `Timestamp: ${new Date(serviceData.timestamp).toLocaleString()}`;

  const formData = new FormData();
  formData.append('from', from);
  formData.append('to', to.join(','));
  formData.append('subject', subject);
  formData.append('text', text);

  const url = `https://api.mailgun.net/v3/${domain}/messages`;
  await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + btoa(`api:${apiKey}`)
    },
    body: formData
  });
}

/**
 * Send custom webhook notification
 */
async function sendWebhookNotification(env, channel, eventType, serviceData) {
  const url = getCredential(env, channel, 'url');
  if (!url) {
    console.error('Webhook URL not configured');
    return;
  }

  const payload = {
    event: eventType,
    service: {
      id: serviceData.serviceId,
      name: serviceData.serviceName,
      status: serviceData.status
    },
    lastSeen: serviceData.lastSeen,
    timestamp: serviceData.timestamp
  };

  // Build headers, replacing tokens from env if available
  const headers = {
    'Content-Type': 'application/json',
    ...channel.config.headers
  };

  // Replace authorization token if available in env
  const authToken = getCredential(env, channel, 'authToken');
  if (authToken && headers.Authorization) {
    headers.Authorization = headers.Authorization.replace('YOUR_TOKEN', authToken);
  }

  await fetch(url, {
    method: channel.config.method || 'POST',
    headers: headers,
    body: JSON.stringify(payload)
  });
}

/**
 * Send Pushover notification
 */
async function sendPushoverNotification(env, channel, eventType, serviceData) {
  const userKey = getCredential(env, channel, 'userKey');
  const apiToken = getCredential(env, channel, 'apiToken');

  if (!userKey || !apiToken) {
    console.error('Pushover user key or API token not configured');
    return;
  }

  const priority = eventType === 'down' ? 1 : 0;
  const message = `Service ${serviceData.serviceName} is ${eventType.toUpperCase()}`;
  
  const formData = new FormData();
  formData.append('token', apiToken);
  formData.append('user', userKey);
  formData.append('message', message);
  formData.append('title', 'Heartbeat Monitor Alert');
  formData.append('priority', priority);

  await fetch('https://api.pushover.net/1/messages.json', {
    method: 'POST',
    body: formData
  });
}

/**
 * Send PagerDuty notification
 */
async function sendPagerDutyNotification(env, channel, eventType, serviceData) {
  const routingKey = getCredential(env, channel, 'routingKey');
  if (!routingKey) {
    console.error('PagerDuty routing key not configured');
    return;
  }

  const event = {
    routing_key: routingKey,
    event_action: eventType === 'down' ? 'trigger' : 'resolve',
    dedup_key: `heartbeat-${serviceData.serviceId}`,
    payload: {
      summary: `Service ${serviceData.serviceName} is ${eventType}`,
      severity: eventType === 'down' ? 'critical' : 'info',
      source: 'cloudflare-heartbeat-monitor',
      custom_details: {
        service_id: serviceData.serviceId,
        service_name: serviceData.serviceName,
        last_seen: serviceData.lastSeen,
        status: eventType
      }
    }
  };

  await fetch('https://events.pagerduty.com/v2/enqueue', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(event)
  });
}

/**
 * Test notification (exported for API endpoint)
 */
export async function testNotification(env, channelType, eventType = 'down') {
  if (!notificationsConfig.enabled) {
    throw new Error('Notifications are disabled in config');
  }

  // Find the channel
  const channel = notificationsConfig.channels.find(ch => ch.type === channelType);
  if (!channel) {
    throw new Error(`Channel type '${channelType}' not found in config`);
  }

  if (!channel.enabled) {
    throw new Error(`Channel '${channel.name}' is disabled`);
  }

  // Create test service data
  const testServiceData = {
    serviceId: 'test-service',
    serviceName: 'Test Notification Service',
    status: eventType,
    lastSeen: new Date().toISOString(),
    timestamp: Date.now()
  };

  // Send test notification
  await sendChannelNotification(env, channel, eventType, testServiceData);

  return {
    success: true,
    channel: channel.name,
    type: channel.type,
    event: eventType
  };
}

