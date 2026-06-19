import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import User from "@/models/User";
import { getRequestSession } from "@/lib/auth";

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

    // Map company admins to each company
    const companiesWithAdmins = companies.map((comp) => {
      const companyAdmins = admins
        .filter((admin) => admin.companyId && admin.companyId.toString() === comp._id.toString())
        .map((admin) => admin.username);
      return {
        ...comp,
        admins: companyAdmins,
      };
    });

    return NextResponse.json(companiesWithAdmins);
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
