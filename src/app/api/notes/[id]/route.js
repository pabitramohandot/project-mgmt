import dbConnect from "@/lib/db";
import Note from "@/models/Note";
import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import User from "@/models/User";
import { getCategoryForUser } from "@/lib/permissions";

export async function PUT(request, { params }) {
  try {
    await dbConnect();
    const { userId, role } = getRequestSession(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = (await params).id;

    const { title, content, color, sharedWith } = await request.json();

    const note = await Note.findById(id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Only creator or superadmin can edit
    if (note.userId.toString() !== userId && role !== 'superadmin') {
      return NextResponse.json({ error: "Forbidden: You cannot edit this note" }, { status: 403 });
    }

    note.title = title !== undefined ? title : note.title;
    note.content = content !== undefined ? content : note.content;
    note.color = color !== undefined ? color : note.color;
    note.sharedWith = sharedWith !== undefined ? sharedWith : note.sharedWith;

    await note.save();

    return NextResponse.json({ note });
  } catch (error) {
    console.error("Notes PUT Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function DELETE(request, { params }) {
  try {
    await dbConnect();
    const { userId, role } = getRequestSession(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const id = (await params).id;

    const note = await Note.findById(id);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    // Only creator or superadmin can delete
    if (note.userId.toString() !== userId && role !== 'superadmin') {
      return NextResponse.json({ error: "Forbidden: You cannot delete this note" }, { status: 403 });
    }

    await note.deleteOne();

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Notes DELETE Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
