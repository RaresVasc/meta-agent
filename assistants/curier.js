// Curier assistant: simulează un LLM local pentru planificare logistică și rute de livrare
// Exportă `handleTask(input)` care returnează planuri de livrare structurate, deterministe.

export async function handleTask(input) {
  // Construim un prompt intern clar
  const prompt = `Plan delivery routes and ETA for intent=${String(input.intent)} description=${String(input.description)}`;

  // Folosim o funcție locală deterministă pentru a genera planul
  const output = fakeLLM(prompt, input);
  return output;
}

// fakeLLM: determinist, rule-based, fără apeluri externe
function fakeLLM(prompt, input) {
  const intent = (input?.intent || '').toLowerCase();
  const description = (input?.description || '').toLowerCase();

  let orders = [];
  let routes = [];
  let eta = {};
  let notes = [];

  // Reguli simple, deterministe, orientate pe logistică și curier
  if (
    intent.includes('order') ||
    description.includes('order') ||
    description.includes('pickup') ||
    description.includes('deliver') ||
    intent.includes('delivery')
  ) {
    // Pentru comenzi de livrare: generam multiple ordine și rute
    orders = [
      { orderId: 'ORD001', priority: 'high', type: 'delivery', distance: '5.2km' },
      { orderId: 'ORD002', priority: 'medium', type: 'delivery', distance: '3.8km' }
    ];
    routes = [
      { routeId: 'RT01', stops: ['Hub', 'Pickup1', 'Dropoff1', 'Pickup2', 'Dropoff2'], totalDistance: '9km' },
      { routeId: 'RT02', stops: ['Hub', 'Pickup3', 'Dropoff3'], totalDistance: '7.5km' }
    ];
    eta = {
      'ORD001': '14:30',
      'ORD002': '15:45',
      averageDeliveryTime: '45 min'
    };
    notes.push('Prioritizează ordine cu timpi sensibili (same-day delivery).');
    notes.push('Grupeaza livrari în clustere geografice pentru eficiență.');
    notes.push('Valideaza adrese și disponibilitate ferestre orare.');
    notes.push('Calculeaza capacitate vehicul (greutate, volum) pe rută.');
    notes.push('Reasigneaza ordine dacă ETA se schimbă semnificativ.');
  } else if (intent.includes('user') || description.includes('user') || intent.includes('pickup')) {
    orders = [
      { orderId: 'USR001', priority: 'normal', type: 'pickup', distance: '2km' }
    ];
    routes = [
      { routeId: 'RT03', stops: ['Hub', 'PickupLocation', 'Hub'], totalDistance: '4km' }
    ];
    eta = {
      'USR001': '10:15',
      estimatedDuration: '20 min'
    };
    notes.push('Pickup simplu; confirma locație și ora cu clientul în avans.');
  } else {
    orders = [
      { orderId: 'GENERIC001', priority: 'normal', type: 'service', distance: 'TBD' }
    ];
    routes = [
      { routeId: 'RT00', stops: ['Hub', 'Location'], totalDistance: 'TBD' }
    ];
    eta = {
      'GENERIC001': 'On-demand',
      status: 'pending_details'
    };
    notes.push('Plan generic; specifica detalii concrete pe bază de comandă.');
  }

  // Adăugăm recomandări suplimentare dacă contextul menționează criterii specifice
  if (description.includes('urgent') || description.includes('rush')) {
    notes.push('Urgent flag: prioritate maximă, dedică curier exclusiv.');
    notes.push('Comunicare direct cu curier via SMS/push notification.');
  }

  if (description.includes('multiple') || description.includes('batch')) {
    notes.push('Batch delivery: agrementează cu clientul pentru livrare grupată.');
    notes.push('Reducere cost pe multipla livrare în aceeași zonă.');
  }

  // Considerații generale logistice
  notes.push('Verifica verificare live GPS și tracking real-time.');
  notes.push('Monitorizare de anomalii: întârzieri, rute neplanuate.');
  notes.push('Feedback curier: durata reală vs. ETA, blocaje, note.');

  // Construim analiza ca text coerent
  const analysisParts = [];
  analysisParts.push(`Prompt: ${prompt}`);
  analysisParts.push(`Detected intent: "${String(input.intent)}".`);
  analysisParts.push(`Planned ${orders.length} order(s) across ${routes.length} route(s).`);
  analysisParts.push('Route optimization and ETA mapping in `deliveryPlan` object.');

  const analysis = analysisParts.join(' ');

  return {
    assistant: 'curier',
    status: 'ok',
    analysis,
    deliveryPlan: {
      orders,
      routes,
      eta,
      notes
    }
  };
}
