import { GoogleGenAI } from "@google/genai";
import { getRequestSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import GlobalSettings from "@/models/GlobalSettings";
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

// ─── System Instruction ───────────────────────────────────────────────────────

const systemInstruction =
  "You are the internal assistant for IONET, a project management & billing workspace. " +
  "You have access to tools for projects, clients, tasks, invoices, announcements, and feedback. " +
  "\n\n" +
  "TOKEN OPTIMIZATION / RESPONSE BREVITY:\n" +
  "Be extremely concise, brief, and direct. Keep all responses minimal to save API tokens. Avoid wordiness, greetings, repetitions, or explaining your logic/actions. Get straight to the point.\n" +
  "\n\n" +
  "CRITICAL RULE — TOOL USAGE: NEVER call any tool unless explicitly and clearly asked for data/action. " +
  "For greetings ('hi', 'hello', 'hey', 'good morning'), thanks, or small talk, respond conversationally with a brief sentence without calling any tool. " +
  "Do NOT proactively fetch data unless explicitly requested. " +
  "\n\n" +
  "REQUIRED PARAMETERS / CONVERSATIONAL GATHERING:\n" +
  "Before calling a write/creation tool, ensure all required parameters are provided. " +
  "If any required parameter is missing, DO NOT call the tool and DO NOT guess/hallucinate values; respond asking for the missing info. " +
  "Required parameters:\n" +
  "- createNewClient: name, email (e.g., if user says 'add client John', ask for his email before calling tool)\n" +
  "- createNewProject: name, clientName\n" +
  "- addProjectTask: projectName, taskName\n" +
  "- createNewInvoice: projectNameOrClientName, items (description, quantity, rate)\n" +
  "- updateProjectStatus: projectName, newStatus\n" +
  "- updateInvoiceStatus: invoiceNumber, newStatus\n" +
  "- broadcastAnnouncement: subject, message\n" +
  "- submitUserFeedback: type, description\n" +
  "\n\n" +
  "SECURITY & FORMATTING:\n" +
  "Never access/modify user credentials. " +
  "Format dates cleanly. Display lists in bullet points or markdown tables. " +
  "Always represent currency in Indian Rupees (₹). " +
  "If the user asks for a specific filtered list (e.g. 'active projects', 'unpaid invoices'), filter in memory and return ONLY those items.";

// ─── Gemini Tool Declarations ─────────────────────────────────────────────────

const geminiToolDeclarations = [
  {
    functionDeclarations: [
      { name: "getProjectStatus", description: "Retrieve status reports, tasks completed, timeline dates, and status updates for a project.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "The name of the project to look up." }, daysCount: { type: "INTEGER", description: "Number of days back to filter status updates (default is 30)." } }, required: ["projectName"] } },
      { name: "sendInvoiceToClient", description: "Search for an invoice and email it to the client. Uses Nodemailer.", parameters: { type: "OBJECT", properties: { clientNameOrEmail: { type: "STRING", description: "The name or email of the client to search invoices for." }, invoiceNumber: { type: "STRING", description: "The invoice number (e.g. INV-001) to search for directly." } } } },
      { name: "listProjects", description: "Retrieve a list of all projects in the workspace (including both active and completed ones).", parameters: { type: "OBJECT", properties: {} } },
      { name: "listInvoices", description: "Retrieve a list of all invoices in the workspace (including draft, sent, paid, and overdue statuses) with client name and associated project name.", parameters: { type: "OBJECT", properties: {} } },
      { name: "listExpiringItems", description: "Retrieve a list of domains or hosting services expiring in the next 60 days.", parameters: { type: "OBJECT", properties: {} } },
      { name: "createNewClient", description: "Register a new client contact profile.", parameters: { type: "OBJECT", properties: { name: { type: "STRING", description: "Client name." }, email: { type: "STRING", description: "Client email." }, phone: { type: "STRING", description: "Client phone number (optional)." }, company: { type: "STRING", description: "Client company name (optional)." }, address: { type: "STRING", description: "Client address (optional)." } }, required: ["name", "email"] } },
      { name: "createNewProject", description: "Create a new project in the workspace.", parameters: { type: "OBJECT", properties: { name: { type: "STRING", description: "Project name." }, description: { type: "STRING", description: "Project scope details." }, clientName: { type: "STRING", description: "Client contact name." }, clientEmail: { type: "STRING", description: "Client contact email (optional)." }, budget: { type: "NUMBER", description: "Project budget allocation (optional)." }, startDate: { type: "STRING", description: "Start date in YYYY-MM-DD format (optional)." }, endDate: { type: "STRING", description: "End date in YYYY-MM-DD format (optional)." } }, required: ["name", "clientName"] } },
      { name: "addProjectTask", description: "Add a new task item to a project.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "Project name." }, taskName: { type: "STRING", description: "Name of the task to add." } }, required: ["projectName", "taskName"] } },
      { name: "completeProjectTask", description: "Mark a task item as completed in a project.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "Project name." }, taskName: { type: "STRING", description: "Name of the task to mark as completed." } }, required: ["projectName", "taskName"] } },
      { name: "updateProjectStatus", description: "Update project status and message timeline.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "Project name." }, newStatus: { type: "STRING", description: "New status: Planning, In Progress, Under Review, Completed, or Pending." }, updateMessage: { type: "STRING", description: "Chronology update note message (optional)." } }, required: ["projectName", "newStatus"] } },
      { name: "createNewInvoice", description: "Generate a new invoice draft in the workspace.", parameters: { type: "OBJECT", properties: { projectNameOrClientName: { type: "STRING", description: "Associated project name or client name." }, items: { type: "ARRAY", description: "List of invoice line items.", items: { type: "OBJECT", properties: { description: { type: "STRING", description: "Item description." }, quantity: { type: "NUMBER", description: "Item quantity." }, rate: { type: "NUMBER", description: "Item billing rate." } }, required: ["description", "quantity", "rate"] } }, taxRate: { type: "NUMBER", description: "Tax percentage (optional)." }, discountRate: { type: "NUMBER", description: "Discount percentage (optional)." }, dueDate: { type: "STRING", description: "Due date in YYYY-MM-DD format (optional)." }, notes: { type: "STRING", description: "Payment terms or invoice notes (optional)." } }, required: ["projectNameOrClientName", "items"] } },
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

// ─── Tool Executor ────────────────────────────────────────────────────────────

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

// ─── SSE Helper ───────────────────────────────────────────────────────────────

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
        try {
          if (errorMsg.startsWith("{") || errorMsg.includes('"error"')) {
            const parsed = JSON.parse(errorMsg.substring(errorMsg.indexOf("{")));
            if (parsed.error?.message) errorMsg = parsed.error.message;
          }
        } catch { /* ignore */ }
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
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}

// ─── Provider: Gemini ─────────────────────────────────────────────────────────

async function handleGeminiStream(apiKey, message, history, companyId, userId, send) {
  const ai = new GoogleGenAI({ apiKey });
  const contents = [];
  for (const msg of history.slice(-4)) {
    contents.push({ role: msg.role === "assistant" ? "model" : "user", parts: [{ text: msg.text }] });
  }
  contents.push({ role: "user", parts: [{ text: message }] });

  let loopCount = 0;
  while (loopCount < 3) {
    loopCount++;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: { systemInstruction, tools: geminiToolDeclarations },
    });
    const parts = response.candidates?.[0]?.content?.parts || [];
    const functionCallPart = parts.find((p) => p.functionCall);
    if (functionCallPart) {
      const { name, args } = functionCallPart.functionCall;
      send("tool", { name });
      const toolResult = await executeToolCall(name, args, companyId, userId);
      contents.push({ role: "model", parts: [{ functionCall: { name, args } }] });
      contents.push({ role: "tool", parts: [{ functionResponse: { name, response: { result: toolResult } } }] });
      continue;
    }
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

// ─── Provider: OpenAI ─────────────────────────────────────────────────────────

async function handleOpenAIStream(apiKey, message, history, companyId, userId, send) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const messages = [
    { role: "system", content: systemInstruction },
    ...history.slice(-4).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
    { role: "user", content: message },
  ];

  let loopCount = 0;
  while (loopCount < 3) {
    loopCount++;
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
    const stream = await client.chat.completions.create({ model: "gpt-4o-mini", messages, stream: true });
    for await (const chunk of stream) {
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) send("token", { text });
    }
    break;
  }
}

// ─── Provider: Claude ─────────────────────────────────────────────────────────

async function handleClaudeStream(apiKey, message, history, companyId, userId, send) {
  const messagesPayload = [
    ...history.slice(-4).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
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
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err.error?.message || `Claude API error ${response.status}`);
    }
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buf = "";
    let hasToolUse = false;
    const toolUseBlocks = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split("\n");
      buf = lines.pop() || "";
      for (const line of lines) {
        try {
          if (line.startsWith("data: ")) {
            const event = JSON.parse(line.slice(6));
            if (event.type === "content_block_start" && event.content_block?.type === "tool_use") {
              toolUseBlocks.push({ id: event.content_block.id, name: event.content_block.name, input: "" });
              send("tool", { name: event.content_block.name });
            } else if (event.type === "content_block_delta" && event.delta?.type === "text_delta") {
              if (!hasToolUse) send("token", { text: event.delta.text });
            } else if (event.type === "content_block_delta" && event.delta?.type === "input_json_delta" && toolUseBlocks.length > 0) {
              toolUseBlocks[toolUseBlocks.length - 1].input += event.delta.partial_json || "";
            } else if (event.type === "message_delta" && event.delta?.stop_reason === "tool_use") {
              hasToolUse = true;
            }
          }
        } catch { /* skip */ }
      }
    }

    if (hasToolUse && toolUseBlocks.length > 0) {
      const assistantContent = toolUseBlocks.map((tb) => ({ type: "tool_use", id: tb.id, name: tb.name, input: JSON.parse(tb.input || "{}") }));
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

// ─── Provider: NVIDIA NIM ─────────────────────────────────────────────────────

async function handleNvidiaStream(apiKey, message, history, companyId, userId, send) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ baseURL: "https://integrate.api.nvidia.com/v1", apiKey });

  // meta/llama-3.1-70b-instruct is available on all NVIDIA NIM tiers including free
  // and has strong tool-calling support. Switch to nvidia/llama-3.1-nemotron-ultra-253b-v1
  // for paid/enterprise accounts with Nemotron access.
  const NVIDIA_MODEL = "meta/llama-3.1-70b-instruct";

  const messages = [
    { role: "system", content: systemInstruction },
    ...history.slice(-4).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
    { role: "user", content: message },
  ];

  let loopCount = 0;
  while (loopCount < 3) {
    loopCount++;
    const completion = await client.chat.completions.create({
      model: NVIDIA_MODEL,
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
    const stream = await client.chat.completions.create({
      model: NVIDIA_MODEL,
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

// ─── Main POST Handler ────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { companyId, userId } = getRequestSession(request);
    if (!companyId) {
      return NextResponse.json({ error: "Unauthorized. Company session is required." }, { status: 401 });
    }

    await dbConnect();

    // Read the platform-wide AI config set by the superadmin
    const settings = await GlobalSettings.findOne({ key: "platform" }).lean();

    // Resolve provider and key — DB config takes priority, env var is fallback only
    let selectedProvider = settings?.activeProvider || "gemini";
    let apiKey = settings?.aiKeys?.[selectedProvider] || "";

    // Fallback to GEMINI_API_KEY env var if DB has no key yet
    if (!apiKey && process.env.GEMINI_API_KEY) {
      apiKey = process.env.GEMINI_API_KEY;
      selectedProvider = "gemini";
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "The AI assistant is not configured yet. Please contact the platform administrator." },
        { status: 503 }
      );
    }

    const { message, history = [] } = await reqBody(request);
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

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
