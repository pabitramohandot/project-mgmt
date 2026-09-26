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

export const dynamic = 'force-dynamic';

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

    // Throttle database lastActive updates to max once every 60 seconds
    const now = new Date();
    if (!user.lastActive || (now.getTime() - new Date(user.lastActive).getTime() > 60000)) {
      User.findByIdAndUpdate(payload.userId, {
        $set: { isOnline: true, lastActive: now }
      }).catch(err => console.error('Throttled active update error:', err));
    }

    if (payload.loginHistoryId) {
      try {
        const LoginHistory = (await import('@/models/LoginHistory')).default;
        const loginRecord = await LoginHistory.findById(payload.loginHistoryId);
        if (loginRecord && !loginRecord.logoutTime) {
          loginRecord.duration = Math.round((now.getTime() - loginRecord.loginTime.getTime()) / 1000);
          await loginRecord.save();
        }
      } catch (err) {
        console.error('Failed to update login history duration:', err);
      }
    }

    const [permissions, category] = await Promise.all([
      getPermissionsForUser(user),
      getCategoryForUser(user)
    ]);

    let company = null;
    let companyUsers = [];
    let projectCount = 0;
    let clientCount = 0;
    let employeeCount = 0;
    let globalSettings = null;

    if (user.companyId) {
      const [companyRes, companyUsersRes, projCountRes, clientCountRes, settingsRes] = await Promise.all([
        Company.findById(user.companyId).lean(),
        User.find({ companyId: user.companyId }).select("username role email whatsapp createdAt").sort({ username: 1 }).lean(),
        Project.countDocuments({ companyId: user.companyId }),
        Client.countDocuments({ companyId: user.companyId }),
        GlobalSettings.findOne({ key: "platform" }).lean()
      ]);

      company = companyRes;
      if (company && company.isActive === false && user.role !== "superadmin") {
        const response = NextResponse.json({ error: "Company suspended", suspended: true }, { status: 403 });
        response.cookies.delete("admin_token");
        return response;
      }
      companyUsers = companyUsersRes;
      projectCount = projCountRes;
      clientCount = clientCountRes;
      employeeCount = companyUsers.length;
      globalSettings = settingsRes;
    } else {
      globalSettings = await GlobalSettings.findOne({ key: "platform" }).lean();
    }

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
            currency: company.currency || 'INR',
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
            timetable: company.timetable || {
              clockInTime: '09:00',
              clockOutTime: '18:00',
              halfDayThresholdHours: 4,
              halfDayClockOutTime: '14:00',
              breaks: [
                { name: 'Lunch Break', startTime: '13:00', endTime: '14:00' }
              ]
            },
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
      bankQrCode,
      timetable,
      currency
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
        if (currency !== undefined && currency.trim()) {
          company.currency = currency.trim();
        }
        if (timetable !== undefined && typeof timetable === 'object') {
          company.timetable = {
            clockInTime: timetable.clockInTime || '09:00',
            clockOutTime: timetable.clockOutTime || '18:00',
            halfDayThresholdHours: timetable.halfDayThresholdHours !== undefined ? Number(timetable.halfDayThresholdHours) : 4,
            halfDayClockOutTime: timetable.halfDayClockOutTime || '14:00',
            breaks: Array.isArray(timetable.breaks) ? timetable.breaks.map(b => ({
              name: b.name || 'Break',
              startTime: b.startTime || '13:00',
              endTime: b.endTime || '14:00',
            })) : []
          };
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
