import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ChatSession from "@/models/ChatSession";
import { getRequestSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function GET(request) {
  try {
    const isAllowed = await hasPermission(request, "ai_agent", "read");
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to access the AI Agent" }, { status: 403 });
    }

    const { companyId, userId } = getRequestSession(request);
    if (!companyId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const sessions = await ChatSession.find({ companyId, userId })
      .sort({ updatedAt: -1 })
      .lean();

    // Map _id to id so frontend handles it correctly
    const mappedSessions = sessions.map(session => ({
      ...session,
      id: session._id.toString(),
      _id: session._id.toString(),
      messages: session.messages.map(m => ({
        ...m,
        id: m._id ? m._id.toString() : undefined,
        _id: m._id ? m._id.toString() : undefined,
      }))
    }));

    return NextResponse.json(mappedSessions);
  } catch (error) {
    console.error("Failed to get chat sessions:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    const isAllowed = await hasPermission(request, "ai_agent", "read");
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to access the AI Agent" }, { status: 403 });
    }

    const { companyId, userId } = getRequestSession(request);
    if (!companyId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await dbConnect();
    const { title } = await request.json().catch(() => ({}));

    const session = await ChatSession.create({
      companyId,
      userId,
      title: title || "New Chat Session",
      messages: [
        {
          role: "assistant",
          text: "Hi there! I am your AI Workspace Assistant. I can compile project status reports or email outstanding invoices. Try asking me one of the suggestions below!"
        }
      ]
    });

    const sessionObj = session.toObject();
    const mappedSession = {
      ...sessionObj,
      id: sessionObj._id.toString(),
      _id: sessionObj._id.toString(),
      messages: sessionObj.messages.map(m => ({
        ...m,
        id: m._id ? m._id.toString() : undefined,
        _id: m._id ? m._id.toString() : undefined,
      }))
    };

    return NextResponse.json(mappedSession, { status: 201 });
  } catch (error) {
    console.error("Failed to create chat session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
