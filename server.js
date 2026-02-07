import express from 'express';
import { handleTask as adminAssistant } from './assistants/admin.js';
import { handleTask as clientAssistant } from './assistants/client.js';
import { handleTask as courierAssistant } from './assistants/curier.js';
import dotenv from 'dotenv';

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// ============================================================================
// HTTP Endpoints exposing the 3 assistants for Cloudflare Worker to call
// ============================================================================

// POST /assistant/admin – Backend architect assistant
app.post('/assistant/admin', async (req, res) => {
  try {
    const { goal, context } = req.body;
    const input = { goal, ...context?.admin };
    
    const result = await adminAssistant(input);
    res.json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err.message
    });
  }
});

// POST /assistant/client – UX/interaction flow assistant
app.post('/assistant/client', async (req, res) => {
  try {
    const { goal, context } = req.body;
    // Use admin output as input for client
    const adminOutput = context?.adminOutput;
    const input = { goal, adminOutput, ...context?.client };
    
    const result = await clientAssistant(input);
    res.json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err.message
    });
  }
});

// POST /assistant/curier – Delivery routing assistant
app.post('/assistant/curier', async (req, res) => {
  try {
    const { goal, context } = req.body;
    // Use client output as input for curier
    const clientOutput = context?.clientOutput;
    const input = { goal, clientOutput, ...context?.curier };
    
    const result = await courierAssistant(input);
    res.json({
      status: 'ok',
      data: result
    });
  } catch (err) {
    res.status(500).json({
      status: 'error',
      error: err.message
    });
  }
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Server running' });
});

app.listen(PORT, () => {
  console.log(`🚀 Assistant HTTP Server running on http://localhost:${PORT}`);
  console.log(`   POST /assistant/admin – Backend architect`);
  console.log(`   POST /assistant/client – UX/interaction flow`);
  console.log(`   POST /assistant/curier – Delivery routing`);
});
