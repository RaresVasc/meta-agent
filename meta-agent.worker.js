// ============================================================================
// META-AGENT CLOUDFLARE WORKER
// Orchestrates 3 LLM assistants: admin → client → curier
// Endpoint: POST /run
// ============================================================================

// Configuration: backend server URL (where assistants are hosted)
const BACKEND_URL = 'http://localhost:3000'; // Change to production URL when deployed

/**
 * Orchestrate assistant calls: admin → client → curier
 * Uses output from one assistant as input to the next
 */
async function orchestrateAssistants(goal, context) {
  const stepsExecuted = [];
  const results = {};
  const errors = [];
  
  try {
    // Step 1: Call admin assistant (backend architect)
    console.log('📋 Step 1: Calling admin assistant...');
    const adminResponse = await callAssistant('admin', { goal, context });
    
    if (adminResponse.status !== 'ok') {
      errors.push(`Admin assistant error: ${adminResponse.error}`);
      return buildErrorResponse('Admin assistant failed', stepsExecuted, results, errors);
    }
    
    results.admin = adminResponse.data;
    stepsExecuted.push('admin');
    console.log('✅ Admin assistant completed');
    
    // Step 2: Call client assistant (use admin output as context)
    console.log('📋 Step 2: Calling client assistant...');
    const clientContext = {
      ...context,
      adminOutput: results.admin
    };
    const clientResponse = await callAssistant('client', { goal, context: clientContext });
    
    if (clientResponse.status !== 'ok') {
      errors.push(`Client assistant error: ${clientResponse.error}`);
      return buildErrorResponse('Client assistant failed', stepsExecuted, results, errors);
    }
    
    results.client = clientResponse.data;
    stepsExecuted.push('client');
    console.log('✅ Client assistant completed');
    
    // Step 3: Call curier assistant (use client output as context)
    console.log('📋 Step 3: Calling curier assistant...');
    const courierContext = {
      ...context,
      clientOutput: results.client
    };
    const courierResponse = await callAssistant('curier', { goal, context: courierContext });
    
    if (courierResponse.status !== 'ok') {
      errors.push(`Curier assistant error: ${courierResponse.error}`);
      return buildErrorResponse('Curier assistant failed', stepsExecuted, results, errors);
    }
    
    results.curier = courierResponse.data;
    stepsExecuted.push('curier');
    console.log('✅ Curier assistant completed');
    
    // All steps completed successfully
    return buildSuccessResponse(stepsExecuted, results);
    
  } catch (err) {
    errors.push(`Orchestration error: ${err.message}`);
    return buildErrorResponse('Orchestration failed', stepsExecuted, results, errors);
  }
}

/**
 * Call a single assistant via HTTP fetch with timeout
 */
async function callAssistant(assistantType, payload) {
  const url = `${BACKEND_URL}/assistant/${assistantType}`;
  const timeout = 30000; // 30 seconds timeout
  
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      return {
        status: 'error',
        error: `HTTP ${response.status}: ${response.statusText}`
      };
    }
    
    return await response.json();
    
  } catch (err) {
    if (err.name === 'AbortError') {
      return {
        status: 'error',
        error: `Timeout calling ${assistantType} (${timeout}ms)`
      };
    }
    return {
      status: 'error',
      error: err.message
    };
  }
}

/**
 * Build success response with all results
 */
function buildSuccessResponse(stepsExecuted, results) {
  return {
    status: 'ok',
    stepsExecuted,
    results,
    conflicts: [], // Could add conflict detection logic here
    nextActions: generateNextActions(results),
    timestamp: new Date().toISOString()
  };
}

/**
 * Build error response
 */
function buildErrorResponse(message, stepsExecuted, results, errors) {
  return {
    status: 'error',
    message,
    stepsExecuted,
    results,
    errors,
    timestamp: new Date().toISOString()
  };
}

/**
 * Generate suggested next actions based on results
 */
function generateNextActions(results) {
  const actions = [];
  
  if (results.admin?.firestoreProposal?.notes) {
    actions.push('Review and implement Firestore schema from admin proposal');
  }
  
  if (results.client?.clientPlan?.notes) {
    actions.push('Build UI screens according to client plan');
  }
  
  if (results.curier?.deliveryPlan?.notes) {
    actions.push('Configure delivery routing and ETA system');
  }
  
  if (actions.length === 0) {
    actions.push('Review assistant outputs and determine next steps');
  }
  
  return actions;
}

/**
 * Main Cloudflare Worker request handler
 */
export default {
  async fetch(request, env, ctx) {
    // Only handle POST requests to /run
    if (request.method !== 'POST') {
      return new Response('Use POST /run', { status: 405 });
    }
    
    const url = new URL(request.url);
    
    if (url.pathname !== '/run') {
      return new Response('Endpoint not found. Use POST /run', { status: 404 });
    }
    
    try {
      const payload = await request.json();
      const { goal, context } = payload;
      
      if (!goal) {
        return new Response(
          JSON.stringify({ status: 'error', error: 'Missing "goal" field' }),
          { status: 400, headers: { 'Content-Type': 'application/json' } }
        );
      }
      
      // Orchestrate the assistants
      const response = await orchestrateAssistants(goal, context || {});
      
      return new Response(
        JSON.stringify(response, null, 2),
        {
          status: response.status === 'ok' ? 200 : 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
      
    } catch (err) {
      return new Response(
        JSON.stringify({
          status: 'error',
          error: err.message,
          timestamp: new Date().toISOString()
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }
  }
};

// ============================================================================
// USAGE EXAMPLES
// ============================================================================

/*
POST /run HTTP/1.1
Content-Type: application/json

{
  "goal": "order.create",
  "context": {
    "admin": { "domain": "delivery" },
    "client": { "platform": "mobile" },
    "curier": { "region": "city-center" }
  }
}

RESPONSE:
{
  "status": "ok",
  "stepsExecuted": ["admin", "client", "curier"],
  "results": {
    "admin": {
      "assistant": "admin",
      "firestoreProposal": {...}
    },
    "client": {
      "assistant": "client",
      "clientPlan": {...}
    },
    "curier": {
      "assistant": "curier",
      "deliveryPlan": {...}
    }
  },
  "conflicts": [],
  "nextActions": [
    "Review and implement Firestore schema from admin proposal",
    "Build UI screens according to client plan",
    "Configure delivery routing and ETA system"
  ],
  "timestamp": "2026-02-07T14:30:00Z"
}
*/
