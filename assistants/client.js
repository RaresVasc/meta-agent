// Client assistant: simulează un LLM local pentru planul de interacțiune cu clientul
// Exportă `handleTask(input)` care returnează obiecte UI/UX structurate, deterministe.

export async function handleTask(input) {
  // Construim un prompt intern clar
  const prompt = `Design client UX and interaction flow for intent=${String(input.intent)} description=${String(input.description)}`;

  // Folosim o funcție locală deterministă pentru a genera planul
  const output = fakeLLM(prompt, input);
  return output;
}

// fakeLLM: determinist, rule-based, fără apeluri externe
function fakeLLM(prompt, input) {
  const intent = (input?.intent || '').toLowerCase();
  const description = (input?.description || '').toLowerCase();

  let screens = [];
  let actions = [];
  let notes = [];

  // Reguli simple, deterministe, orientate pe UX/client
  if (
    intent.includes('order') ||
    description.includes('order') ||
    description.includes('pickup') ||
    description.includes('deliver') ||
    intent.includes('delivery')
  ) {
    screens = [
      'OrderCreation',
      'PickupDetails',
      'DropoffLocation',
      'PricingReview',
      'OrderConfirmation',
      'TrackingLive'
    ];
    actions = [
      'createOrder()',
      'selectPickupAddress()',
      'selectDropoffAddress()',
      'calculatePrice()',
      'confirmOrder()',
      'trackOrderRealTime()'
    ];
    notes.push('Rată de conversie: focalizează pe rapiditate și confirmare clară.');
    notes.push('Afișează prețul înainte de confirmare au explicit consent.');
    notes.push('Permite salvarea adreselor frecvente pentru ordine viitoare.');
    notes.push('Push notification: actualizări de status real-time.');
  } else if (intent.includes('user') || description.includes('user') || intent.includes('signup')) {
    screens = [
      'SignupForm',
      'EmailVerification',
      'ProfileSetup',
      'PaymentMethod',
      'Dashboard'
    ];
    actions = [
      'registerUser()',
      'verifyEmail()',
      'completeProfile()',
      'addPaymentMethod()',
      'navigateToDashboard()'
    ];
    notes.push('Implementează social login (Google, Facebook) pentru ușurință.');
    notes.push('Validare form în timp real; FX pe erori clare.');
    notes.push('Stochează preferințe și istoric comenzi.');
  } else {
    screens = [
      'Dashboard',
      'ListingPage',
      'DetailPage'
    ];
    actions = [
      'loadData()',
      'filterByCategory()',
      'viewDetails()',
      'goBack()'
    ];
    notes.push('Design generic; adaugă funcționalități specifice pe bază de feedback.');
  }

  // Adăugăm recomandări pentru review/rating
  if (description.includes('rate') || description.includes('rating') || description.includes('feedback')) {
    if (!screens.includes('ReviewScreen')) screens.push('ReviewScreen');
    if (!actions.includes('submitReview()')) actions.push('submitReview()');
    notes.push('Review form: 1-5 stars + comentariu opțional; submit ușor.');
  }

  // Ratinguri și recomandări mobile-first
  notes.push('Consider mobile-first: buttons mari, input simplu, minimize scrolling.');
  notes.push('Persist user session; oferă logout clar.');

  // Construim analiza ca text coerent
  const analysisParts = [];
  analysisParts.push(`Prompt: ${prompt}`);
  analysisParts.push(`Detected intent: "${String(input.intent)}".`);
  analysisParts.push(`Designed ${screens.length} screens for smooth user flow.`);
  analysisParts.push('Screen sequence and action mapping in `clientPlan` object.');

  const analysis = analysisParts.join(' ');

  return {
    assistant: 'client',
    status: 'ok',
    analysis,
    clientPlan: {
      screens,
      actions,
      notes
    }
  };
}
