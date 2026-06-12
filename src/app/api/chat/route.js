import { GoogleGenAI } from "@google/genai";
import { getRequestSession } from "@/lib/auth";
import { NextResponse } from "next/server";
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

const apiKey = process.env.GEMINI_API_KEY;

export async function POST(request) {
  try {
    const { companyId, userId } = getRequestSession(request);

    if (!companyId) {
      return NextResponse.json(
        { error: "Unauthorized. Company session is required." },
        { status: 401 },
      );
    }

    if (!apiKey) {
      return NextResponse.json(
        {
          error:
            "Gemini API Key is not configured. Please add GEMINI_API_KEY to your .env.local file.",
        },
        { status: 400 },
      );
    }

    const { message, history = [] } = await reqBody(request);
    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 },
      );
    }

    const ai = new GoogleGenAI({ apiKey });

    // Format conversational history (pruned to last 6 entries for speed)
    const contents = [];
    const recentHistory = history.slice(-6);
    for (const msg of recentHistory) {
      contents.push({
        role: msg.role === "assistant" ? "model" : "user",
        parts: [{ text: msg.text }],
      });
    }
    contents.push({
      role: "user",
      parts: [{ text: message }],
    });

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

    // Function declarations for all AI-enabled workspace actions
    const tools = [
      {
        functionDeclarations: [
          {
            name: "getProjectStatus",
            description:
              "Retrieve status reports, tasks completed, timeline dates, and status updates for a project.",
            parameters: {
              type: "OBJECT",
              properties: {
                projectName: {
                  type: "STRING",
                  description: "The name of the project to look up.",
                },
                daysCount: {
                  type: "INTEGER",
                  description:
                    "Number of days back to filter status updates (default is 30).",
                },
              },
              required: ["projectName"],
            },
          },
          {
            name: "sendInvoiceToClient",
            description:
              "Search for an invoice and email it to the client. Uses Nodemailer.",
            parameters: {
              type: "OBJECT",
              properties: {
                clientNameOrEmail: {
                  type: "STRING",
                  description:
                    "The name or email of the client to search invoices for.",
                },
                invoiceNumber: {
                  type: "STRING",
                  description:
                    "The invoice number (e.g. INV-001) to search for directly.",
                },
              },
            },
          },
          {
            name: "listProjects",
            description:
              "Retrieve a list of all projects in the workspace (including both active and completed ones).",
            parameters: { type: "OBJECT", properties: {} },
          },
          {
            name: "listInvoices",
            description:
              "Retrieve a list of all invoices in the workspace (including draft, sent, paid, and overdue statuses) with client name and associated project name.",
            parameters: { type: "OBJECT", properties: {} },
          },
          {
            name: "listExpiringItems",
            description:
              "Retrieve a list of domains or hosting services expiring in the next 60 days.",
            parameters: { type: "OBJECT", properties: {} },
          },
          {
            name: "createNewClient",
            description: "Register a new client contact profile.",
            parameters: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING", description: "Client name." },
                email: { type: "STRING", description: "Client email." },
                phone: {
                  type: "STRING",
                  description: "Client phone number (optional).",
                },
                company: {
                  type: "STRING",
                  description: "Client company name (optional).",
                },
                address: {
                  type: "STRING",
                  description: "Client address (optional).",
                },
              },
              required: ["name", "email"],
            },
          },
          {
            name: "createNewProject",
            description: "Create a new project in the workspace.",
            parameters: {
              type: "OBJECT",
              properties: {
                name: { type: "STRING", description: "Project name." },
                description: {
                  type: "STRING",
                  description: "Project scope details.",
                },
                clientName: {
                  type: "STRING",
                  description: "Client contact name.",
                },
                clientEmail: {
                  type: "STRING",
                  description: "Client contact email (optional).",
                },
                budget: {
                  type: "NUMBER",
                  description: "Project budget allocation (optional).",
                },
                startDate: {
                  type: "STRING",
                  description: "Start date in YYYY-MM-DD format (optional).",
                },
                endDate: {
                  type: "STRING",
                  description: "End date in YYYY-MM-DD format (optional).",
                },
              },
              required: ["name", "clientName"],
            },
          },
          {
            name: "addProjectTask",
            description: "Add a new task item to a project.",
            parameters: {
              type: "OBJECT",
              properties: {
                projectName: { type: "STRING", description: "Project name." },
                taskName: {
                  type: "STRING",
                  description: "Name of the task to add.",
                },
              },
              required: ["projectName", "taskName"],
            },
          },
          {
            name: "completeProjectTask",
            description: "Mark a task item as completed in a project.",
            parameters: {
              type: "OBJECT",
              properties: {
                projectName: { type: "STRING", description: "Project name." },
                taskName: {
                  type: "STRING",
                  description: "Name of the task to mark as completed.",
                },
              },
              required: ["projectName", "taskName"],
            },
          },
          {
            name: "updateProjectStatus",
            description: "Update project status and message timeline.",
            parameters: {
              type: "OBJECT",
              properties: {
                projectName: { type: "STRING", description: "Project name." },
                newStatus: {
                  type: "STRING",
                  description:
                    "New status: Planning, In Progress, Under Review, Completed, or Pending.",
                },
                updateMessage: {
                  type: "STRING",
                  description: "Chronology update note message (optional).",
                },
              },
              required: ["projectName", "newStatus"],
            },
          },
          {
            name: "createNewInvoice",
            description: "Generate a new invoice draft in the workspace.",
            parameters: {
              type: "OBJECT",
              properties: {
                projectNameOrClientName: {
                  type: "STRING",
                  description: "Associated project name or client name.",
                },
                items: {
                  type: "ARRAY",
                  description: "List of invoice line items.",
                  items: {
                    type: "OBJECT",
                    properties: {
                      description: {
                        type: "STRING",
                        description: "Item description.",
                      },
                      quantity: {
                        type: "NUMBER",
                        description: "Item quantity.",
                      },
                      rate: {
                        type: "NUMBER",
                        description: "Item billing rate.",
                      },
                    },
                    required: ["description", "quantity", "rate"],
                  },
                },
                taxRate: {
                  type: "NUMBER",
                  description: "Tax percentage (optional).",
                },
                discountRate: {
                  type: "NUMBER",
                  description: "Discount percentage (optional).",
                },
                dueDate: {
                  type: "STRING",
                  description: "Due date in YYYY-MM-DD format (optional).",
                },
                notes: {
                  type: "STRING",
                  description: "Payment terms or invoice notes (optional).",
                },
              },
              required: ["projectNameOrClientName", "items"],
            },
          },
          {
            name: "updateInvoiceStatus",
            description: "Update the payment status of an invoice.",
            parameters: {
              type: "OBJECT",
              properties: {
                invoiceNumber: {
                  type: "STRING",
                  description: "Invoice number (e.g. INV-1001).",
                },
                newStatus: {
                  type: "STRING",
                  description: "New status: Draft, Sent, Paid, or Overdue.",
                },
              },
              required: ["invoiceNumber", "newStatus"],
            },
          },
          {
            name: "broadcastAnnouncement",
            description:
              "Broadcast an announcement email to all client contacts.",
            parameters: {
              type: "OBJECT",
              properties: {
                subject: {
                  type: "STRING",
                  description: "Announcement subject line.",
                },
                message: {
                  type: "STRING",
                  description: "Body text content of the announcement.",
                },
              },
              required: ["subject", "message"],
            },
          },
          {
            name: "submitUserFeedback",
            description: "Submit bug reports or feature request tickets.",
            parameters: {
              type: "OBJECT",
              properties: {
                type: {
                  type: "STRING",
                  description: "Feedback type: 'bug' or 'feature'.",
                },
                description: {
                  type: "STRING",
                  description: "Feedback description details.",
                },
                pageUrl: {
                  type: "STRING",
                  description: "Page reference URL (optional).",
                },
              },
              required: ["type", "description"],
            },
          },
          {
            name: "listAllFeedbacks",
            description: "Retrieve a list of all user feedback tickets.",
            parameters: { type: "OBJECT", properties: {} },
          },
          {
            name: "listAllClients",
            description: "Retrieve a list of all registered client contacts.",
            parameters: { type: "OBJECT", properties: {} },
          },
        ],
      },
    ];

    let loopCount = 0;
    let finalResponseText = "";

    // Helper for transient error retries (e.g. 503, 429)
    const generateContentWithRetry = async (contents) => {
      let retries = 0;
      const maxRetries = 2;
      while (retries <= maxRetries) {
        try {
          return await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents,
            config: {
              systemInstruction,
              tools,
            },
          });
        } catch (err) {
          retries++;
          const errStr = err.message || "";
          const isTransient =
            errStr.includes("503") ||
            errStr.includes("UNAVAILABLE") ||
            errStr.includes("429") ||
            errStr.includes("demand") ||
            errStr.includes("rate limit");
          if (retries > maxRetries || !isTransient) {
            throw err;
          }
          console.warn(
            `Transient Gemini error (attempt ${retries}/${maxRetries}), retrying...`,
            errStr,
          );
          await new Promise((resolve) => setTimeout(resolve, 1000 * retries)); // Exponential backoff (1s, 2s)
        }
      }
    };

    while (loopCount < 3) {
      loopCount++;

      const geminiResponse = await generateContentWithRetry(contents);

      const candidate = geminiResponse.candidates?.[0];
      const parts = candidate?.content?.parts || [];

      // Find any function calls requested by the model
      const functionCallPart = parts.find((p) => p.functionCall);

      if (functionCallPart) {
        const { name, args } = functionCallPart.functionCall;
        let toolResult = null;

        // Execute matching action
        if (name === "getProjectStatus") {
          toolResult = await getProjectStatusReport(
            args.projectName,
            args.daysCount || 30,
            companyId,
          );
        } else if (name === "sendInvoiceToClient") {
          toolResult = await sendInvoiceToClient(
            args.clientNameOrEmail,
            args.invoiceNumber,
            companyId,
          );
        } else if (name === "listProjects") {
          toolResult = await listWorkspaceProjects(companyId);
        } else if (name === "listInvoices") {
          toolResult = await listWorkspaceInvoices(companyId);
        } else if (name === "listExpiringItems") {
          toolResult = await listExpiringServices(companyId);
        } else if (name === "createNewClient") {
          toolResult = await createNewClient(
            args.name,
            args.email,
            args.phone,
            args.company,
            args.address,
            companyId,
          );
        } else if (name === "createNewProject") {
          toolResult = await createNewProject(
            args.name,
            args.description,
            args.clientEmail,
            args.clientName,
            args.budget,
            args.startDate,
            args.endDate,
            companyId,
          );
        } else if (name === "addProjectTask") {
          toolResult = await addProjectTask(
            args.projectName,
            args.taskName,
            companyId,
          );
        } else if (name === "completeProjectTask") {
          toolResult = await completeProjectTask(
            args.projectName,
            args.taskName,
            companyId,
          );
        } else if (name === "updateProjectStatus") {
          toolResult = await updateProjectStatus(
            args.projectName,
            args.newStatus,
            args.updateMessage,
            companyId,
          );
        } else if (name === "createNewInvoice") {
          toolResult = await createNewInvoice(
            args.projectNameOrClientName,
            args.items,
            args.taxRate,
            args.discountRate,
            args.dueDate,
            args.notes,
            companyId,
          );
        } else if (name === "updateInvoiceStatus") {
          toolResult = await updateInvoiceStatus(
            args.invoiceNumber,
            args.newStatus,
            companyId,
          );
        } else if (name === "broadcastAnnouncement") {
          toolResult = await broadcastAnnouncement(
            args.subject,
            args.message,
            args.recipientType,
            companyId,
          );
        } else if (name === "submitUserFeedback") {
          toolResult = await submitUserFeedback(
            args.type,
            args.description,
            args.pageUrl,
            companyId,
            userId,
          );
        } else if (name === "listAllFeedbacks") {
          toolResult = await listAllFeedbacks(companyId);
        } else if (name === "listAllClients") {
          toolResult = await listAllClients(companyId);
        } else {
          toolResult = { error: `Tool ${name} is not implemented.` };
        }

        // Add assistant's tool call message
        contents.push({
          role: "model",
          parts: [{ functionCall: { name, args } }],
        });

        // Add tool response message back to the prompt flow
        contents.push({
          role: "tool",
          parts: [
            {
              functionResponse: {
                name,
                response: { result: toolResult },
              },
            },
          ],
        });

        // Continue generation loop with the tool result included
        continue;
      }

      // No function call; return final text response
      finalResponseText = parts.map((p) => p.text || "").join("");
      break;
    }

    return NextResponse.json({ text: finalResponseText });
  } catch (error) {
    console.error("AI Assistant Chat Error:", error);
    let errorMsg = error.message || "Internal server error";

    // Parse Google API JSON error if possible
    try {
      if (errorMsg.startsWith("{") || errorMsg.includes('"error"')) {
        const jsonStart = errorMsg.indexOf("{");
        const parsed = JSON.parse(errorMsg.substring(jsonStart));
        if (parsed.error && parsed.error.message) {
          errorMsg = parsed.error.message;
        }
      }
    } catch (e) {
      // Ignore JSON parse failures
    }

    // Adapt error text for typical model unavailability/overload
    if (
      errorMsg.includes("high demand") ||
      errorMsg.includes("503") ||
      errorMsg.includes("UNAVAILABLE") ||
      errorMsg.includes("demand")
    ) {
      errorMsg =
        "The AI model is currently experiencing high demand. Please try again in a few seconds.";
    }

    return NextResponse.json({ error: errorMsg }, { status: 500 });
  }
}

async function reqBody(req) {
  try {
    return await req.json();
  } catch {
    return {};
  }
}
