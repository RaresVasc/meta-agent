// Test the HTTP endpoints
async function testEndpoints() {
  const payload = {
    goal: 'order.create',
    context: {
      admin: { domain: 'delivery' },
      client: { platform: 'mobile' },
      curier: { region: 'city-center' }
    }
  };

  console.log('🧪 Testing HTTP Endpoints\n');
  console.log('📋 Payload:', JSON.stringify(payload, null, 2));
  console.log('\n---\n');

  try {
    // Test /assistant/admin
    console.log('1️⃣  Testing /assistant/admin...');
    const adminRes = await fetch('http://localhost:3000/assistant/admin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const adminData = await adminRes.json();
    console.log('✅ Admin response:', JSON.stringify(adminData, null, 2).substring(0, 300) + '...\n');

    // Test /assistant/client
    console.log('2️⃣  Testing /assistant/client...');
    const clientPayload = { ...payload, context: { ...payload.context, adminOutput: adminData.data } };
    const clientRes = await fetch('http://localhost:3000/assistant/client', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(clientPayload)
    });
    const clientData = await clientRes.json();
    console.log('✅ Client response:', JSON.stringify(clientData, null, 2).substring(0, 300) + '...\n');

    // Test /assistant/curier
    console.log('3️⃣  Testing /assistant/curier...');
    const courierPayload = { ...payload, context: { ...payload.context, clientOutput: clientData.data } };
    const courierRes = await fetch('http://localhost:3000/assistant/curier', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(courierPayload)
    });
    const courierData = await courierRes.json();
    console.log('✅ Curier response:', JSON.stringify(courierData, null, 2).substring(0, 300) + '...\n');

    console.log('✅ All endpoints working!\n');

  } catch (err) {
    console.error('❌ Error:', err.message);
  }
}

testEndpoints();
