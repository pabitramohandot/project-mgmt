import { GoogleGenAI } from "@google/genai";
import { getRequestSession } from "@/lib/auth";
import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import GlobalSettings from "@/models/GlobalSettings";
import ChatSession from "@/models/ChatSession";
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
  listSystemCompanies,
  getWorkspaceDetails,
  updateProjectDetails,
  updateProjectPricingBreakdown,
  updateClientDetails,
  listWorkspaceCredentials,
  createWorkspaceCredential,
  updateWorkspaceCredential,
  listProjectCredentials,
  addProjectCredential,
  listProjectCalendar,
  addCalendarItem,
  updateCalendarItem,
  updateWorkspaceDetails,
} from "@/lib/aiTools";

// ─── System Instruction ───────────────────────────────────────────────────────

const systemInstruction =
  "You are the internal assistant for IONET, a project management & billing workspace. " +
  "You have access to tools for projects, clients, tasks, invoices, announcements, feedback, credentials, and content calendars. " +
  "\n\n" +
  "TOKEN OPTIMIZATION / RESPONSE BREVITY:\n" +
  "Be extremely concise, brief, and direct. Keep all responses minimal to save API tokens. Avoid wordiness, greetings, repetitions, or explaining your logic/actions. Get straight to the point.\n" +
  "\n\n" +
  "CRITICAL RULE — TOOL USAGE: You MUST call the appropriate tool to retrieve data when the user asks about projects, clients, invoices, tasks, credentials, content calendar, or service expiry. Do NOT guess, assume, or hallucinate any pricing, budget, timeline, or task details. " +
  "For greetings ('hi', 'hello', 'hey', 'good morning'), thanks, or small talk, respond conversationally with a brief sentence without calling any tool. " +
  "\n\n" +
  "USER CONFIRMATION REQUIRED BEFORE WRITING:\n" +
  "For any action that modifies, updates, or creates data (e.g. creating projects, clients, invoices, credentials, content calendar posts, or updating details and pricing breakdowns), you MUST ALWAYS describe the parameters first and ask the user for explicit confirmation before invoking the write/creation tool. Do NOT invoke any creation or update tool without asking the user for confirmation first.\n" +
  "\n\n" +
  "REQUIRED PARAMETERS / CONVERSATIONAL GATHERING:\n" +
  "Before calling a write/creation tool, ensure the user has explicitly provided all the required details in the conversation. " +
  "If any required parameter is missing, DO NOT call the tool. You MUST NEVER guess, hallucinate, or auto-generate dummy/placeholder values (such as name 'Client' or email 'client@example.com') to satisfy the tool parameters. " +
  "Instead, respond by asking the user to provide the missing details (e.g., name, email, etc.). Ask questions properly so the user can fill them in.\n" +
  "For createNewClient, you must ALSO ask the user if they want to provide optional details (phone number, company name, and address), letting them know they can say 'skip' to skip those optional details.\n" +
  "If a creation or modification tool returns an error (e.g. client already exists), report only that error directly to the user. Do NOT query other tools (like listAllClients) to list existing data unless explicitly requested.\n" +
  "Required parameters:\n" +
  "- createNewClient: name, email\n" +
  "- createNewProject: name, clientName\n" +
  "- addProjectTask: projectName, taskName\n" +
  "- createNewInvoice: projectNameOrClientName, items (description, quantity, rate)\n" +
  "- updateProjectStatus: projectName, newStatus\n" +
  "- updateInvoiceStatus: invoiceNumber, newStatus\n" +
  "- broadcastAnnouncement: subject, message\n" +
  "- submitUserFeedback: type, description\n" +
  "- createWorkspaceCredential: title\n" +
  "- addProjectCredential: projectName, type, label\n" +
  "- addCalendarItem: projectName, month, scheduledDate\n" +
  "\n\n" +
  "SECURITY & FORMATTING:\n" +
  "Never access/modify user login account passwords. " +
  "Format dates cleanly. Display lists in bullet points or markdown tables. " +
  "Always represent currency in Indian Rupees (₹). " +
  "If the user asks for a specific filtered list (e.g. 'active projects', 'unpaid invoices', or projects of a specific category/subcategory), filter in memory and return ONLY those items.";

// ─── Gemini Tool Declarations ─────────────────────────────────────────────────

const geminiToolDeclarations = [
  {
    functionDeclarations: [
      { name: "getProjectStatus", description: "Retrieve status reports, budget, quote and final pricing, tasks completed, timeline dates, and status updates for a project.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "The name of the project to look up." }, daysCount: { type: "INTEGER", description: "Number of days back to filter status updates (default is 30)." } }, required: ["projectName"] } },
      { name: "sendInvoiceToClient", description: "Search for an invoice and email it to the client. Uses Nodemailer.", parameters: { type: "OBJECT", properties: { clientNameOrEmail: { type: "STRING", description: "The name or email of the client to search invoices for." }, invoiceNumber: { type: "STRING", description: "The invoice number (e.g. INV-001) to search for directly." } } } },
      { name: "listProjects", description: "Retrieve a list of all projects in the workspace (including names, client names, statuses, budget, projectType, and subcategories).", parameters: { type: "OBJECT", properties: {} } },
      { name: "listInvoices", description: "Retrieve a list of all invoices in the workspace (including draft, sent, paid, and overdue statuses) with client name and associated project name.", parameters: { type: "OBJECT", properties: {} } },
      { name: "listExpiringItems", description: "Retrieve a list of domains or hosting services expiring in the next 60 days.", parameters: { type: "OBJECT", properties: {} } },
      { name: "createNewClient", description: "Register a new client contact profile. Do NOT call this tool with dummy, placeholder, or auto-generated values.", parameters: { type: "OBJECT", properties: { name: { type: "STRING", description: "The actual client name provided by the user. Do NOT use placeholder values." }, email: { type: "STRING", description: "The actual client email address provided by the user. Do NOT use placeholder values." }, phone: { type: "STRING", description: "Client phone number (optional)." }, company: { type: "STRING", description: "Client company name (optional)." }, address: { type: "STRING", description: "Client address (optional)." } }, required: ["name", "email"] } },
      { name: "createNewProject", description: "Create a new project in the workspace. Do NOT call this tool with dummy, placeholder, or auto-generated values.", parameters: { type: "OBJECT", properties: { name: { type: "STRING", description: "Project name (MUST be provided by user, do NOT use placeholders)." }, description: { type: "STRING", description: "Project scope details." }, clientName: { type: "STRING", description: "Client contact name (MUST be provided by user, do NOT use placeholders)." }, clientEmail: { type: "STRING", description: "Client contact email (optional)." }, budget: { type: "NUMBER", description: "Project budget allocation (optional)." }, startDate: { type: "STRING", description: "Start date in YYYY-MM-DD format (optional)." }, endDate: { type: "STRING", description: "End date in YYYY-MM-DD format (optional)." } }, required: ["name", "clientName"] } },
      { name: "addProjectTask", description: "Add a new task item to a project.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "Project name." }, taskName: { type: "STRING", description: "Name of the task to add." } }, required: ["projectName", "taskName"] } },
      { name: "completeProjectTask", description: "Mark a task item as completed in a project.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "Project name." }, taskName: { type: "STRING", description: "Name of the task to mark as completed." } }, required: ["projectName", "taskName"] } },
      { name: "updateProjectStatus", description: "Update project status and message timeline.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "Project name." }, newStatus: { type: "STRING", description: "New status: Planning, In Progress, Under Review, Completed, or Pending." }, updateMessage: { type: "STRING", description: "Chronology update note message (optional)." } }, required: ["projectName", "newStatus"] } },
      { name: "createNewInvoice", description: "Generate a new invoice draft in the workspace. Do NOT call this tool with dummy, placeholder, or auto-generated values.", parameters: { type: "OBJECT", properties: { projectNameOrClientName: { type: "STRING", description: "Associated project name or client name (MUST be provided by user, do NOT use placeholders)." }, items: { type: "ARRAY", description: "List of invoice line items.", items: { type: "OBJECT", properties: { description: { type: "STRING", description: "Item description." }, quantity: { type: "NUMBER", description: "Item quantity." }, rate: { type: "NUMBER", description: "Item billing rate." } }, required: ["description", "quantity", "rate"] } }, taxRate: { type: "NUMBER", description: "Tax percentage (optional)." }, discountRate: { type: "NUMBER", description: "Discount percentage (optional)." }, dueDate: { type: "STRING", description: "Due date in YYYY-MM-DD format (optional)." }, notes: { type: "STRING", description: "Payment terms or invoice notes (optional)." } }, required: ["projectNameOrClientName", "items"] } },
      { name: "updateInvoiceStatus", description: "Update the payment status of an invoice.", parameters: { type: "OBJECT", properties: { invoiceNumber: { type: "STRING", description: "Invoice number (e.g. INV-1001)." }, newStatus: { type: "STRING", description: "New status: Draft, Sent, Paid, or Overdue." } }, required: ["invoiceNumber", "newStatus"] } },
      { name: "broadcastAnnouncement", description: "Broadcast an announcement email to all client contacts.", parameters: { type: "OBJECT", properties: { subject: { type: "STRING", description: "Announcement subject line." }, message: { type: "STRING", description: "Body text content of the announcement." } }, required: ["subject", "message"] } },
      { name: "submitUserFeedback", description: "Submit bug reports or feature request tickets.", parameters: { type: "OBJECT", properties: { type: { type: "STRING", description: "Feedback type: 'bug' or 'feature'." }, description: { type: "STRING", description: "Feedback description details." }, pageUrl: { type: "STRING", description: "Page reference URL (optional)." } }, required: ["type", "description"] } },
      { name: "listAllFeedbacks", description: "Retrieve a list of all user feedback tickets.", parameters: { type: "OBJECT", properties: {} } },
      { name: "listAllClients", description: "Retrieve a list of all registered client contacts.", parameters: { type: "OBJECT", properties: {} } },
      { name: "listSystemCompanies", description: "Retrieve a list of all registered companies/tenant platforms on the system. Accessible ONLY to Superadmins.", parameters: { type: "OBJECT", properties: {} } },
      { name: "getWorkspaceDetails", description: "Retrieve the current tenant company's workspace platform settings (name, slug, tagline, brand colors, contact email).", parameters: { type: "OBJECT", properties: {} } },
      { name: "updateProjectDetails", description: "Modify basic details of a project (e.g. name, description, projectType, subcategories, start/end dates, hosting/domain expiry).", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "Name of the project." }, updates: { type: "OBJECT", description: "Fields to update.", properties: { name: { type: "STRING" }, description: { type: "STRING" }, projectType: { type: "ARRAY", items: { type: "STRING" } }, subcategories: { type: "ARRAY", items: { type: "STRING" } }, startDate: { type: "STRING", description: "YYYY-MM-DD" }, endDate: { type: "STRING", description: "YYYY-MM-DD" }, hostingExpiry: { type: "STRING", description: "YYYY-MM-DD" }, domainExpiry: { type: "STRING", description: "YYYY-MM-DD" } } } }, required: ["projectName", "updates"] } },
      { name: "updateProjectPricingBreakdown", description: "Update specific pricing breakdown fields (hosting, domain, development, marketing, ads, design, budget, quotePrice) for a project, with final price automatically summed.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "Name of the project." }, pricing: { type: "OBJECT", description: "Pricing breakdown fields to set.", properties: { hostingPrice: { type: "NUMBER" }, domainPrice: { type: "NUMBER" }, devPrice: { type: "NUMBER" }, marketingPrice: { type: "NUMBER" }, adsPrice: { type: "NUMBER" }, designPrice: { type: "NUMBER" }, budget: { type: "NUMBER" }, quotePrice: { type: "NUMBER" } } } }, required: ["projectName", "pricing"] } },
      { name: "updateClientDetails", description: "Modify contact details of a client.", parameters: { type: "OBJECT", properties: { clientNameOrEmail: { type: "STRING", description: "Name or email of the client." }, updates: { type: "OBJECT", description: "Fields to update.", properties: { name: { type: "STRING" }, email: { type: "STRING" }, phone: { type: "STRING" }, company: { type: "STRING" }, address: { type: "STRING" } } } }, required: ["clientNameOrEmail", "updates"] } },
      { name: "listWorkspaceCredentials", description: "List all standalone credentials stored in the workspace.", parameters: { type: "OBJECT", properties: {} } },
      { name: "createWorkspaceCredential", description: "Create a new standalone credential in the workspace.", parameters: { type: "OBJECT", properties: { title: { type: "STRING", description: "Credential title/label." }, username: { type: "STRING" }, password: { type: "STRING" }, url: { type: "STRING" }, notes: { type: "STRING" } }, required: ["title"] } },
      { name: "updateWorkspaceCredential", description: "Update an existing standalone credential in the workspace.", parameters: { type: "OBJECT", properties: { titleOrId: { type: "STRING", description: "Title or ID of the credential." }, updates: { type: "OBJECT", description: "Fields to update.", properties: { title: { type: "STRING" }, username: { type: "STRING" }, password: { type: "STRING" }, url: { type: "STRING" }, notes: { type: "STRING" } } } }, required: ["titleOrId", "updates"] } },
      { name: "listProjectCredentials", description: "List all credentials nested inside a specific project.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING", description: "Project name." } }, required: ["projectName"] } },
      { name: "addProjectCredential", description: "Add a credential (Hosting, Domain, etc.) to a project.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING" }, type: { type: "STRING", description: "Hosting, Domain, or Other" }, label: { type: "STRING", description: "Label/service name." }, username: { type: "STRING" }, password: { type: "STRING" }, loginUrl: { type: "STRING" }, notes: { type: "STRING" } }, required: ["projectName", "type", "label"] } },
      { name: "listProjectCalendar", description: "List all items in the content calendar of a project.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING" } }, required: ["projectName"] } },
      { name: "addCalendarItem", description: "Add a post item to a project's content calendar.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING" }, month: { type: "STRING", description: "Month name (e.g. June)" }, scheduledDate: { type: "STRING", description: "YYYY-MM-DD" }, postType: { type: "STRING", description: "Static, Motion, Reel, Carousel, Motion Graphic Wish Post, or Wish post" }, topic: { type: "STRING" }, content: { type: "STRING" }, hashtags: { type: "STRING" }, platforms: { type: "ARRAY", items: { type: "STRING" }, description: "Social platforms (e.g. Instagram, Facebook)" }, status: { type: "STRING", description: "Pending, Design Done, Design Approved, Posted, Draft, or Approved" } }, required: ["projectName", "month", "scheduledDate"] } },
      { name: "updateCalendarItem", description: "Update a content calendar item inside a project.", parameters: { type: "OBJECT", properties: { projectName: { type: "STRING" }, itemId: { type: "STRING", description: "ID of the calendar item." }, updates: { type: "OBJECT", description: "Fields to update.", properties: { month: { type: "STRING" }, scheduledDate: { type: "STRING", description: "YYYY-MM-DD" }, postType: { type: "STRING" }, topic: { type: "STRING" }, content: { type: "STRING" }, hashtags: { type: "STRING" }, platforms: { type: "ARRAY", items: { type: "STRING" } }, status: { type: "STRING" } } } }, required: ["projectName", "itemId", "updates"] } },
      { name: "updateWorkspaceDetails", description: "Update current workspace company details.", parameters: { type: "OBJECT", properties: { updates: { type: "OBJECT", description: "Workspace updates.", properties: { name: { type: "STRING" }, tagline: { type: "STRING" }, contactEmail: { type: "STRING" }, brandColors: { type: "OBJECT", properties: { primary: { type: "STRING" }, secondary: { type: "STRING" } } } } } }, required: ["updates"] } },
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

// ─── Dynamic Tools & Prompts Helpers By Role ───────────────────────────────

function getSystemInstructionForRole(role) {
  let instruction = systemInstruction;
  if (role === "superadmin") {
    instruction += "\n\nSECURITY ROLE: SUPERADMIN\nYou are acting as a Superadmin. You have access to listSystemCompanies to query, count, or list all registered companies on the platform. When the user asks about the number of companies or list of active companies, use listSystemCompanies to retrieve the correct database answer.";
  } else {
    instruction += "\n\nSECURITY ROLE: TENANT USER\nYou are acting as a tenant company representative. You have NO permission or ability to access other companies or list platform-wide companies. The listSystemCompanies tool is strictly hidden from your schema. If asked about platform-wide companies, tell the user you do not have permission, but offer to describe their own workspace details using getWorkspaceDetails.";
  }
  return instruction;
}

function getGeminiToolsForRole(role) {
  const list = geminiToolDeclarations[0].functionDeclarations;
  if (role === "superadmin") {
    return geminiToolDeclarations;
  }
  return [
    {
      functionDeclarations: list.filter((fn) => fn.name !== "listSystemCompanies"),
    },
  ];
}

function getOpenAIToolsForRole(role) {
  if (role === "superadmin") {
    return openaiToolDeclarations;
  }
  return openaiToolDeclarations.filter((t) => t.function.name !== "listSystemCompanies");
}

function getClaudeToolsForRole(role) {
  if (role === "superadmin") {
    return claudeToolDeclarations;
  }
  return claudeToolDeclarations.filter((t) => t.name !== "listSystemCompanies");
}

// ─── Tool Executor ────────────────────────────────────────────────────────────

async function executeToolCall(name, args, companyId, userId, role) {
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
    case "listSystemCompanies":
      if (role !== "superadmin") {
        return { error: "Unauthorized. Only Superadmins can query registered companies." };
      }
      return await listSystemCompanies();
    case "getWorkspaceDetails":
      return await getWorkspaceDetails(companyId);
    case "updateProjectDetails":
      return await updateProjectDetails(args.projectName, args.updates, companyId);
    case "updateProjectPricingBreakdown":
      return await updateProjectPricingBreakdown(args.projectName, args.pricing, companyId);
    case "updateClientDetails":
      return await updateClientDetails(args.clientNameOrEmail, args.updates, companyId);
    case "listWorkspaceCredentials":
      return await listWorkspaceCredentials(companyId);
    case "createWorkspaceCredential":
      return await createWorkspaceCredential(args.title, args.username, args.password, args.url, args.notes, companyId);
    case "updateWorkspaceCredential":
      return await updateWorkspaceCredential(args.titleOrId, args.updates, companyId);
    case "listProjectCredentials":
      return await listProjectCredentials(args.projectName, companyId);
    case "addProjectCredential":
      return await addProjectCredential(args.projectName, args.type, args.label, args.username, args.password, args.loginUrl, args.notes, companyId);
    case "listProjectCalendar":
      return await listProjectCalendar(args.projectName, companyId);
    case "addCalendarItem":
      return await addCalendarItem(args.projectName, args.month, args.scheduledDate, args.postType, args.topic, args.content, args.hashtags, args.platforms, args.status, companyId);
    case "updateCalendarItem":
      return await updateCalendarItem(args.projectName, args.itemId, args.updates, companyId);
    case "updateWorkspaceDetails":
      return await updateWorkspaceDetails(companyId, args.updates);
    default: return { error: `Tool ${name} is not implemented.` };
  }
}

// ─── SSE Helper ───────────────────────────────────────────────────────────────

function createSSEStream(handler) {
  const encoder = new TextEncoder();
  let isCancelled = false;
  const stream = new ReadableStream({
    async start(controller) {
      const send = (event, data) => {
        if (isCancelled) return;
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`));
      };
      try {
        await handler(send, () => isCancelled);
        if (!isCancelled) {
          send("done", {});
        }
      } catch (err) {
        if (!isCancelled) {
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
        }
      } finally {
        controller.close();
      }
    },
    cancel() {
      isCancelled = true;
    }
  });
  return new Response(stream, {
    headers: { "Content-Type": "text/event-stream", "Cache-Control": "no-cache, no-transform", Connection: "keep-alive" },
  });
}

// ─── Provider: Gemini ─────────────────────────────────────────────────────────

async function handleGeminiStream(apiKey, sessionId, message, history, companyId, userId, role, send, isAborted) {
  const ai = new GoogleGenAI({ apiKey });
  const contents = [];
  for (const msg of history.slice(-4)) {
    contents.push({ role: msg.role === "assistant" ? "model" : "user", parts: [{ text: msg.text }] });
  }
  contents.push({ role: "user", parts: [{ text: message }] });

  const roleInstruction = getSystemInstructionForRole(role);
  const roleTools = getGeminiToolsForRole(role);

  let fullText = "";
  let loopCount = 0;
  while (loopCount < 3) {
    if (isAborted()) break;
    loopCount++;
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents,
      config: { systemInstruction: roleInstruction, tools: roleTools },
    });
    const parts = response.candidates?.[0]?.content?.parts || [];
    const functionCallPart = parts.find((p) => p.functionCall);
    if (functionCallPart) {
      if (isAborted()) break;
      const { name, args } = functionCallPart.functionCall;
      send("tool", { name });
      const toolResult = await executeToolCall(name, args, companyId, userId, role);
      contents.push({ role: "model", parts: [{ functionCall: { name, args } }] });
      contents.push({ role: "tool", parts: [{ functionResponse: { name, response: { result: toolResult } } }] });
      continue;
    }

    // If not a tool call and text was generated, send it directly and end
    const text = response.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    if (text) {
      fullText = text;
      try {
        send("token", { text });
      } catch (e) {
        // Client disconnected
      }
      break;
    }

    if (isAborted()) break;
    const streamResponse = await ai.models.generateContentStream({
      model: "gemini-2.5-flash",
      contents,
      config: { systemInstruction: roleInstruction, tools: roleTools },
    });
    for await (const chunk of streamResponse) {
      if (isAborted()) break;
      const text = chunk.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
      if (text) {
        fullText += text;
        try {
          send("token", { text });
        } catch (e) {
          // Client disconnected
        }
      }
    }
    break;
  }

  // Save response to DB session only if not empty and not aborted
  if (fullText.trim() && !isAborted()) {
    try {
      await ChatSession.findByIdAndUpdate(sessionId, {
        $push: { messages: { role: "assistant", text: fullText } }
      });
    } catch (dbErr) {
      console.error("Failed to save Gemini response to database session:", dbErr);
    }
  }
}

// ─── Provider: OpenAI ─────────────────────────────────────────────────────────

async function handleOpenAIStream(apiKey, sessionId, message, history, companyId, userId, role, send, isAborted) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ apiKey });
  const messages = [
    { role: "system", content: getSystemInstructionForRole(role) },
    ...history.slice(-4).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
    { role: "user", content: message },
  ];

  const roleTools = getOpenAIToolsForRole(role);

  let fullText = "";
  let loopCount = 0;
  while (loopCount < 3) {
    if (isAborted()) break;
    loopCount++;
    const completion = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: roleTools.length > 0 ? roleTools : undefined,
      tool_choice: roleTools.length > 0 ? "auto" : undefined,
    });
    const choice = completion.choices[0];
    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      if (isAborted()) break;
      messages.push(choice.message);
      for (const toolCall of choice.message.tool_calls) {
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");
        send("tool", { name });
        const toolResult = await executeToolCall(name, args, companyId, userId, role);
        messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
      }
      continue;
    }
    if (isAborted()) break;
    const stream = await client.chat.completions.create({ model: "gpt-4o-mini", messages, stream: true });
    for await (const chunk of stream) {
      if (isAborted()) break;
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) {
        fullText += text;
        try {
          send("token", { text });
        } catch (e) {
          // Client disconnected
        }
      }
    }
    break;
  }

  // Save response to DB session only if not empty and not aborted
  if (fullText.trim() && !isAborted()) {
    try {
      await ChatSession.findByIdAndUpdate(sessionId, {
        $push: { messages: { role: "assistant", text: fullText } }
      });
    } catch (dbErr) {
      console.error("Failed to save OpenAI response to database session:", dbErr);
    }
  }
}

// ─── Provider: Claude ─────────────────────────────────────────────────────────

async function handleClaudeStream(apiKey, sessionId, message, history, companyId, userId, role, send, isAborted) {
  const messagesPayload = [
    ...history.slice(-4).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
    { role: "user", content: message },
  ];

  const roleInstruction = getSystemInstructionForRole(role);
  const roleTools = getClaudeToolsForRole(role);

  let fullText = "";
  let loopCount = 0;
  while (loopCount < 3) {
    if (isAborted()) break;
    loopCount++;
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 4096,
        system: roleInstruction,
        messages: messagesPayload,
        tools: roleTools.length > 0 ? roleTools : undefined,
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
      if (isAborted()) break;
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
              if (!hasToolUse) {
                fullText += event.delta.text;
                try {
                  send("token", { text: event.delta.text });
                } catch (e) {
                  // Client disconnected
                }
              }
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
      if (isAborted()) break;
      const assistantContent = toolUseBlocks.map((tb) => ({ type: "tool_use", id: tb.id, name: tb.name, input: JSON.parse(tb.input || "{}") }));
      messagesPayload.push({ role: "assistant", content: assistantContent });
      const toolResults = [];
      for (const tb of toolUseBlocks) {
        const toolResult = await executeToolCall(tb.name, JSON.parse(tb.input || "{}"), companyId, userId, role);
        toolResults.push({ type: "tool_result", tool_use_id: tb.id, content: JSON.stringify(toolResult) });
      }
      messagesPayload.push({ role: "user", content: toolResults });
      continue;
    }
    break;
  }

  // Save response to DB session only if not empty and not aborted
  if (fullText.trim() && !isAborted()) {
    try {
      await ChatSession.findByIdAndUpdate(sessionId, {
        $push: { messages: { role: "assistant", text: fullText } }
      });
    } catch (dbErr) {
      console.error("Failed to save Claude response to database session:", dbErr);
    }
  }
}

// ─── Provider: NVIDIA NIM ─────────────────────────────────────────────────────

async function handleNvidiaStream(apiKey, sessionId, message, history, companyId, userId, role, send, isAborted) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ baseURL: "https://integrate.api.nvidia.com/v1", apiKey });

  // meta/llama-3.1-70b-instruct is available on all NVIDIA NIM tiers including free
  // and has strong tool-calling support. Switch to nvidia/llama-3.1-nemotron-ultra-253b-v1
  // for paid/enterprise accounts with Nemotron access.
  const NVIDIA_MODEL = "meta/llama-3.1-70b-instruct";

  const messages = [
    { role: "system", content: getSystemInstructionForRole(role) },
    ...history.slice(-4).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
    { role: "user", content: message },
  ];

  const roleTools = getOpenAIToolsForRole(role);

  let fullText = "";
  let loopCount = 0;
  while (loopCount < 3) {
    if (isAborted()) break;
    loopCount++;
    const completion = await client.chat.completions.create({
      model: NVIDIA_MODEL,
      messages,
      tools: roleTools.length > 0 ? roleTools : undefined,
      tool_choice: roleTools.length > 0 ? "auto" : undefined,
      temperature: 0.6,
      top_p: 0.9,
      max_tokens: 4096,
    });
    const choice = completion.choices[0];
    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      if (isAborted()) break;
      messages.push(choice.message);
      for (const toolCall of choice.message.tool_calls) {
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");
        send("tool", { name });
        const toolResult = await executeToolCall(name, args, companyId, userId, role);
        messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
      }
      continue;
    }
    if (isAborted()) break;
    const stream = await client.chat.completions.create({
      model: NVIDIA_MODEL,
      messages,
      stream: true,
      temperature: 0.6,
      top_p: 0.9,
      max_tokens: 4096,
    });
    for await (const chunk of stream) {
      if (isAborted()) break;
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) {
        fullText += text;
        try {
          send("token", { text });
        } catch (e) {
          // Client disconnected
        }
      }
    }
    break;
  }

  // Save response to DB session only if not empty and not aborted
  if (fullText.trim() && !isAborted()) {
    try {
      await ChatSession.findByIdAndUpdate(sessionId, {
        $push: { messages: { role: "assistant", text: fullText } }
      });
    } catch (dbErr) {
      console.error("Failed to save NVIDIA response to database session:", dbErr);
    }
  }
}

// ─── Provider: xAI Grok ─────────────────────────────────────────────────────

async function handleGrokStream(apiKey, sessionId, message, history, companyId, userId, role, send, isAborted) {
  const { default: OpenAI } = await import("openai");
  const client = new OpenAI({ baseURL: "https://api.x.ai/v1", apiKey });

  const GROK_MODEL = "grok-4.3";

  const messages = [
    { role: "system", content: getSystemInstructionForRole(role) },
    ...history.slice(-4).map((m) => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.text })),
    { role: "user", content: message },
  ];

  const roleTools = getOpenAIToolsForRole(role);

  let fullText = "";
  let loopCount = 0;
  while (loopCount < 3) {
    if (isAborted()) break;
    loopCount++;
    const completion = await client.chat.completions.create({
      model: GROK_MODEL,
      messages,
      tools: roleTools.length > 0 ? roleTools : undefined,
      tool_choice: roleTools.length > 0 ? "auto" : undefined,
      temperature: 0.6,
      max_tokens: 4096,
    });
    const choice = completion.choices[0];
    if (choice.finish_reason === "tool_calls" && choice.message.tool_calls) {
      if (isAborted()) break;
      messages.push(choice.message);
      for (const toolCall of choice.message.tool_calls) {
        const name = toolCall.function.name;
        const args = JSON.parse(toolCall.function.arguments || "{}");
        send("tool", { name });
        const toolResult = await executeToolCall(name, args, companyId, userId, role);
        messages.push({ role: "tool", tool_call_id: toolCall.id, content: JSON.stringify(toolResult) });
      }
      continue;
    }
    if (isAborted()) break;
    const stream = await client.chat.completions.create({
      model: GROK_MODEL,
      messages,
      stream: true,
      temperature: 0.6,
      max_tokens: 4096,
    });
    for await (const chunk of stream) {
      if (isAborted()) break;
      const text = chunk.choices?.[0]?.delta?.content;
      if (text) {
        fullText += text;
        try {
          send("token", { text });
        } catch (e) {
          // Client disconnected
        }
      }
    }
    break;
  }

  // Save response to DB session only if not empty and not aborted
  if (fullText.trim() && !isAborted()) {
    try {
      await ChatSession.findByIdAndUpdate(sessionId, {
        $push: { messages: { role: "assistant", text: fullText } }
      });
    } catch (dbErr) {
      console.error("Failed to save Grok response to database session:", dbErr);
    }
  }
}

// ─── Main POST Handler ────────────────────────────────────────────────────────

export async function POST(request) {
  try {
    const { companyId, role, userId } = getRequestSession(request);
    if (!companyId || !userId) {
      return NextResponse.json({ error: "Unauthorized. Session is required." }, { status: 401 });
    }

    await dbConnect();

    const { sessionId, message } = await reqBody(request);
    if (!sessionId) {
      return NextResponse.json({ error: "Session ID is required." }, { status: 400 });
    }
    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    // Verify session ownership
    const chatSession = await ChatSession.findOne({ _id: sessionId, companyId, userId });
    if (!chatSession) {
      return NextResponse.json({ error: "Chat session not found." }, { status: 404 });
    }

    // Build history from existing messages
    const history = chatSession.messages.map(m => ({ role: m.role, text: m.text }));

    // Append the user's message to the session document in MongoDB
    chatSession.messages.push({ role: "user", text: message });
    await chatSession.save();

    // Read the platform-wide AI config set by the superadmin
    const settings = await GlobalSettings.findOne({ key: "platform" }).lean();

    // Resolve provider
    let selectedProvider = settings?.activeProvider || "gemini";
    let apiKey = "";

    // If company user, check company's own AI Keys first
    if (companyId && companyId !== "global") {
      const Company = (await import("@/models/Company")).default;
      const company = await Company.findById(companyId).select("aiKeys").lean();
      if (company && company.aiKeys?.[selectedProvider]) {
        apiKey = company.aiKeys[selectedProvider];
      }
    }

    // Fallback to global platform key if company has no key configured
    if (!apiKey && settings?.aiKeys?.[selectedProvider]) {
      apiKey = settings.aiKeys[selectedProvider];
    }

    // Fallback to GEMINI_API_KEY env var if still no key and provider is gemini
    if (!apiKey && selectedProvider === "gemini" && process.env.GEMINI_API_KEY) {
      apiKey = process.env.GEMINI_API_KEY;
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "The AI assistant is not configured yet. Please contact the platform administrator." },
        { status: 503 }
      );
    }

    return createSSEStream(async (send, isAborted) => {
      send("start", { provider: selectedProvider });
      switch (selectedProvider) {
        case "gemini":
          await handleGeminiStream(apiKey, sessionId, message, history, companyId, userId, role, send, isAborted);
          break;
        case "openai":
          await handleOpenAIStream(apiKey, sessionId, message, history, companyId, userId, role, send, isAborted);
          break;
        case "claude":
          await handleClaudeStream(apiKey, sessionId, message, history, companyId, userId, role, send, isAborted);
          break;
        case "nvidia":
          await handleNvidiaStream(apiKey, sessionId, message, history, companyId, userId, role, send, isAborted);
          break;
        case "grok":
          await handleGrokStream(apiKey, sessionId, message, history, companyId, userId, role, send, isAborted);
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
