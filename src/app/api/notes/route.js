import dbConnect from "@/lib/db";
import Note from "@/models/Note";
import User from "@/models/User";
import { NextResponse } from "next/server";
import { getRequestSession } from "@/lib/auth";
import { getCategoryForUser } from "@/lib/permissions";

export async function GET(request) {
  try {
    await dbConnect();

    const { companyId, userId, role } = getRequestSession(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await User.findById(userId).populate("customRole").lean();
    const category = await getCategoryForUser(user);

    // Build query: User is the creator OR sharedWith contains userId OR sharedWith contains role/category
    const shareQuery = [userId];
    if (role) shareQuery.push(role);
    if (category) shareQuery.push(category);

    const query = {
      $or: [
        { userId: userId },
        { sharedWith: { $in: shareQuery } }
      ]
    };

    if (companyId && role !== 'superadmin') {
      query.companyId = companyId;
    }

    const notes = await Note.find(query).sort({ updatedAt: -1 }).lean();

    return NextResponse.json({ notes });
  } catch (error) {
    console.error("Notes API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request) {
  try {
    await dbConnect();
    const { companyId, userId } = getRequestSession(request);
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { title, content, color, sharedWith } = await request.json();

    if (!content) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const newNote = await Note.create({
      userId,
      companyId: companyId || null,
      title,
      content,
      color: color || '#ffffff',
      sharedWith: sharedWith || []
    });

    return NextResponse.json({ note: newNote });
  } catch (error) {
    console.error("Notes POST Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
