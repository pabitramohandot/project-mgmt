import { NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import GlobalSettings from '@/models/GlobalSettings';
import { getRequestSession } from '@/lib/auth';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function forbidden() {
  return NextResponse.json({ error: 'Forbidden: Superadmin access required' }, { status: 403 });
}

function maskKey(key) {
  if (!key || key.length < 5) return key ? '••••' : '';
  return '••••••••' + key.slice(-4);
}

function sanitizeProviderError(err, providerName) {
  const raw = err?.message || '';
  if (raw.includes('401') || raw.includes('Unauthorized') || raw.includes('invalid') || raw.includes('API key')) {
    return `${providerName} rejected the API key. Please verify it is correct and active.`;
  }
  if (raw.includes('429') || raw.includes('rate') || raw.includes('quota')) {
    return `${providerName} rate limit reached. Please try again in a moment.`;
  }
  if (raw.includes('503') || raw.includes('502') || raw.includes('UNAVAILABLE') || raw.includes('overloaded')) {
    return `${providerName} service is temporarily unavailable. Please try again later.`;
  }
  if (raw.includes('404') || raw.includes('not found')) {
    return `${providerName} model endpoint not found. The model may have been deprecated or renamed.`;
  }
  if (raw.includes('ECONNREFUSED') || raw.includes('ENOTFOUND') || raw.includes('timeout') || raw.includes('fetch failed')) {
    return `Unable to reach ${providerName} servers. Please check your network connection.`;
  }
  return `${providerName} connection test failed. Please verify your API key and try again.`;
}

async function getOrCreateSettings() {
  let settings = await GlobalSettings.findOne({ key: 'platform' });
  if (!settings) {
    settings = await GlobalSettings.create({ key: 'platform' });
  }
  return settings;
}

// ─── GET: Return masked keys + activeProvider ─────────────────────────────────

export async function GET(request) {
  try {
    const { role } = getRequestSession(request);
    if (role !== 'superadmin') return forbidden();

    await dbConnect();
    const settings = await getOrCreateSettings();
    const aiKeys = settings.aiKeys || {};

    return NextResponse.json({
      activeProvider: settings.activeProvider || 'gemini',
      providers: {
        gemini: { configured: !!aiKeys.gemini, maskedKey: maskKey(aiKeys.gemini) },
        openai: { configured: !!aiKeys.openai, maskedKey: maskKey(aiKeys.openai) },
        claude: { configured: !!aiKeys.claude, maskedKey: maskKey(aiKeys.claude) },
        nvidia: { configured: !!aiKeys.nvidia, maskedKey: maskKey(aiKeys.nvidia) },
      },
    });
  } catch (error) {
    console.error('AI Settings GET Error:', error);
    return NextResponse.json({ error: 'Failed to retrieve AI settings' }, { status: 500 });
  }
}

// ─── PUT: Save keys and/or switch activeProvider ─────────────────────────────

export async function PUT(request) {
  try {
    const { role } = getRequestSession(request);
    if (role !== 'superadmin') return forbidden();

    await dbConnect();
    const settings = await getOrCreateSettings();
    const data = await request.json();
    const allowedProviders = ['gemini', 'openai', 'claude', 'nvidia'];

    if (!settings.aiKeys) settings.aiKeys = {};

    // Switch active provider
    if (data.activeProvider && allowedProviders.includes(data.activeProvider)) {
      settings.activeProvider = data.activeProvider;
    }

    // Save keys (skip masked placeholders)
    let updatedCount = 0;
    for (const provider of allowedProviders) {
      const newKey = data[provider];
      if (newKey === undefined || newKey === null) continue;
      if (typeof newKey === 'string' && newKey.includes('••••')) continue;
      if (newKey.trim() === '') continue;
      settings.aiKeys[provider] = newKey.trim();
      updatedCount++;
    }

    settings.markModified('aiKeys');
    await settings.save();

    return NextResponse.json({
      success: true,
      message: data.activeProvider
        ? `Active provider switched to ${data.activeProvider}.`
        : `Updated ${updatedCount} API key(s).`,
      activeProvider: settings.activeProvider,
    });
  } catch (error) {
    console.error('AI Settings PUT Error:', error);
    return NextResponse.json({ error: 'Failed to save AI settings' }, { status: 500 });
  }
}

// ─── POST: Test a provider key ────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { role } = getRequestSession(request);
    if (role !== 'superadmin') return forbidden();

    const { provider, apiKey: rawApiKey } = await request.json();
    const allowedProviders = ['gemini', 'openai', 'claude', 'nvidia'];

    if (!provider || !allowedProviders.includes(provider)) {
      return NextResponse.json({ error: `Unknown provider: "${provider}"` }, { status: 400 });
    }

    let apiKey = rawApiKey;
    if (!apiKey || apiKey.includes('••••')) {
      await dbConnect();
      const settings = await getOrCreateSettings();
      apiKey = settings.aiKeys?.[provider];
      if (!apiKey) {
        return NextResponse.json(
          { error: `No saved API key found for ${provider}. Please enter and save a key first.` },
          { status: 400 }
        );
      }
    }

    switch (provider) {
      case 'gemini': return NextResponse.json(await testGeminiKey(apiKey));
      case 'openai': return NextResponse.json(await testOpenAIKey(apiKey));
      case 'claude': return NextResponse.json(await testClaudeKey(apiKey));
      case 'nvidia': return NextResponse.json(await testNvidiaKey(apiKey));
    }
  } catch (error) {
    console.error('AI Settings POST test error:', error);
    return NextResponse.json({ error: 'An unexpected error occurred while testing the API key.' }, { status: 500 });
  }
}

// ─── Provider Test Implementations ───────────────────────────────────────────

async function testGeminiKey(apiKey) {
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [{ role: 'user', parts: [{ text: 'Reply with: OK' }] }],
    });
    const text = response.candidates?.[0]?.content?.parts?.map((p) => p.text).join('') || '';
    return { success: true, provider: 'gemini', message: 'Gemini API key is valid and working.', response: text.substring(0, 100) };
  } catch (err) {
    return { success: false, provider: 'gemini', message: sanitizeProviderError(err, 'Gemini') };
  }
}

async function testOpenAIKey(apiKey) {
  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ apiKey });
    const completion = await client.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [{ role: 'user', content: 'Reply with: OK' }],
      max_tokens: 10,
    });
    const text = completion.choices?.[0]?.message?.content || '';
    return { success: true, provider: 'openai', message: 'OpenAI API key is valid and working.', response: text.substring(0, 100) };
  } catch (err) {
    return { success: false, provider: 'openai', message: sanitizeProviderError(err, 'OpenAI') };
  }
}

async function testClaudeKey(apiKey) {
  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': apiKey, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-sonnet-4-20250514', max_tokens: 10, messages: [{ role: 'user', content: 'Reply with: OK' }] }),
    });
    if (!response.ok) throw new Error(`${response.status}`);
    const data = await response.json();
    const text = data.content?.map((c) => c.text).join('') || 'Connection successful';
    return { success: true, provider: 'claude', message: 'Claude API key is valid and working.', response: text.substring(0, 100) };
  } catch (err) {
    return { success: false, provider: 'claude', message: sanitizeProviderError(err, 'Claude') };
  }
}

async function testNvidiaKey(apiKey) {
  try {
    const { default: OpenAI } = await import('openai');
    const client = new OpenAI({ baseURL: 'https://integrate.api.nvidia.com/v1', apiKey });
    const completion = await client.chat.completions.create({
      model: 'nvidia/llama-3.1-nemotron-ultra-253b-v1',
      messages: [{ role: 'user', content: 'Reply with: OK' }],
      max_tokens: 20,
      temperature: 0.5,
      top_p: 0.7,
      stream: false,
    });
    const text = completion.choices?.[0]?.message?.content || '';
    return { success: true, provider: 'nvidia', message: 'NVIDIA NIM API key is valid and working.', response: text.substring(0, 100) };
  } catch (err) {
    return { success: false, provider: 'nvidia', message: sanitizeProviderError(err, 'NVIDIA') };
  }
}

