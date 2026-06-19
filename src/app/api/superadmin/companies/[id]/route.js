import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import User from "@/models/User";
import Project from "@/models/Project";
import Client from "@/models/Client";
import Invoice from "@/models/Invoice";
import Credential from "@/models/Credential";
import Notification from "@/models/Notification";
import Feedback from "@/models/Feedback";
import { getRequestSession } from "@/lib/auth";

export async function GET(request, context) {
  try {
    const { role } = getRequestSession(request);
    if (role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const company = await Company.findById(id).lean();
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    const users = await User.find({ companyId: id })
      .sort({ username: 1 })
      .lean();

    return NextResponse.json({ company, users });
  } catch (error) {
    console.error("Superadmin Company detail GET API Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch company details" },
      { status: 500 },
    );
  }
}

export async function PUT(request, context) {
  try {
    const { role } = getRequestSession(request);
    if (role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const params = await context.params;
    const { id } = params;
    const data = await request.json();

    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (data.name !== undefined) company.name = data.name.trim();
    if (data.slug !== undefined) {
      const slugVal = data.slug.trim().toLowerCase();
      if (slugVal !== company.slug) {
        // check unique slug
        const existing = await Company.findOne({ slug: slugVal });
        if (existing) {
          return NextResponse.json(
            { error: "A company with this slug already exists" },
            { status: 400 },
          );
        }
        company.slug = slugVal;
      }
    }
    if (data.logo !== undefined) company.logo = data.logo;
    if (data.tagline !== undefined) company.tagline = data.tagline.trim();
    if (data.brandColors !== undefined) {
      company.brandColors = {
        primary: data.brandColors.primary || company.brandColors.primary,
        secondary: data.brandColors.secondary || company.brandColors.secondary,
      };
    }
    if (data.contactEmail !== undefined)
      company.contactEmail = data.contactEmail.trim();
    if (data.isActive !== undefined) company.isActive = data.isActive;

    const saved = await company.save();
    return NextResponse.json(saved);
  } catch (error) {
    console.error("Superadmin Company detail PUT API Error:", error);
    return NextResponse.json(
      { error: "Failed to update company" },
      { status: 500 },
    );
  }
}

export async function DELETE(request, context) {
  try {
    const { role } = getRequestSession(request);
    if (role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await dbConnect();
    const params = await context.params;
    const { id } = params;

    const company = await Company.findById(id);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    // Cascade delete everything related to the company
    await Promise.all([
      User.deleteMany({ companyId: id }),
      Project.deleteMany({ companyId: id }),
      Client.deleteMany({ companyId: id }),
      Invoice.deleteMany({ companyId: id }),
      Credential.deleteMany({ companyId: id }),
      Notification.deleteMany({ companyId: id }),
      Feedback.deleteMany({ companyId: id }),
      Company.findByIdAndDelete(id),
    ]);

    return NextResponse.json({
      success: true,
      message: "Company and all associated records deleted successfully",
    });
  } catch (error) {
    console.error("Superadmin Company detail DELETE API Error:", error);
    return NextResponse.json(
      { error: "Failed to delete company" },
      { status: 500 },
    );
  }
}
