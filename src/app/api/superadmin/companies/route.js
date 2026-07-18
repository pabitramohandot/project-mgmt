import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import User from "@/models/User";
import { getRequestSession } from "@/lib/auth";

export const dynamic = 'force-dynamic';

export async function GET(request) {
  try {
    const { role } = getRequestSession(request);
    if (role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const companies = await Company.find().sort({ createdAt: -1 }).lean();
    
    // Fetch all users who are company admins
    const admins = await User.find({ role: "company_admin" }).select("username companyId").lean();

    // Fetch all users to determine online/live status
    const allUsers = await User.find().select("companyId isOnline lastActive").lean();

    // Map company admins and live status to each company
    const companiesWithAdmins = companies.map((comp) => {
      const companyAdmins = admins
        .filter((admin) => admin.companyId && admin.companyId.toString() === comp._id.toString())
        .map((admin) => admin.username);

      const companyUsers = allUsers.filter(
        (u) => u.companyId && u.companyId.toString() === comp._id.toString()
      );
      const isLive = companyUsers.some(
        (u) => u.isOnline && u.lastActive && (Date.now() - new Date(u.lastActive).getTime() < 1 * 60 * 1000)
      );

      console.log(`[COMPANY STATUS] ${comp.name} (${comp._id}): matched users count: ${companyUsers.length}, isLive: ${isLive}, online states:`, companyUsers.map(u => ({ isOnline: u.isOnline, lastActive: u.lastActive })));

      return {
        ...comp,
        admins: companyAdmins,
        isLive,
      };
    });

    return new NextResponse(JSON.stringify(companiesWithAdmins), {
      status: 200,
      headers: {
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error("Superadmin Companies GET API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch companies" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const { role } = getRequestSession(request);
    if (role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const data = await request.json();

    if (!data.name || !data.slug) {
      return NextResponse.json(
        { error: "Company Name and Slug are required" },
        { status: 400 },
      );
    }

    // Check unique slug
    const existing = await Company.findOne({
      slug: data.slug.trim().toLowerCase(),
    });
    if (existing) {
      return NextResponse.json(
        { error: "A company with this slug already exists" },
        { status: 400 },
      );
    }

    const company = await Company.create({
      name: data.name.trim(),
      slug: data.slug.trim().toLowerCase(),
      logo: data.logo || "",
      tagline: data.tagline ? data.tagline.trim() : "Development & Consulting Services",
      brandColors: {
        primary: data.brandColors?.primary || "#00aeef",
        secondary: data.brandColors?.secondary || "#f26522",
      },
      contactEmail: data.contactEmail || "",
      isActive: data.isActive !== undefined ? data.isActive : true,
      projectLimit: Number(data.projectLimit) || 0,
      clientLimit: Number(data.clientLimit) || 0,
      employeeLimit: Number(data.employeeLimit) || 0,
    });

    return NextResponse.json(company, { status: 201 });
  } catch (error) {
    console.error("Superadmin Companies POST API Error:", error);
    return NextResponse.json(
      { error: "Failed to create company" },
      { status: 500 },
    );
  }
}
