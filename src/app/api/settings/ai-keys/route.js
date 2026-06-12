import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import { getRequestSession } from "@/lib/auth";

// ─── Helpers ────────────────────────────────────────────────────────────────

const ADMIN_ROLES = ["company_admin", "superadmin"];

function forbidden() {
  return NextResponse.json(
    { error: "Forbidden: Admin access required" },
    { status: 403 },
  );
}

/** Mask an API key for safe display: show last 4 chars only. */
function maskKey(key) {
  if (!key || key.length < 5) return key ? "••••" : "";
  return "••••••••" + key.slice(-4);
}

/**
 * Sanitize an upstream provider error into a safe, human-readable message.
 * Never exposes raw response bodies, headers, or stack traces to the client.
 */
function sanitizeProviderError(err, providerName) {
  const raw = err?.message || "";

  // Authentication / key errors
  if (
    raw.includes("401") ||
    raw.includes("Unauthorized") ||
    raw.includes("invalid") ||
    raw.includes("Invalid") ||
    raw.includes("authentication") ||
    raw.includes("API key")
  ) {
    return `${providerName} rejected the API key. Please verify it is correct and active.`;
  }

  // Rate limiting
  if (raw.includes("429") || raw.includes("rate") || raw.includes("quota")) {
    return `${providerName} rate limit reached. Please try again in a moment.`;
  }

  // Service unavailable
  if (
    raw.includes("503") ||
    raw.includes("502") ||
    raw.includes("UNAVAILABLE") ||
    raw.includes("overloaded")
  ) {
    return `${providerName} service is temporarily unavailable. Please try again later.`;
  }

  // Model not found
  if (raw.includes("404") || raw.includes("not found")) {
    return `${providerName} model endpoint not found. The model may have been deprecated or renamed.`;
  }

  // Network / timeout
  if (
    raw.includes("ECONNREFUSED") ||
    raw.includes("ENOTFOUND") ||
    raw.includes("timeout") ||
    raw.includes("ETIMEDOUT") ||
    raw.includes("fetch failed")
  ) {
    return `Unable to reach ${providerName} servers. Please check your network connection.`;
  }

  // Generic fallback — never leak the raw message
  return `${providerName} connection test failed. Please verify your API key and try again.`;
}

// ─── GET: Return masked keys + provider status ──────────────────────────────

export async function GET(request) {
  try {
    const { companyId, role } = getRequestSession(request);
    if (!companyId || !ADMIN_ROLES.includes(role)) {
      return forbidden();
    }

    await dbConnect();
    const company = await Company.findById(companyId).select("aiKeys").lean();
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const aiKeys = company.aiKeys || {};

    return NextResponse.json({
      providers: {
        gemini: {
          configured: !!aiKeys.gemini,
          maskedKey: maskKey(aiKeys.gemini),
        },
        openai: {
          configured: !!aiKeys.openai,
          maskedKey: maskKey(aiKeys.openai),
        },
        claude: {
          configured: !!aiKeys.claude,
          maskedKey: maskKey(aiKeys.claude),
        },
        nvidia: {
          configured: !!aiKeys.nvidia,
          maskedKey: maskKey(aiKeys.nvidia),
        },
      },
    });
  } catch (error) {
    console.error("AI Keys GET Error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve AI key configuration" },
      { status: 500 },
    );
  }
}

// ─── PUT: Save / update API keys ────────────────────────────────────────────

export async function PUT(request) {
  try {
    const { companyId, role } = getRequestSession(request);
    if (!companyId || !ADMIN_ROLES.includes(role)) {
      return forbidden();
    }

    await dbConnect();
    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const data = await request.json();
    const allowedProviders = ["gemini", "openai", "claude", "nvidia"];

    if (!company.aiKeys) {
      company.aiKeys = {};
    }

    let updatedCount = 0;
    for (const provider of allowedProviders) {
      const newKey = data[provider];
      // Skip if not provided or if placeholder mask was sent back unchanged
      if (newKey === undefined || newKey === null) continue;
      if (newKey.includes("••••")) continue;

      company.aiKeys[provider] = newKey.trim();
      updatedCount++;
    }

    if (updatedCount === 0) {
      return NextResponse.json(
        { error: "No valid API keys were provided to update." },
        { status: 400 },
      );
    }

    company.markModified("aiKeys");
    await company.save();

    return NextResponse.json({
      success: true,
      message: `Successfully updated ${updatedCount} API key(s).`,
      updatedCount,
    });
  } catch (error) {
    console.error("AI Keys PUT Error:", error);
    return NextResponse.json(
      { error: "Failed to save API keys" },
      { status: 500 },
    );
  }
}

// ─── POST: Test a specific provider's API key ───────────────────────────────

export async function POST(request) {
  try {
    const { companyId, role } = getRequestSession(request);
    if (!companyId || !ADMIN_ROLES.includes(role)) {
      return forbidden();
    }

    const { provider, apiKey: rawApiKey } = await request.json();

    if (!provider) {
      return NextResponse.json(
        { error: "Provider name is required." },
        { status: 400 },
      );
    }

    const allowedProviders = ["gemini", "openai", "claude", "nvidia"];
    if (!allowedProviders.includes(provider)) {
      return NextResponse.json(
        { error: `Unknown provider: "${provider}"` },
        { status: 400 },
      );
    }

    // If masked key or no key provided, fetch the saved key from DB
    let apiKey = rawApiKey;
    if (!apiKey || apiKey.includes("••••")) {
      await dbConnect();
      const company = await Company.findById(companyId).select("aiKeys").lean();
      apiKey = company?.aiKeys?.[provider];
      if (!apiKey) {
        return NextResponse.json(
          { error: `No saved API key found for ${provider}. Please enter and save a key first.` },
          { status: 400 },
        );
      }
    }

    let result;

    switch (provider) {
      case "gemini":
        result = await testGeminiKey(apiKey);
        break;
      case "openai":
        result = await testOpenAIKey(apiKey);
        break;
      case "claude":
        result = await testClaudeKey(apiKey);
        break;
      case "nvidia":
        result = await testNvidiaKey(apiKey);
        break;
      default:
        return NextResponse.json(
          { error: `Unknown provider: "${provider}"` },
          { status: 400 },
        );
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("AI Keys POST test error:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while testing the API key." },
      { status: 500 },
    );
  }
}

// ─── Provider Test Implementations ──────────────────────────────────────────

async function testGeminiKey(apiKey) {
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey });

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: "Reply with: OK" }] }],
    });

    const text =
      response.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
      "";
    return {
      success: true,
      provider: "gemini",
      message: "Gemini API key is valid and working.",
      response: text.substring(0, 100),
    };
  } catch (err) {
    return {
      success: false,
      provider: "gemini",
      message: sanitizeProviderError(err, "Gemini"),
    };
  }
}

async function testOpenAIKey(apiKey) {
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({ apiKey });

    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: "Reply with: OK" }],
      max_tokens: 10,
    });

    const text = completion.choices?.[0]?.message?.content || "";
    return {
      success: true,
      provider: "openai",
      message: "OpenAI API key is valid and working.",
      response: text.substring(0, 100),
    };
  } catch (err) {
    return {
      success: false,
      provider: "openai",
      message: sanitizeProviderError(err, "OpenAI"),
    };
  }
}

async function testClaudeKey(apiKey) {
  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 10,
        messages: [{ role: "user", content: "Reply with: OK" }],
      }),
    });

    if (!response.ok) {
      const status = response.status;
      if (status === 401) {
        throw new Error("401 Unauthorized");
      } else if (status === 429) {
        throw new Error("429 rate limit");
      } else if (status === 404) {
        throw new Error("404 not found");
      } else {
        throw new Error(`HTTP ${status}`);
      }
    }

    const data = await response.json();
    const text =
      data.content?.map((c) => c.text).join("") || "Connection successful";
    return {
      success: true,
      provider: "claude",
      message: "Claude API key is valid and working.",
      response: text.substring(0, 100),
    };
  } catch (err) {
    return {
      success: false,
      provider: "claude",
      message: sanitizeProviderError(err, "Claude"),
    };
  }
}

/**
 * Test NVIDIA NIM API key.
 * Translated from the user's Python reference code:
 *   - base_url = "https://integrate.api.nvidia.com/v1"
 *   - model = "nvidia/nemotron-3-ultra-550b-a55b"
 *   - Uses OpenAI-compatible SDK
 */
async function testNvidiaKey(apiKey) {
  try {
    const { default: OpenAI } = await import("openai");
    const client = new OpenAI({
      baseURL: "https://integrate.api.nvidia.com/v1",
      apiKey,
    });

    const completion = await client.chat.completions.create({
      model: "nvidia/nemotron-3-ultra-550b-a55b",
      messages: [{ role: "user", content: "Reply with: OK" }],
      max_tokens: 20,
      temperature: 0.5,
      top_p: 0.7,
      stream: false,
    });

    const text = completion.choices?.[0]?.message?.content || "";
    return {
      success: true,
      provider: "nvidia",
      message: "NVIDIA NIM API key is valid and working.",
      response: text.substring(0, 100),
    };
  } catch (err) {
    return {
      success: false,
      provider: "nvidia",
      message: sanitizeProviderError(err, "NVIDIA"),
    };
  }
}
