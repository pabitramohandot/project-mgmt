import { GoogleGenAI } from "@google/genai";
import { getRequestSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import {
  getProjectStatusReport,
  sendInvoiceToClient,
  listWorkspaceProjects,
  listWorkspaceInvoices,
  listExpiringServices,
  createNewClient,
  createNewProject,
  addProjectTask,
  completeProjectTask,
  updateProjectStatus,
  createNewInvoice,
  updateInvoiceStatus,
  broadcastAnnouncement,
  submitUserFeedback,
  listAllFeedbacks,
  listAllClients,
} from "@/lib/aiTools";

// ─── System Instruction (shared across all providers) ────────────────────────

const systemInstruction =
  "You are the internal assistant for IONET, a project management and billing workspace. " +
  "You have access to tools that query or modify projects, client profiles, tasks, invoices, announcements, and feedback. " +
  "You MUST NOT access or modify user credentials (passwords, login URLs, etc.) under any circumstances. " +
  "When summarizing, format dates cleanly and display lists in bullet points or markdown tables. " +
  "Always represent currency/monetary amounts in Indian Rupees (₹) instead of dollars ($). " +
  "Always be professional, concise, and helpful. " +
  "IMPORTANT: If the user asks for a specific subset or filtered list (e.g., 'active projects' or 'unpaid/outstanding invoices'), " +
  "you must filter the results in memory and present ONLY the requested items to the user. " +
  "Do NOT list or mention completed projects, paid invoices, or other irrelevant items if they were not requested.";

// ─── Gemini Tool Declarations ────────────────────────────────────────────────

const geminiToolDeclarations = [
  {
    functionDeclarations: [
      {
        name: "getProjectStatus",
        description: "Retrieve status reports, tasks completed, timeline dates, and status updates for a project.",
        parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "The name of the project to look up." }, daysCount: { type: "INTEGER", description: "Number of days back to filter status updates (default is 30)." } }, required: ["projectName"] },
      },
      {
        name: "sendInvoiceToClient",
        description: "Search for an invoice and email it to the client. Uses Nodemailer.",
        parameters: { type: "OBJECT", properties: { clientNameOrEmail: { type: "STRING", description: "The name or email of the client to search invoices for." }, invoiceNumber: { type: "STRING", description: "The invoice number (e.g. INV-001) to search for directly." } } },
      },
      { name: "listProjects", description: "Retrieve a list of all projects in the workspace (including both active and completed ones).", parameters: { type: "OBJECT", properties: {} } },
      { name: "listInvoices", description: "Retrieve a list of all invoices in the workspace (including draft, sent, paid, and overdue statuses) with client name and associated project name.", parameters: { type: "OBJECT", properties: {} } },
      { name: "listExpiringItems", description: "Retrieve a list of domains or hosting services expiring in the next 60 days.", parameters: { type: "OBJECT", properties: {} } },
      {
        name: "createNewClient",
        description: "Register a new client contact profile.",
        parameters: { type: "OBJECT", properties: { name: { type: "STRING", description: "Client name." }, email: { type: "STRING", description: "Client email." }, phone: { type: "STRING", description: "Client phone number (optional)." }, company: { type: "STRING", description: "Client company name (optional)." }, address: { type: "STRING", description: "Client address (optional)." } }, required: ["name", "email"] },
      },
      {
        name: "createNewProject",
        description: "Create a new project in the workspace.",
        parameters: { type: "OBJECT", properties: { name: { type: "STRING", description: "Project name." }, description: { type: "STRING", description: "Project scope details." }, clientName: { type: "STRING", description: "Client contact name." }, clientEmail: { type: "STRING", description: "Client contact email (optional)." }, budget: { type: "NUMBER", description: "Project budget allocation (optional)." }, startDate: { type: "STRING", description: "Start date in YYYY-MM-DD format (optional)." }, endDate: { type: "STRING", description: "End date in YYYY-MM-DD format (optional)." } }, required: ["name", "clientName"] },
      },
      { name: "addProjectTask", description: "Add a new task item to a project.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "Project name." }, taskName: { type: "STRING", description: "Name of the task to add." } }, required: ["projectName", "taskName"] } },
      { name: "completeProjectTask", description: "Mark a task item as completed in a project.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "Project name." }, taskName: { type: "STRING", description: "Name of the task to mark as completed." } }, required: ["projectName", "taskName"] } },
      { name: "updateProjectStatus", description: "Update project status and message timeline.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "Project name." }, newStatus: { type: "STRING", description: "New status: Planning, In Progress, Under Review, Completed, or Pending." }, updateMessage: { type: "STRING", description: "Chronology update note message (optional)." } }, required: ["projectName", "newStatus"] } },
      {
        name: "createNewInvoice",
        description: "Generate a new invoice draft in the workspace.",
        parameters: { type: "OBJECT", properties: { projectNameOrClientName: { type: "STRING", description: "Associated project name or client name." }, items: { type: "ARRAY", description: "List of invoice line items.", items: { type: "OBJECT", properties: { description: { type: "STRING", description: "Item description." }, quantity: { type: "NUMBER", description: "Item quantity." }, rate: { type: "NUMBER", description: "Item billing rate." } }, required: ["description", "quantity", "rate"] } }, taxRate: { type: "NUMBER", description: "Tax percentage (optional)." }, discountRate: { type: "NUMBER", description: "Discount percentage (optional)." }, dueDate: { type: "STRING", description: "Due date in YYYY-MM-DD format (optional)." }, notes: { type: "STRING", description: "Payment terms or invoice notes (optional)." } }, required: ["projectNameOrClientName", "items"] },
      },
      { name: "updateInvoiceStatus", description: "Update the payment status of an invoice.", parameters: { type: "OBJECT", properties: { invoiceNumber: { type: "STRING", description: "Invoice number (e.g. INV-1001)." }, newStatus: { type: "STRING", description: "New status: Draft, Sent, Paid, or Overdue." } }, required: ["invoiceNumber", "newStatus"] } },
      { name: "broadcastAnnouncement", description: "Broadcast an announcement email to all client contacts.", parameters: { type: "OBJECT", properties: { subject: { type: "STRING", description: "Announcement subject line." }, message: { type: "STRING", description: "Body text content of the announcement." } }, required: ["subject", "message"] } },
      { name: "submitUserFeedback", description: "Submit bug reports or feature request tickets.", parameters: { type: "OBJECT", properties: { type: { type: "STRING", description: "Feedback type: 'bug' or 'feature'." }, description: { type: "STRING", description: "Feedback description details." }, pageUrl: { type: "STRING", description: "Page reference URL (optional)." } }, required: ["type", "description"] } },
      { name: "listAllFeedbacks", description: "Retrieve a list of all user feedback tickets.", parameters: { type: "OBJECT", properties: {} } },
      { name: "listAllClients", description: "Retrieve a list of all registered client contacts.", parameters: { type: "OBJECT", properties: {} } },
    ],
  },
];

// ─── OpenAI-format Tool Declarations (for OpenAI, NVIDIA) ────────────────────

function convertGeminiParamsToJsonSchema(params) {
  if (!params || !params.properties) return { type: "object", properties: {} };
  const props = {};
  for (const [key, val] of Object.entries(params.properties)) {
    props[key] = { type: val.type?.toLowerCase() || "string", description: val.description || "" };
    if (val.type === "ARRAY" && val.items) {
      props[key].items = convertGeminiParamsToJsonSchema(val.items);
    }
  }
  return { type: "object", properties: props, required: params.required || [] };
}

const openaiToolDeclarations = geminiToolDeclarations[0].functionDeclarations.map((fn) => ({
  type: "function",
  function: { name: fn.name, description: fn.description, parameters: convertGeminiParamsToJsonSchema(fn.parameters) },
}));

const claudeToolDeclarations = geminiToolDeclarations[0].functionDeclarations.map((fn) => ({
  name: fn.name,
  description: fn.description,
  input_schema: convertGeminiParamsToJsonSchema(fn.parameters),
}));

// ─── Tool Executor (shared across all providers) ─────────────────────────────

async function executeToolCall(name, args, companyId, userId) {
  switch (name) {
    case "getProjectStatus": return await getProjectStatusReport(args.projectName, args.daysCount || 30, companyId);
    case "sendInvoiceToClient": return await sendInvoiceToClient(args.clientNameOrEmail, args.invoiceNumber, companyId);
    case "listProjects": return await listWorkspaceProjects(companyId);
    case "listInvoices": return await listWorkspaceInvoices(companyId);
    case "listExpiringItems": return await listExpiringServices(companyId);
    case "createNewClient": return await createNewClient(args.name, args.email, args.phone, args.company, args.address, companyId);
    case "createNewProject": return await createNewProject(args.name, args.description, args.clientEmail, args.clientName, args.budget, args.startDate, args.endDate, companyId);
    case "addProjectTask": return await addProjectTask(args.projectName, args.taskName, companyId);
    case "completeProjectTask": return await completeProjectTask(args.projectName, args.taskName, companyId);
    case "updateProjectStatus": return await updateProjectStatus(args.projectName, args.newStatus, args.updateMessage, companyId);
    case "createNewInvoice": return await createNewInvoice(args.projectNameOrClientName, args.items, args.taxRate, args.discountRate, args.dueDate, args.notes, companyId);
    case "updateInvoiceStatus": return await updateInvoiceStatus(args.invoiceNumber, args.newStatus, companyId);
    case "broadcastAnnouncement": return await broadcastAnnouncement(args.subject, args.message, args.recipientType, companyId);
    case "submitUserFeedback": return await submitUserFeedback(args.type, args.description, args.pageUrl, companyId, userId);
    case "listAllFeedbacks": return await listAllFeedbacks(companyId);
    case "listAllClients": return await listAllClients(companyId);
    default: return { error: `Tool ${name} is not implemented.` };
  }
}

// ─── SSE Helper ──────────────────────────────────────────────────────────────

function createSSEStream(handler) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event, data) => {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };

      try {
        await handler(send);
        send("done", {});
      } catch (err) {
        console.error("SSE stream error:", err);
        let errorMsg = err.message || "Internal server error";

        // Parse Google API JSON error if possible
        try {
          if (errorMsg.startsWith("{") || errorMsg.includes('"error"')) {
            const jsonStart = errorMsg.indexOf("{");
            const parsed = JSON.parse(errorMsg.substring(jsonStart));
            if (parsed.error && parsed.error.message) errorMsg = parsed.error.message;
          }
        } catch (e) { /* ignore */ }

        if (errorMsg.includes("high demand") || errorMsg.includes("503") || errorMsg.includes("UNAVAILABLE")) {
          errorMsg = "The AI model is currently experiencing high demand. Please try again in a few seconds.";
        }

        send("error", { error: errorMsg });
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}

// ─── Provider: Gemini (Streaming) ────────────────────────────────────────────

async function handleGeminiStream(apiKey, message, history, companyId, userId, send) {
  const ai = new GoogleGenAI({ apiKey });

  const contents = [];
  for (const msg of history.slice(-6)) {
    contents.push({ role: msg.role === "assistant" ? "model" : "user", parts: [{ text: msg.text }] });
  }
  contents.push({ role: "user", parts: [{ text: message }] });

  let loopCount = 0;

  while (loopCount < 3) {
    loopCount++;

    // First, do a non-streaming call to check for tool calls
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: { systemInstruction, tools: geminiToolDeclarations },
    });

    const candidate = response.candidates?.[0];
    const parts = candidate?.content?.parts || [];
    const functionCallPart = parts.find((p) => p.functionCall);

    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;
      send("tool", { name });
      const toolResult = await executeToolCall(name, args, companyId, userId);
      contents.push({ role: "model", parts: [{ functionCall: { name, args } }] });
      contents.push({ role: "tool", parts: [{ functionResponse: { name, response: { result: toolResult } } }] });
      continue;
    }

    // No tool call — stream the final response
    const streamResponse = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: { systemInstruction },
    });

    for await (const chunk of streamResponse) {
      const text = chunk.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
      if (text) send("token", { text });
    }
    break;
  }
}

// ─── Provider: OpenAI (Streaming) ────────────────────────────────────────────

async function handleOpenAIStream(apiKey, message, history, companyId, userId, send) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });

  const messages = [
    { role: "system", content: systemInstruction },
    ...history.slice(-6).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
    { role: "user", content: message },
  ];

  let loopCount = 0;

  while (loopCount < 3) {
    loopCount++;

    // Check for tool calls with non-streaming first
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: openaiToolDeclarations,
      tool_choice: "auto",
    });

    const choice = completion.choices[0];

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      messages.push(choice.message);
      for (const toolCall of choice.message.tool_calls) {
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");
        send("tool", { name });
        const toolResult = await executeToolCall(name, args, companyId, userId);
        messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
      }
      continue;
    }

    // Stream the final response
    const stream = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      stream: true,
    });

    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) send("token", { text });
    }
    break;
  }
}

// ─── Provider: Claude (Streaming) ────────────────────────────────────────────

async function handleClaudeStream(apiKey, message, history, companyId, userId, send) {
  const messagesPayload = [
    ...history.slice(-6).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
    { role: "user", content: message },
  ];

  let loopCount = 0;

  while (loopCount < 3) {
    loopCount++;

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: systemInstruction,
        messages: messagesPayload,
        tools: claudeToolDeclarations,
        stream: true,
      }),
    });

    if (!response.ok) throw new Error(`Claude API returned HTTP ${response.status}`);

    // Parse SSE stream from Claude
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";
    let hasToolUse = false;
    let toolUseBlocks = [];
    let fullContent = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (data === "[DONE]") continue;

        try {
          const event = JSON.parse(data);

          if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
            hasToolUse = true;
            toolUseBlocks.push({ id: event.content_block.id, name: event.content_block.name, input: "" });
            send("tool", { name: event.content_block.name });
          } else if (event.type === "content_block_delta") {
            if (event.delta?.type === "text_delta" && event.delta.text) {
              send("token", { text: event.delta.text });
            } else if (event.delta?.type === "input_json_delta" && toolUseBlocks.length > 0) {
              toolUseBlocks[toolUseBlocks.length - 1].input += event.delta.partial_json || "";
            }
          } else if (event.type === "message_delta" && event.delta?.stop_reason === "tool_use") {
            hasToolUse = true;
          }
        } catch (e) { /* skip unparsable lines */ }
      }
    }

    if (hasToolUse && toolUseBlocks.length > 0) {
      // Build the assistant content from tool use blocks
      const assistantContent = toolUseBlocks.map((tb) => ({
        type: "tool_use",
        id: tb.id,
        name: tb.name,
        input: JSON.parse(tb.input || "{}"),
      }));
      messagesPayload.push({ role: "assistant", content: assistantContent });

      const toolResults = [];
      for (const tb of toolUseBlocks) {
        const toolResult = await executeToolCall(tb.name, JSON.parse(tb.input || "{}"), companyId, userId);
        toolResults.push({ type: "tool_result", tool_use_id: tb.id, content: JSON.stringify(toolResult) });
      }
      messagesPayload.push({ role: "user", content: toolResults });
      continue;
    }

    break;
  }
}

// ─── Provider: NVIDIA (Streaming) ────────────────────────────────────────────

async function handleNvidiaStream(apiKey, message, history, companyId, userId, send) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ baseURL: "https://integrate.api.nvidia.com/v1", apiKey });

  const messages = [
    { role: "system", content: systemInstruction },
    ...history.slice(-6).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
    { role: "user", content: message },
  ];

  let loopCount = 0;

  while (loopCount < 3) {
    loopCount++;

    // Non-streaming call to check for tool calls first
    const completion = await client.chat.completions.create({
      model: "nvidia/nemotron-3-ultra-550b-a55b",
      messages,
      tools: openaiToolDeclarations,
      tool_choice: "auto",
      temperature: 0.6,
      top_p: 0.9,
      max_tokens: 4096,
    });

    const choice = completion.choices[0];

    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      messages.push(choice.message);
      for (const toolCall of choice.message.tool_calls) {
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");
        send("tool", { name });
        const toolResult = await executeToolCall(name, args, companyId, userId);
        messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
      }
      continue;
    }

    // Stream the final response
    const stream = await client.chat.completions.create({
      model: "nvidia/nemotron-3-ultra-550b-a55b",
      messages,
      stream: true,
      temperature: 0.6,
      top_p: 0.9,
      max_tokens: 4096,
    });

    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) send("token", { text });
    }
    break;
  }
}

// ─── Main POST Handler (SSE Streaming) ──────────────────────────────────────

export async function POST(request) {
  try {
    const { companyId, userId } = getRequestSession(request);

    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized. Company session is required." }, { status: 401 });
    }

    await dbConnect();
    const company = await Company.findById(companyId).select("aiKeys").lean();
    const aiKeys = company?.aiKeys || {};

    const { message, history = [], provider = "auto" } = await reqBody(request);
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Determine provider
    let selectedProvider = provider;
    if (selectedProvider === "auto") {
      if (aiKeys.gemini) selectedProvider = "gemini";
      else if (aiKeys.openai) selectedProvider = "openai";
      else if (aiKeys.nvidia) selectedProvider = "nvidia";
      else if (aiKeys.claude) selectedProvider = "claude";
      else {
        return NextResponse.json({ error: "No AI API keys are configured. Please ask your admin to add one in Settings → AI Integrations." }, { status: 400 });
      }
    }

    const apiKey = aiKeys[selectedProvider];
    if (!apiKey) {
      return NextResponse.json({ error: `No API key configured for ${selectedProvider}. Please add it in Settings → AI Integrations.` }, { status: 400 });
    }

    // Return SSE stream
    return createSSEStream(async (send) => {
      send("start", { provider: selectedProvider });

      switch (selectedProvider) {
        case "gemini":
          await handleGeminiStream(apiKey, message, history, companyId, userId, send);
          break;
        case "openai":
          await handleOpenAIStream(apiKey, message, history, companyId, userId, send);
          break;
        case "claude":
          await handleClaudeStream(apiKey, message, history, companyId, userId, send);
          break;
        case "nvidia":
          await handleNvidiaStream(apiKey, message, history, companyId, userId, send);
          break;
        default:
          send("error", { error: `Unknown provider: "${selectedProvider}"` });
      }
    });
  } catch (error) {
    console.error("AI Chat Error:", error);
    return NextResponse.json({ error: error.message || "Internal server error" }, { status: 500 });
  }
}

async function reqBody(req) {
  try { return await req.json(); } catch { return {}; }
}
