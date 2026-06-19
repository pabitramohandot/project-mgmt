import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import { getRequestSession } from "@/lib/auth";

export async function PUT(request) {
  try {
    const { companyId, role } = getRequestSession(request);
    if (!companyId || (role !== "company_admin" && role !== "superadmin")) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    await dbConnect();
    const data = await request.json();

    const company = await Company.findById(companyId);
    if (!company) {
      return NextResponse.json({ error: "Company not found" }, { status: 404 });
    }

    if (data.logo !== undefined) company.logo = data.logo;
    if (data.tagline !== undefined) company.tagline = data.tagline.trim();
    if (data.brandColors !== undefined) {
      company.brandColors = {
        primary: data.brandColors.primary || company.brandColors.primary,
        secondary: data.brandColors.secondary || company.brandColors.secondary,
      };
    }

    const saved = await company.save();
    return NextResponse.json(saved);
  } catch (error) {
    console.error("Settings Branding PUT API Error:", error);
    return NextResponse.json(
      { error: "Failed to update branding settings" },
      { status: 500 },
    );
  }
}

export async function POST(request) {
  try {
    const { companyId, role } = getRequestSession(request);
    if (!companyId || (role !== "company_admin" && role !== "superadmin")) {
      return NextResponse.json(
        { error: "Forbidden: Admin access required" },
        { status: 403 },
      );
    }

    const data = await request.json();
    const { user, pass } = data;

    if (!user || !pass) {
      return NextResponse.json(
        { error: "Gmail Username and App Password are required" },
        { status: 400 },
      );
    }

    let smtpUser = user.trim();
    let smtpPass = pass.trim();

    if (smtpPass === "••••••••") {
      await dbConnect();
      const company = await Company.findById(companyId).lean();
      if (company && company.emailSettings?.pass) {
        smtpPass = company.emailSettings.pass;
        smtpUser = company.emailSettings.user || smtpUser;
      } else {
        return NextResponse.json(
          { error: "No saved App Password found" },
          { status: 404 },
        );
      }
    }

    const nodemailer = (await import("nodemailer")).default;
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    await transporter.verify();
    return NextResponse.json({
      success: true,
      message: "SMTP credentials verified successfully!",
    });
  } catch (error) {
    console.error("SMTP test failed:", error);
    return NextResponse.json(
      { error: error.message || "SMTP verification failed" },
      { status: 500 },
    );
  }
}
