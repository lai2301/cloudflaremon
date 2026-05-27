/**
 * Heartbeat API Handler
 * Handles POST /api/heartbeat requests for single and batch heartbeats
 */

import { buildServicesWithGroups } from '../config/loader.js';

/**
 * Handle heartbeat POST request
 * Supports both single service and batch processing
 */
export async function handleHeartbeat(request, env) {
  try {
    const data = await request.json();
    const timestamp = new Date().toISOString();
    
    // Build services with merged group config
    const processedServices = buildServicesWithGroups();
    
    // Determine if this is a batch or single heartbeat
    let serviceEntries = [];
    
    if (data.services && Array.isArray(data.services)) {
      // Batch mode: multiple services
      if (data.services.length === 0) {
        return new Response(JSON.stringify({ error: 'services array cannot be empty' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
      
      // Check if services are strings or objects with tokens
      serviceEntries = data.services.map(item => {
        if (typeof item === 'string') {
          // Simple string format: use shared Authorization header
          return { serviceId: item, token: null };
        } else if (item && typeof item === 'object' && item.serviceId) {
          // Object format with per-service token
          return { serviceId: item.serviceId, token: item.token || null };
        } else {
          return { serviceId: null, token: null, error: 'Invalid service format' };
        }
      });
    } else if (data.serviceId) {
      // Single mode: one service (backward compatible)
      serviceEntries = [{ serviceId: data.serviceId, token: null }];
    } else {
      return new Response(JSON.stringify({ 
        error: 'Either serviceId or services array is required',
        usage: {
          single: '{ "serviceId": "service-1" }',
          batchShared: '{ "services": ["service-1", "service-2"] }',
          batchPerService: '{ "services": [{"serviceId": "service-1", "token": "xxx"}, {"serviceId": "service-2", "token": "yyy"}] }'
        }
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Parse API keys once
    let apiKeys = null;
    if (env.API_KEYS) {
      try {
        apiKeys = JSON.parse(env.API_KEYS);
      } catch (error) {
        console.error('Error parsing API_KEYS:', error);
        return new Response(JSON.stringify({ error: 'Server configuration error' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Get shared Authorization header (fallback if no per-service token)
    const sharedAuthHeader = request.headers.get('Authorization');

    // Validate all services and check API keys
    const results = [];
    const validServiceIds = [];
    
    for (const entry of serviceEntries) {
      const serviceId = entry.serviceId;
      
      // Check for malformed entry
      if (!serviceId) {
        results.push({
          serviceId: 'unknown',
          success: false,
          error: entry.error || 'Invalid service entry'
        });
        continue;
      }
      
      // Find service in config
      const service = processedServices.find(s => s.id === serviceId);
      
      if (!service) {
        results.push({
          serviceId: serviceId,
          success: false,
          error: 'Unknown serviceId'
        });
        continue;
      }

      // Check if authentication is required for this service
      const authRequired = service.auth?.required ?? true; // Default to true if not specified

      if (authRequired) {
        if (!apiKeys) {
          console.error(`Service ${serviceId} requires auth but API_KEYS secret is not configured - rejecting`);
          results.push({
            serviceId: serviceId,
            success: false,
            error: 'Server misconfigured: API_KEYS not set'
          });
          continue;
        }

        // Look up API key with fallback chain:
        // 1. Exact service ID match (highest priority)
        // 2. Group ID match (shared key for group)
        // 3. Wildcard "*" (shared key for all services)
        let expectedApiKey = null;
        let keySource = null;

        if (apiKeys[serviceId]) {
          // Exact match: service-specific key
          expectedApiKey = apiKeys[serviceId];
          keySource = 'service';
        } else if (service.groupId && apiKeys[service.groupId]) {
          // Group match: shared key for all services in group
          expectedApiKey = apiKeys[service.groupId];
          keySource = 'group';
        } else if (apiKeys['*']) {
          // Wildcard match: shared key for all services
          expectedApiKey = apiKeys['*'];
          keySource = 'wildcard';
        }

        if (!expectedApiKey) {
          console.error(`Service ${serviceId} requires auth but no key configured (service/group/wildcard all missing) - rejecting`);
          results.push({
            serviceId: serviceId,
            success: false,
            error: 'No API key configured for this service'
          });
          continue;
        }

        // Use per-service token if provided, otherwise use shared Authorization header
        let providedToken = null;
        if (entry.token) {
          // Per-service token provided in payload
          providedToken = `Bearer ${entry.token}`;
        } else {
          // Use shared Authorization header
          providedToken = sharedAuthHeader;
        }

        if (providedToken !== `Bearer ${expectedApiKey}`) {
          results.push({
            serviceId: serviceId,
            success: false,
            error: 'Invalid API key'
          });
          continue;
        }

        // Log successful auth with key source
        console.log(`Service ${serviceId} authenticated using ${keySource} key`);
      }

      // Service is valid
      validServiceIds.push(serviceId);
      results.push({
        serviceId: serviceId,
        success: true,
        timestamp: timestamp
      });
    }

    // Update heartbeat timestamps for all valid services.
    // Write per-service keys `latest:<serviceId>` to avoid the
    // read-modify-write race on the shared `monitor:latest` blob.
    // The cron handler aggregates these keys into `monitor:latest` (single-writer).
    if (validServiceIds.length > 0) {
      try {
        await Promise.all(validServiceIds.map(serviceId =>
          env.HEARTBEAT_LOGS.put(`latest:${serviceId}`, String(timestamp))
        ));
        console.log(`Batch heartbeat: ${validServiceIds.length} service(s) updated - ${validServiceIds.join(', ')}`);
      } catch (error) {
        console.error('Error updating heartbeat timestamps:', error);
        return new Response(JSON.stringify({ error: 'Failed to update heartbeat data' }), {
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Return appropriate response based on success/failure
    const successCount = results.filter(r => r.success).length;
    const failureCount = results.length - successCount;
    
    if (failureCount === 0) {
      // All succeeded
      return new Response(JSON.stringify({ 
        success: true, 
        message: serviceEntries.length === 1 
          ? 'Heartbeat received' 
          : `Batch heartbeat received for ${successCount} service(s)`,
        timestamp: timestamp,
        results: serviceEntries.length > 1 ? results : undefined
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } else if (successCount === 0) {
      // All failed
      return new Response(JSON.stringify({ 
        success: false,
        message: 'All heartbeats failed',
        results: results
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    } else {
      // Partial success
      return new Response(JSON.stringify({ 
        success: true,
        message: `Partial success: ${successCount} succeeded, ${failureCount} failed`,
        results: results
      }), {
        status: 207, // Multi-Status
        headers: { 'Content-Type': 'application/json' }
      });
    }

  } catch (error) {
    console.error('Heartbeat handler error:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

