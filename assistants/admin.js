// Admin assistant: uses real LLM via Groq or OpenAI (OpenAI-compatible)
// Falls back to rule-based approach if API unavailable

export async function handleTask(input) {
  const prompt = `You are a backend architect. Design a Firestore database schema for this intent: "${String(input.intent)}". Description: "${String(input.description)}". 
  
  Respond ONLY with valid JSON (no markdown, no extra text):
  {
    "analysis": "string describing the design",
    "confidence": 0.0-1.0,
    "risks": ["array", "of", "risks"],
    "firestoreProposal": {
      "collections": ["array", "of", "collection", "names"],
      "fields": { "collectionName": { "fieldName": "type", "otherField": "type" } },
      "notes": ["array", "of", "implementation", "notes"]
    }
  }`;

  const output = await callLLM(prompt, input);
  return output;
}

// callLLM: calls Cloudflare Workers AI, Groq, or OpenAI
// Falls back gracefully to rule-based if API unavailable
async function callLLM(prompt, input) {
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const groqKey = process.env.GROQ_API_KEY;
  const openaiKey = process.env.OPENAI_API_KEY;
  
  const hasCF = cfToken && cfAccountId;
  const hasGroq = !!groqKey;
  const hasOpenAI = !!openaiKey;

  if (!hasCF && !hasGroq && !hasOpenAI) {
    return fallbackLLM(input);
  }

  // Try Cloudflare first (cheapest & fastest)
  if (hasCF) {
    const cfResult = await callCloudflareAI(prompt, input, cfToken, cfAccountId);
    if (cfResult) return cfResult;
  }

  // Try Groq
  if (hasGroq) {
    const groqResult = await callGroqAPI(prompt, input, groqKey);
    if (groqResult) return groqResult;
  }

  // Try OpenAI
  if (hasOpenAI) {
    const openaiResult = await callOpenAIAPI(prompt, input, openaiKey);
    if (openaiResult) return openaiResult;
  }

  // Fallback
  return fallbackLLM(input);
}

// callCloudflareAI: Cloudflare Workers AI inference
// Using Mistral-7b-instruct: free, fast, excellent for JSON & structured output
async function callCloudflareAI(prompt, input, token, accountId) {
  try {
    const response = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/mistral/mistral-7b-instruct-v0.1`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messages: [
            {
              role: 'system',
              content: 'You are a backend architect. Respond ONLY with valid JSON, no markdown or extra text.'
            },
            { role: 'user', content: prompt }
          ]
        })
      }
    );

    if (!response.ok) {
      const error = await response.text();
      return null;
    }

    const data = await response.json();
    const content = data.result?.response || data.result?.data?.choices?.[0]?.message?.content;

    if (!content) {
      return null;
    }

    let parsed = parseJSON(content);
    if (!parsed) return null;

    return {
      assistant: 'admin',
      status: 'ok',
      analysis: parsed.analysis || 'Design completed by Mistral-7b (Cloudflare)',
      confidence: Math.min(Math.max(parsed.confidence || 0.75, 0), 1),
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      llmProvider: 'Cloudflare (Mistral-7b)',
      firestoreProposal: {
        collections: Array.isArray(parsed.firestoreProposal?.collections) ? parsed.firestoreProposal.collections : [],
        fields: typeof parsed.firestoreProposal?.fields === 'object' ? parsed.firestoreProposal.fields : {},
        notes: Array.isArray(parsed.firestoreProposal?.notes) ? parsed.firestoreProposal.notes : []
      }
    };
  } catch (err) {
    return null;
  }
}

// callGroqAPI: Groq inference
async function callGroqAPI(prompt, input, apiKey) {
  try {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'mixtral-8x7b-32768',
        messages: [
          {
            role: 'system',
            content: 'You are a backend architect. Respond ONLY with valid JSON, no markdown or extra text.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;

    let parsed = parseJSON(content);
    if (!parsed) return null;

    return {
      assistant: 'admin',
      status: 'ok',
      analysis: parsed.analysis || 'Design completed by Groq',
      confidence: Math.min(Math.max(parsed.confidence || 0.75, 0), 1),
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      llmProvider: 'Groq',
      firestoreProposal: {
        collections: Array.isArray(parsed.firestoreProposal?.collections) ? parsed.firestoreProposal.collections : [],
        fields: typeof parsed.firestoreProposal?.fields === 'object' ? parsed.firestoreProposal.fields : {},
        notes: Array.isArray(parsed.firestoreProposal?.notes) ? parsed.firestoreProposal.notes : []
      }
    };
  } catch (err) {
    return null;
  }
}

// callOpenAIAPI: OpenAI GPT
async function callOpenAIAPI(prompt, input, apiKey) {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: 'You are a backend architect. Respond ONLY with valid JSON, no markdown or extra text.'
          },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) return null;

    let parsed = parseJSON(content);
    if (!parsed) return null;

    return {
      assistant: 'admin',
      status: 'ok',
      analysis: parsed.analysis || 'Design completed by OpenAI',
      confidence: Math.min(Math.max(parsed.confidence || 0.75, 0), 1),
      risks: Array.isArray(parsed.risks) ? parsed.risks : [],
      llmProvider: 'OpenAI',
      firestoreProposal: {
        collections: Array.isArray(parsed.firestoreProposal?.collections) ? parsed.firestoreProposal.collections : [],
        fields: typeof parsed.firestoreProposal?.fields === 'object' ? parsed.firestoreProposal.fields : {},
        notes: Array.isArray(parsed.firestoreProposal?.notes) ? parsed.firestoreProposal.notes : []
      }
    };
  } catch (err) {
    return null;
  }
}

// parseJSON: helper to extract and parse JSON from LLM response
function parseJSON(content) {
  try {
    return JSON.parse(content);
  } catch {
    const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1] || jsonMatch[0]);
      } catch {
        return null;
      }
    }
    return null;
  }
}

// fallbackLLM: rule-based approach when API is unavailable
// fakeLLM: determinist, rule-based, fără apeluri externe
function fallbackLLM(input) {
  const intent = (input?.intent || '').toLowerCase();
  const description = (input?.description || '').toLowerCase();

  let collections = [];
  let fields = {};
  let notes = [];

  // Reguli simple, deterministe, orientate pe backend pentru exemple comune
  if (
    intent.includes('order') ||
    description.includes('order') ||
    description.includes('pickup') ||
    description.includes('deliver') ||
    intent.includes('delivery')
  ) {
    collections = ['orders', 'clients', 'couriers'];
    fields = {
      orders: {
        id: 'string',
        clientId: 'ref:clients',
        courierId: 'ref:couriers|null',
        status: "string (e.g. 'created','assigned','in_transit','delivered')",
        pickup: 'map { address, lat, lng }',
        dropoff: 'map { address, lat, lng }',
        price: 'number',
        createdAt: 'timestamp',
        updatedAt: 'timestamp'
      },
      clients: {
        id: 'string',
        name: 'string',
        contact: 'map { phone, email }',
        defaultAddress: 'map { address, lat, lng }'
      },
      couriers: {
        id: 'string',
        name: 'string',
        vehicle: 'string',
        active: 'boolean',
        location: 'map { lat, lng }'
      }
    };
    notes.push('Folosește subcollection `orders/{orderId}/events` pentru istoricul stării.');
    notes.push('Indexează `orders` după `clientId` și `status` pentru interogări rapide.');
  } else if (intent.includes('user') || description.includes('user') || intent.includes('signup')) {
    collections = ['users', 'sessions'];
    fields = {
      users: { id: 'string', email: 'string', roles: 'array', createdAt: 'timestamp' },
      sessions: { id: 'string', userId: 'ref:users', expiresAt: 'timestamp' }
    };
    notes.push('Păstrează minim PII; criptează câmpurile sensibile când e cazul.');
  } else {
    collections = ['items', 'logs'];
    fields = {
      items: { id: 'string', name: 'string', metadata: 'map' },
      logs: { id: 'string', level: 'string', message: 'string', ts: 'timestamp' }
    };
    notes.push('Design generic; rafinează după cerințe concrete.');
  }

  // Recomandări pentru rating/feedback
  if (description.includes('rate') || description.includes('rating') || description.includes('feedback')) {
    if (!collections.includes('reviews')) collections.push('reviews');
    fields.reviews = {
      id: 'string',
      targetId: 'string',
      rating: 'number (1-5)',
      comment: 'string',
      createdAt: 'timestamp'
    };
    notes.push('Adaugă câmp agregat `avgRating` pe documentele principale pentru citiri rapide.');
  }

  // Confidence și riscuri
  let confidence = 0.6;
  let risks = [];

  if (collections.includes('orders')) {
    confidence = 0.8;
    risks.push('Schimbările de status la orders necesită indexuri compuse.');
    risks.push('Referințele clientId/courierId trebuie sincronizate cu Auth.');
  }

  if (collections.length <= 2) {
    confidence = 0.5;
    risks.push('Design generic; posibil să nu acopere toate cazurile reale.');
  }

  // Construim analiza ca text coerent, lizibil
  const analysisParts = [];
  analysisParts.push(`Fallback rule-based design for intent: "${String(input.intent)}"`);
  analysisParts.push(`Detected intent: "${String(input.intent)}".`);
  analysisParts.push(`Selected collections: ${collections.join(', ')}.`);
  analysisParts.push('Design captured in `firestoreProposal` object (fallback mode).');

  const analysis = analysisParts.join(' ');

  return {
    assistant: 'admin',
    status: 'ok',
    confidence,
    risks,
    analysis,
    firestoreProposal: {
      collections,
      fields,
      notes
    }
  };
}
