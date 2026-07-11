import { NextResponse } from "next/server";
import dbConnect from "@/lib/db";
import Company from "@/models/Company";
import User from "@/models/User";
import Role from "@/models/Role";
import Project from "@/models/Project";
import Client from "@/models/Client";
import GlobalSettings from "@/models/GlobalSettings";
import { verifyToken, hashPassword } from "@/lib/auth";
import { getPermissionsForUser, getCategoryForUser } from "@/lib/permissions";

export async function GET(request) {
  try {
    const token = request.cookies.get("admin_token")?.value;
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json({ loggedIn: false });
    }

    await dbConnect();
    const user = await User.findById(payload.userId).populate('customRole').lean();
    if (!user) {
      return NextResponse.json({ loggedIn: false });
    }

    const permissions = await getPermissionsForUser(user);
    const category = await getCategoryForUser(user);

    let company = null;
    let companyUsers = [];
    let projectCount = 0;
    let clientCount = 0;
    let employeeCount = 0;

    if (user.companyId) {
      company = await Company.findById(user.companyId).lean();
      if (company && company.isActive === false && user.role !== "superadmin") {
        const response = NextResponse.json({ error: "Company suspended", suspended: true }, { status: 403 });
        response.cookies.delete("admin_token");
        return response;
      }
      // Allow all company members to fetch list of teammates to support task assignment
      companyUsers = await User.find({ companyId: user.companyId })
        .select("username role email whatsapp createdAt")
        .sort({ username: 1 })
        .lean();
        
      projectCount = await Project.countDocuments({ companyId: user.companyId });
      clientCount = await Client.countDocuments({ companyId: user.companyId });
      employeeCount = companyUsers.length;
    }

    // Fetch global platform settings (like uploadCode)
    const globalSettings = await GlobalSettings.findOne({ key: "platform" }).lean();
    const uploadCode = globalSettings?.uploadCode || "ABC012";

    return NextResponse.json({
      loggedIn: true,
      username: user.username,
      userId: user._id.toString(),
      uploadCode,
      companyId: user.companyId ? user.companyId.toString() : null,
      role: user.role,
      category,
      email: user.email || "",
      needsPasswordChange: user.needsPasswordChange || false,
      whatsapp: user.whatsapp || "",
      permissions,
      projectCount,
      clientCount,
      employeeCount,
      company: company
        ? {
            name: company.name,
            slug: company.slug,
            logo: company.logo,
            brandColors: company.brandColors,
            projectLimit: company.projectLimit || 0,
            clientLimit: company.clientLimit || 0,
            employeeLimit: company.employeeLimit || 0,
            emailSettings: {
              user: company.emailSettings?.user || "",
              hasPassword: !!company.emailSettings?.pass,
              host: company.emailSettings?.host || "",
              port: company.emailSettings?.port || 465,
              secure: company.emailSettings?.secure !== false,
              providerType: company.emailSettings?.providerType || "gmail",
            },
            bankDetails: company.bankDetails || "",
            bankQrCode: company.bankQrCode || "",
          }
        : null,
      companyUsers: companyUsers
        .filter((u) => u.role !== 'superadmin')
        .map((u) => ({
          id: u._id.toString(),
          username: u.username,
          role: u.role,
          email: u.email || "",
          whatsapp: u.whatsapp || "",
          createdAt: u.createdAt,
        })),
    });
  } catch (error) {
    console.error("Me API Error:", error);
    return NextResponse.json({ loggedIn: false }, { status: 500 });
  }
}

export async function PUT(request) {
  try {
    const token = request.cookies.get("admin_token")?.value;
    const payload = await verifyToken(token);

    if (!payload) {
      return NextResponse.json(
        { error: "Unauthorized: Login required" },
        { status: 401 },
      );
    }

    await dbConnect();
    const user = await User.findById(payload.userId);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const data = await request.json();
    const { 
      password, 
      email, 
      whatsapp, 
      companyEmailUser, 
      companyEmailPass,
      companyEmailHost,
      companyEmailPort,
      companyEmailSecure,
      companyEmailProviderType,
      companyLogo,
      uploadCode,
      brandingTagline,
      brandingPrimaryColor,
      brandingSecondaryColor,
      bankDetails,
      bankQrCode
    } = data;

    if (email !== undefined) user.email = email.trim();
    if (whatsapp !== undefined) user.whatsapp = whatsapp.trim();

    if (password) {
      user.password = await hashPassword(password);
      user.needsPasswordChange = false;
    }

    await user.save();

    if (user.role === "superadmin" && uploadCode !== undefined) {
      let globalSettings = await GlobalSettings.findOne({ key: "platform" });
      if (!globalSettings) {
        globalSettings = new GlobalSettings({ key: "platform" });
      }
      globalSettings.uploadCode = uploadCode.trim();
      await globalSettings.save();
    }

    // If company admin or super admin, save custom email/logo/branding settings
    if (
      user.companyId &&
      (user.role === "company_admin" || user.role === "superadmin")
    ) {
      const company = await Company.findById(user.companyId);
      if (company) {
        if (companyLogo !== undefined) {
          company.logo = companyLogo.trim();
        }
        if (brandingTagline !== undefined) {
          company.tagline = brandingTagline.trim();
        }
        if (brandingPrimaryColor !== undefined || brandingSecondaryColor !== undefined) {
          company.brandColors = {
            primary: brandingPrimaryColor !== undefined ? brandingPrimaryColor.trim() : (company.brandColors?.primary || '#00aeef'),
            secondary: brandingSecondaryColor !== undefined ? brandingSecondaryColor.trim() : (company.brandColors?.secondary || '#f26522'),
          };
        }
        if (!company.emailSettings) {
          company.emailSettings = { user: "", pass: "" };
        }
        if (companyEmailUser !== undefined) {
          company.emailSettings.user = companyEmailUser.trim();
        }
        if (companyEmailPass !== undefined) {
          const trimmedPass = companyEmailPass.trim();
          if (trimmedPass !== "" && trimmedPass !== "••••••••") {
            company.emailSettings.pass = trimmedPass;
          }
        }
        if (companyEmailHost !== undefined) {
          company.emailSettings.host = companyEmailHost.trim();
        }
        if (companyEmailPort !== undefined) {
          company.emailSettings.port = Number(companyEmailPort) || 465;
        }
        if (companyEmailSecure !== undefined) {
          company.emailSettings.secure = !!companyEmailSecure;
        }
        if (companyEmailProviderType !== undefined) {
          company.emailSettings.providerType = companyEmailProviderType;
        }
        if (bankDetails !== undefined) {
          company.bankDetails = bankDetails.trim();
        }
        if (bankQrCode !== undefined) {
          company.bankQrCode = bankQrCode.trim();
        }
        await company.save();
      }
    }

    return NextResponse.json({
      success: true,
      message: "Account settings updated successfully",
      user: {
        username: user.username,
        email: user.email,
        whatsapp: user.whatsapp,
      },
    });
  } catch (error) {
    console.error("Me PUT API Error:", error);
    return NextResponse.json(
      { error: "Failed to update account settings" },
      { status: 500 },
    );
  }
}
