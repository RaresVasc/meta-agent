import * as admin from './assistants/admin.js';
import * as client from './assistants/client.js';
import * as curier from './assistants/curier.js';

export async function runMetaAgent({ intent, description }) {
  console.log('META-AGENT PORNIT');
  console.log('Intent:', intent);
  console.log('Descriere:', description);

  const payload = { intent, description, timestamp: new Date().toISOString() };

  const assistants = [
    { name: 'admin', fn: admin.handleTask },
    { name: 'client', fn: client.handleTask },
    { name: 'curier', fn: curier.handleTask }
  ];

  const tasks = assistants.map(a =>
    a.fn(payload)
      .then(res => ({ assistant: a.name, ok: true, result: res }))
      .catch(err => ({ assistant: a.name, ok: false, error: String(err) }))
  );

  const results = await Promise.all(tasks);

  // Structured output
  const output = { intent, description, results };
  console.log('\n--- Orchestration results ---');
  console.log(JSON.stringify(output, null, 2));

  return results;
}
