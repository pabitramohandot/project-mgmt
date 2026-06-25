import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import ChatSession from "@/models/ChatSession";
import { getRequestSession } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";

export async function PUT(request, context) {
  try {
    const isAllowed = await hasPermission(request, "ai_agent", "read");
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to access the AI Agent" }, { status: 403 });
    }

    const { companyId, userId } = getRequestSession(request);
    if (!companyId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;
    const { title, messages } = await request.json().catch(() => ({}));

    const updateData = {};
    if (title !== undefined) {
      if (!title.trim()) {
        return NextResponse.json({ error: "Title is required" }, { status: 400 });
      }
      updateData.title = title.trim();
    }
    if (messages !== undefined) {
      updateData.messages = messages;
    }

    await dbConnect();
    const session = await ChatSession.findOneAndUpdate(
      { _id: id, companyId, userId },
      updateData,
      { new: true }
    );

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

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

    return NextResponse.json(mappedSession);
  } catch (error) {
    console.error("Failed to update chat session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request, context) {
  try {
    const isAllowed = await hasPermission(request, "ai_agent", "read");
    if (!isAllowed) {
      return NextResponse.json({ error: "Forbidden: You do not have permission to access the AI Agent" }, { status: 403 });
    }

    const { companyId, userId } = getRequestSession(request);
    if (!companyId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const params = await context.params;
    const { id } = params;

    await dbConnect();
    const session = await ChatSession.findOneAndDelete({ _id: id, companyId, userId });

    if (!session) {
      return NextResponse.json({ error: "Session not found" }, { status: 404 });
    }

    return NextResponse.json({ success: true, message: "Session deleted" });
  } catch (error) {
    console.error("Failed to delete chat session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
