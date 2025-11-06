/**
 * Notification System for Cloudflare Heartbeat Monitor
 * Handles all notification channels and alert routing
 */

import notificationsConfig from '../notifications.json';

/**
 * Render a template string with variables
 */
function renderTemplate(template, variables) {
  if (!template) return template;
  
  let rendered = template;
  for (const [key, value] of Object.entries(variables)) {
    const regex = new RegExp(`{{${key}}}`, 'g');
    rendered = rendered.replace(regex, value || '');
  }
  return rendered;
}

/**
 * Get emoji for event type
 */
function getEmoji(eventType) {
  const emojis = {
    down: '🔴',
    up: '🟢',
    degraded: '🟡'
  };
  return emojis[eventType] || '⚪';
}

/**
 * Get color for event type
 */
function getColor(eventType) {
  const colors = {
    down: { discord: 15158332, slack: 'danger' },  // Red
    up: { discord: 3066993, slack: 'good' },       // Green
    degraded: { discord: 15844367, slack: 'warning' } // Orange
  };
  return colors[eventType] || { discord: 8421504, slack: '#808080' }; // Gray
}

/**
 * Prepare template variables
 */
function prepareVariables(eventType, serviceData) {
  return {
    emoji: getEmoji(eventType),
    eventType: eventType.toUpperCase(),
    serviceName: serviceData.serviceName || serviceData.serviceId,
    serviceId: serviceData.serviceId,
    lastSeen: serviceData.lastSeen || 'Never',
    timestamp: new Date(serviceData.timestamp).toLocaleString(),
    timestampISO: new Date().toISOString()
  };
}

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

  const variables = prepareVariables(eventType, serviceData);
  const colors = getColor(eventType);
  const template = notificationsConfig.templates?.discord || {};
  
  // Render template fields
  const fields = (template.fields || []).map(field => ({
    name: renderTemplate(field.name, variables),
    value: renderTemplate(field.value, variables),
    inline: field.inline
  }));

  const embed = {
    title: renderTemplate(template.title, variables) || `${variables.emoji} Service ${variables.eventType}: ${variables.serviceName}`,
    description: renderTemplate(template.description, variables) || `Service **${variables.serviceName}** is now **${eventType}**`,
    color: colors.discord,
    fields: fields.length > 0 ? fields : [
      { name: 'Service ID', value: serviceData.serviceId, inline: true },
      { name: 'Status', value: variables.eventType, inline: true },
      { name: 'Last Seen', value: variables.lastSeen, inline: false },
      { name: 'Timestamp', value: variables.timestamp, inline: false }
    ],
    footer: { text: template.footer || 'Cloudflare Heartbeat Monitor' },
    timestamp: variables.timestampISO
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

  const variables = prepareVariables(eventType, serviceData);
  const colors = getColor(eventType);
  const template = notificationsConfig.templates?.slack || {};
  
  // Convert emoji to Slack format
  const slackEmoji = {
    '🔴': ':red_circle:',
    '🟢': ':large_green_circle:',
    '🟡': ':large_orange_circle:'
  }[variables.emoji] || ':white_circle:';
  
  variables.emoji = slackEmoji;
  
  // Render template fields
  const fields = (template.fields || []).map(field => ({
    title: renderTemplate(field.title, variables),
    value: renderTemplate(field.value, variables),
    short: field.short
  }));
  
  const payload = {
    text: renderTemplate(template.text, variables) || `${slackEmoji} Service Alert: ${variables.serviceName}`,
    attachments: [{
      color: colors.slack,
      fields: fields.length > 0 ? fields : [
        { title: 'Service', value: variables.serviceName, short: true },
        { title: 'Status', value: variables.eventType, short: true },
        { title: 'Service ID', value: serviceData.serviceId, short: true },
        { title: 'Last Seen', value: variables.lastSeen, short: true }
      ],
      footer: template.footer || 'Cloudflare Heartbeat Monitor',
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

  const variables = prepareVariables(eventType, serviceData);
  const template = notificationsConfig.templates?.telegram || {};
  
  const message = renderTemplate(template.message, variables) || 
    `${variables.emoji} *Service ${variables.eventType}*\n\n` +
    `*Service:* ${variables.serviceName}\n` +
    `*Status:* ${variables.eventType}\n` +
    `*Last Seen:* ${variables.lastSeen}\n` +
    `*Time:* ${variables.timestamp}`;

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

  const variables = prepareVariables(eventType, serviceData);
  const template = notificationsConfig.templates?.email || {};

  const subject = renderTemplate(template.subject, variables) || 
    `[${variables.eventType}] ${variables.serviceName} - Heartbeat Monitor Alert`;
  const text = renderTemplate(template.body, variables) ||
    `Service: ${variables.serviceName}\n` +
    `Status: ${variables.eventType}\n` +
    `Service ID: ${serviceData.serviceId}\n` +
    `Last Seen: ${variables.lastSeen}\n` +
    `Timestamp: ${variables.timestamp}`;

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

  const variables = prepareVariables(eventType, serviceData);
  const template = notificationsConfig.templates?.pushover || {};

  const priority = eventType === 'down' ? 1 : 0;
  const message = renderTemplate(template.message, variables) || 
    `Service ${variables.serviceName} is ${variables.eventType}`;
  const title = renderTemplate(template.title, variables) || 
    'Heartbeat Monitor Alert';
  
  const formData = new FormData();
  formData.append('token', apiToken);
  formData.append('user', userKey);
  formData.append('message', message);
  formData.append('title', title);
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

  const variables = prepareVariables(eventType, serviceData);
  const template = notificationsConfig.templates?.pagerduty || {};

  const summary = renderTemplate(template.summary, variables) || 
    `Service ${variables.serviceName} is ${eventType}`;
  const severity = template.severity || (eventType === 'down' ? 'critical' : 'info');

  const event = {
    routing_key: routingKey,
    event_action: eventType === 'down' ? 'trigger' : 'resolve',
    dedup_key: `heartbeat-${serviceData.serviceId}`,
    payload: {
      summary: summary,
      severity: severity,
      source: 'cloudflare-heartbeat-monitor',
      custom_details: {
        service_id: serviceData.serviceId,
        service_name: serviceData.serviceName,
        last_seen: variables.lastSeen,
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
 * Send custom alert from external tools
 */
export async function sendCustomAlert(env, alertData) {
  if (!notificationsConfig.enabled) {
    console.log('Notifications are disabled');
    return;
  }

  // Map severity to event type for color coding
  const severityMap = {
    'critical': 'down',
    'error': 'down',
    'warning': 'degraded',
    'info': 'up',
    'ok': 'up'
  };
  
  const eventType = severityMap[alertData.severity.toLowerCase()] || 'degraded';
  
  // Prepare service data format expected by notification functions
  const serviceData = {
    serviceId: alertData.source || 'external-alert',
    serviceName: alertData.title,
    status: alertData.status || alertData.severity,
    lastSeen: new Date().toISOString(),
    timestamp: Date.now(),
    alertData: alertData  // Pass through full alert data
  };

  // Get enabled channels for external alerts
  const enabledChannels = notificationsConfig.channels.filter(ch => {
    if (!ch.enabled) return false;
    
    // Check if channel supports external alerts
    if (ch.config && ch.config.externalAlerts === false) return false;
    
    // Map alert severity to our event types
    return ch.events.includes(eventType);
  });

  if (enabledChannels.length === 0) {
    console.log(`No enabled channels for alert severity: ${alertData.severity}`);
    return;
  }

  console.log(`Sending custom alert "${alertData.title}" to ${enabledChannels.length} channel(s): ${enabledChannels.map(ch => ch.type).join(', ')}`);

  // Send to each channel
  const promises = enabledChannels.map(async (channel) => {
    try {
      await sendCustomAlertToChannel(env, channel, alertData, eventType, serviceData);
    } catch (error) {
      console.error(`Error sending custom alert to ${channel.type}:`, error);
    }
  });

  await Promise.allSettled(promises);
}

/**
 * Send custom alert to a specific channel
 */
async function sendCustomAlertToChannel(env, channel, alertData, eventType, serviceData) {
  const variables = {
    emoji: getEmoji(eventType),
    title: alertData.title,
    message: alertData.message,
    severity: alertData.severity,
    source: alertData.source,
    status: alertData.status,
    timestamp: new Date().toLocaleString(),
    timestampISO: new Date().toISOString()
  };

  // Add labels as variables
  if (alertData.labels) {
    for (const [key, value] of Object.entries(alertData.labels)) {
      variables[key] = value;
    }
  }

  const colors = getColor(eventType);
  const template = notificationsConfig.templates?.[`${channel.type}_external`] || 
                   notificationsConfig.templates?.[channel.type] || {};

  switch (channel.type) {
    case 'discord':
      await sendDiscordCustomAlert(env, channel, variables, colors, template, alertData);
      break;
    case 'slack':
      await sendSlackCustomAlert(env, channel, variables, colors, template, alertData);
      break;
    case 'telegram':
      await sendTelegramCustomAlert(env, channel, variables, template, alertData);
      break;
    case 'email':
      await sendEmailCustomAlert(env, channel, variables, template, alertData);
      break;
    case 'webhook':
      await sendWebhookCustomAlert(env, channel, alertData);
      break;
    case 'pushover':
      await sendPushoverCustomAlert(env, channel, variables, template, alertData);
      break;
    case 'pagerduty':
      await sendPagerDutyCustomAlert(env, channel, variables, template, alertData);
      break;
    default:
      console.warn(`Channel type ${channel.type} not supported for custom alerts`);
  }
}

/**
 * Send custom alert to Discord
 */
async function sendDiscordCustomAlert(env, channel, variables, colors, template, alertData) {
  const webhookUrl = getCredential(env, channel, 'webhookUrl');
  if (!webhookUrl) {
    console.error('Discord webhook URL not configured');
    return;
  }

  const fields = [
    { name: 'Source', value: alertData.source || 'External', inline: true },
    { name: 'Severity', value: alertData.severity, inline: true }
  ];

  if (alertData.status) {
    fields.push({ name: 'Status', value: alertData.status, inline: true });
  }

  if (alertData.count) {
    fields.push({
      name: 'Alert Count',
      value: `🔥 Firing: ${alertData.count.firing} | ✅ Resolved: ${alertData.count.resolved}`,
      inline: false
    });
  }

  // Add custom labels
  if (alertData.labels && Object.keys(alertData.labels).length > 0) {
    for (const [key, value] of Object.entries(alertData.labels)) {
      if (key !== 'alertname' && key !== 'severity') {
        fields.push({ name: key, value: String(value), inline: true });
      }
    }
  }

  const embed = {
    title: `${variables.emoji} ${alertData.title}`,
    description: alertData.message,
    color: colors.discord,
    fields: fields,
    footer: { text: `Source: ${alertData.source || 'External Alert'}` },
    timestamp: variables.timestampISO
  };

  if (alertData.generatorURL || alertData.annotations?.imageUrl) {
    embed.url = alertData.generatorURL;
  }

  await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ embeds: [embed] })
  });
}

/**
 * Send custom alert to Slack
 */
async function sendSlackCustomAlert(env, channel, variables, colors, template, alertData) {
  const webhookUrl = getCredential(env, channel, 'webhookUrl');
  if (!webhookUrl) {
    console.error('Slack webhook URL not configured');
    return;
  }

  const slackEmoji = {
    '🔴': ':red_circle:',
    '🟢': ':large_green_circle:',
    '🟡': ':large_orange_circle:'
  }[variables.emoji] || ':white_circle:';

  const fields = [
    { title: 'Source', value: alertData.source || 'External', short: true },
    { title: 'Severity', value: alertData.severity, short: true }
  ];

  if (alertData.status) {
    fields.push({ title: 'Status', value: alertData.status, short: true });
  }

  const payload = {
    text: `${slackEmoji} ${alertData.title}`,
    attachments: [{
      color: colors.slack,
      text: alertData.message,
      fields: fields,
      footer: `Source: ${alertData.source || 'External Alert'}`,
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
 * Send custom alert to Telegram
 */
async function sendTelegramCustomAlert(env, channel, variables, template, alertData) {
  const botToken = getCredential(env, channel, 'botToken');
  const chatId = getCredential(env, channel, 'chatId');
  
  if (!botToken || !chatId) {
    console.error('Telegram bot token or chat ID not configured');
    return;
  }

  let message = `${variables.emoji} *${alertData.title}*\n\n`;
  message += `${alertData.message}\n\n`;
  message += `*Source:* ${alertData.source || 'External'}\n`;
  message += `*Severity:* ${alertData.severity}\n`;
  if (alertData.status) {
    message += `*Status:* ${alertData.status}\n`;
  }
  message += `*Time:* ${variables.timestamp}`;

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
 * Send custom alert to Email
 */
async function sendEmailCustomAlert(env, channel, variables, template, alertData) {
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

  const subject = `[${alertData.severity.toUpperCase()}] ${alertData.title}`;
  let text = `Alert from ${alertData.source || 'External System'}\n\n`;
  text += `Title: ${alertData.title}\n`;
  text += `Severity: ${alertData.severity}\n`;
  if (alertData.status) {
    text += `Status: ${alertData.status}\n`;
  }
  text += `\n${alertData.message}\n`;
  text += `\nTime: ${variables.timestamp}`;

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
 * Send custom alert to Webhook
 */
async function sendWebhookCustomAlert(env, channel, alertData) {
  const url = getCredential(env, channel, 'url');
  if (!url) {
    console.error('Webhook URL not configured');
    return;
  }

  const headers = {
    'Content-Type': 'application/json',
    ...channel.config.headers
  };

  const authToken = getCredential(env, channel, 'authToken');
  if (authToken && headers.Authorization) {
    headers.Authorization = headers.Authorization.replace('YOUR_TOKEN', authToken);
  }

  await fetch(url, {
    method: channel.config.method || 'POST',
    headers: headers,
    body: JSON.stringify(alertData)
  });
}

/**
 * Send custom alert to Pushover
 */
async function sendPushoverCustomAlert(env, channel, variables, template, alertData) {
  const userKey = getCredential(env, channel, 'userKey');
  const apiToken = getCredential(env, channel, 'apiToken');

  if (!userKey || !apiToken) {
    console.error('Pushover user key or API token not configured');
    return;
  }

  const priorityMap = { critical: 1, error: 1, warning: 0, info: -1 };
  const priority = priorityMap[alertData.severity.toLowerCase()] || 0;

  const formData = new FormData();
  formData.append('token', apiToken);
  formData.append('user', userKey);
  formData.append('message', alertData.message);
  formData.append('title', alertData.title);
  formData.append('priority', priority);

  await fetch('https://api.pushover.net/1/messages.json', {
    method: 'POST',
    body: formData
  });
}

/**
 * Send custom alert to PagerDuty
 */
async function sendPagerDutyCustomAlert(env, channel, variables, template, alertData) {
  const routingKey = getCredential(env, channel, 'routingKey');
  if (!routingKey) {
    console.error('PagerDuty routing key not configured');
    return;
  }

  const event = {
    routing_key: routingKey,
    event_action: alertData.status === 'resolved' ? 'resolve' : 'trigger',
    dedup_key: `custom-alert-${alertData.source}-${alertData.title}`.replace(/[^a-zA-Z0-9-]/g, '-'),
    payload: {
      summary: alertData.title,
      severity: alertData.severity === 'critical' ? 'critical' : 
                alertData.severity === 'error' ? 'error' : 
                alertData.severity === 'warning' ? 'warning' : 'info',
      source: alertData.source || 'external-alert',
      custom_details: {
        message: alertData.message,
        labels: alertData.labels,
        annotations: alertData.annotations
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

