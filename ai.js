const config = require('./config');

// Runs a workflow. If an AI provider + key are configured, it calls the model.
// Otherwise it returns a safe, simulated result so the product is usable offline.
async function runWorkflow(workflow, user) {
  const cfg = workflow.config || {};
  const steps = Array.isArray(cfg.steps) ? cfg.steps : [];
  const prompt = cfg.prompt || workflow.description || workflow.name;

  const logs = [];
  logs.push(`[init] workflow "${workflow.name}" (id ${workflow.id})`);
  logs.push(`[trigger] ${cfg.trigger || 'manual'}`);
  steps.forEach((s, i) => logs.push(`[step ${i + 1}] ${s.label || s.type || 'action'} → ${s.detail || ''}`));

  if (config.aiProvider === 'none' || !config.aiApiKey) {
    logs.push('[ai] no provider configured — returning simulated output');
    await new Promise((r) => setTimeout(r, 350));
    return {
      ok: true,
      simulated: true,
      output:
        'This is a simulated run. Connect an AI provider (set AI_PROVIDER + AI_API_KEY in .env) to get real model output. ' +
        `Your workflow "${workflow.name}" has ${steps.length} step(s) and is ready to execute.`,
      logs,
      finishedAt: Date.now(),
    };
  }

  try {
    const messages = [
      { role: 'system', content: cfg.system || 'You are a helpful assistant executing a workflow.' },
      { role: 'user', content: prompt },
    ];
    const body = { model: config.aiModel, messages, temperature: 0.7 };
    const url = `${config.aiBaseUrl.replace(/\/$/, '')}/chat/completions`;
    const resp = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.aiApiKey}` },
      body: JSON.stringify(body),
    });
    if (!resp.ok) {
      const txt = await resp.text();
      logs.push(`[ai] error ${resp.status}: ${txt.slice(0, 200)}`);
      return { ok: false, simulated: false, error: `AI provider returned ${resp.status}`, logs, finishedAt: Date.now() };
    }
    const data = await resp.json();
    const text = data.choices && data.choices[0] && data.choices[0].message ? data.choices[0].message.content : '';
    logs.push('[ai] model responded');
    return { ok: true, simulated: false, output: text, logs, finishedAt: Date.now() };
  } catch (e) {
    logs.push(`[ai] exception: ${e.message}`);
    return { ok: false, simulated: false, error: e.message, logs, finishedAt: Date.now() };
  }
}

module.exports = { runWorkflow };
