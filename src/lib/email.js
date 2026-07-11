import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'ionetweb@gmail.com',
    pass: process.env.EMAIL_PASS, // App Password
  },
});

export async function sendInvoiceEmail(invoice, project, pdfBase64 = null) {
  const clientEmail = invoice.clientEmail || invoice.client?.email;
  if (!clientEmail) {
    console.warn('WARNING: Client email is missing. Email send skipped.');
    return { skipped: true, reason: 'Client email missing' };
  }

  // Load company details dynamically
  let companyName = 'IONETWEB';
  let companyLogo = null;
  let companyTagline = 'Development & Consulting Services';
  let brandColors = { primary: '#00aeef', secondary: '#f26522' };
  let companyEmailSettings = null;

  try {
    if (invoice.companyId) {
      const companyIdVal = invoice.companyId._id || invoice.companyId;
      const Company = (await import('@/models/Company')).default;
      const company = await Company.findById(companyIdVal).lean();
      if (company) {
        companyName = company.name || 'IONETWEB';
        companyLogo = company.logo;
        companyTagline = company.tagline || 'Development & Consulting Services';
        if (company.brandColors) {
          brandColors = company.brandColors;
        }
        if (company.emailSettings?.user && company.emailSettings?.pass) {
          companyEmailSettings = company.emailSettings;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load company details for invoice email:', e);
  }

  if (companyLogo && !companyLogo.startsWith('http://') && !companyLogo.startsWith('https://') && !companyLogo.startsWith('data:')) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    companyLogo = `${baseUrl}${companyLogo.startsWith('/') ? '' : '/'}${companyLogo}`;
  }

  // Resolve transporter to use
  let activeTransporter = transporter;
  let fromAddress = `"${companyName} Invoicing" <${process.env.EMAIL_USER || 'ionetweb@gmail.com'}>`;

  if (companyEmailSettings) {
    let smtpConfig;
    if (companyEmailSettings.providerType === 'custom') {
      smtpConfig = {
        host: companyEmailSettings.host ? companyEmailSettings.host.trim() : '',
        port: Number(companyEmailSettings.port) || 465,
        secure: companyEmailSettings.secure !== false,
        auth: {
          user: companyEmailSettings.user,
          pass: companyEmailSettings.pass,
        },
      };
    } else {
      smtpConfig = {
        service: 'gmail',
        auth: {
          user: companyEmailSettings.user,
          pass: companyEmailSettings.pass,
        },
      };
    }
    activeTransporter = nodemailer.createTransport(smtpConfig);
    fromAddress = `"${companyName} Invoicing" <${companyEmailSettings.user}>`;
  } else {
    // If no custom SMTP credentials, check if system-wide EMAIL_PASS is present
    if (!process.env.EMAIL_PASS) {
      console.warn('WARNING: System EMAIL_PASS is not configured. Custom connection not set. Email send skipped.');
      return { skipped: true, reason: 'No SMTP credentials configured' };
    }
  }

  const invoiceUrl = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/invoices/${invoice._id}?download=true`;

  const itemsHtml = invoice.items.map(item => `
    <tr>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: left;">${item.description}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${item.quantity}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">₹${item.rate.toLocaleString('en-IN')}</td>
      <td style="padding: 10px; border-bottom: 1px solid #e2e8f0; text-align: right; font-weight: bold;">₹${(item.quantity * item.rate).toLocaleString('en-IN')}</td>
    </tr>
  `).join('');

  const taxAmount = invoice.subtotal * (invoice.taxRate / 100);
  const discountAmount = invoice.subtotal * (invoice.discountRate / 100);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Invoice ${invoice.invoiceNumber} from ${companyName}</title>
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <style>
          :root {
            color-scheme: light;
            supported-color-schemes: light;
          }
          body {
            background-color: #f9fafb !important;
            color: #1f2937 !important;
          }
          .container {
            background-color: #ffffff !important;
            color: #1f2937 !important;
          }
          td, th {
            color: #374151 !important;
          }
          h1, h2, h3, h4, strong {
            color: #111827 !important;
          }
        </style>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb; color: #1f2937; padding: 30px 20px; margin: 0; -webkit-font-smoothing: antialiased;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
          
          <!-- Logo & Header -->
          <div style="text-align: center; padding: 40px 40px 30px 40px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
            ${companyLogo ? `
              <div style="margin-bottom: 16px; text-align: center;">
                <img src="${companyLogo}" alt="${companyName}" style="height: 56px; max-height: 70px; max-width: 220px; object-fit: contain; display: inline-block;" />
              </div>
            ` : ''}
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ea580c; letter-spacing: -0.025em;">
              ${companyName}
            </h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280; font-weight: 500;">${companyTagline}</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px; background-color: #ffffff;">
            <h2 style="margin-top: 0; color: #111827; font-size: 20px; font-weight: 700; letter-spacing: -0.02em;">Hello ${invoice.clientName},</h2>
            ${(invoice.clientCompany || (invoice.client && invoice.client.company)) ? `<p style="margin-top: -12px; margin-bottom: 20px; color: #6b7280; font-size: 14px; font-weight: 600;">${invoice.clientCompany || invoice.client.company}</p>` : ''}
            <p style="line-height: 1.6; color: #374151; font-size: 15px; margin-bottom: 24px;">
              Please find your invoice for the project <strong>${project ? project.name : 'Development Services'}</strong> detailed below.
            </p>
            
            <!-- Invoice Details Card -->
            <div style="background-color: #f9fafb; border-radius: 12px; padding: 20px; margin: 24px 0; border: 1px solid #f3f4f6; font-size: 14px; color: #374151;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #6b7280; padding: 6px 0;">Invoice Number</td>
                  <td style="text-align: right; font-weight: 700; color: #111827;">${invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 6px 0;">Date Issued</td>
                  <td style="text-align: right; color: #111827;">${new Date(invoice.issueDate).toLocaleDateString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="color: #6b7280; padding: 6px 0;">Due Date</td>
                  <td style="text-align: right; color: #111827; font-weight: 600;">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'Upon Receipt'}</td>
                </tr>
              </table>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 24px;">
              <thead>
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px 10px; text-align: left; color: #4b5563; border-bottom: 2px solid #e5e7eb; font-weight: 600;">Description</th>
                  <th style="padding: 12px 10px; text-align: center; color: #4b5563; border-bottom: 2px solid #e5e7eb; width: 50px; font-weight: 600;">Qty</th>
                  <th style="padding: 12px 10px; text-align: right; color: #4b5563; border-bottom: 2px solid #e5e7eb; width: 100px; font-weight: 600;">Rate</th>
                  <th style="padding: 12px 10px; text-align: right; color: #4b5563; border-bottom: 2px solid #e5e7eb; width: 100px; font-weight: 600;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Totals -->
            <div style="display: flex; justify-content: flex-end; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 16px;">
              <table style="width: 250px; border-collapse: collapse; font-size: 14px; color: #4b5563; line-height: 1.6;">
                <tr>
                  <td style="padding: 6px 0; color: #6b7280;">Subtotal</td>
                  <td style="text-align: right; color: #111827;">₹${invoice.subtotal.toLocaleString('en-IN')}</td>
                </tr>
                ${taxAmount > 0 ? `
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Tax (${invoice.taxRate}%)</td>
                    <td style="text-align: right; color: #ef4444;">+₹${taxAmount.toLocaleString('en-IN')}</td>
                  </tr>
                ` : ''}
                ${discountAmount > 0 ? `
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280;">Discount (${invoice.discountRate}%)</td>
                    <td style="text-align: right; color: #10b981;">-₹${discountAmount.toLocaleString('en-IN')}</td>
                  </tr>
                ` : ''}
                <tr style="border-top: 2px solid #e5e7eb; font-size: 16px; font-weight: bold; color: #111827;">
                  <td style="padding: 12px 0 0 0;">Total Due</td>
                  <td style="text-align: right; padding: 12px 0 0 0; color: ${brandColors.primary}; font-weight: 800; font-size: 18px;">₹${invoice.total.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <!-- Notes -->
            ${invoice.notes ? `
              <div style="margin-top: 32px; border-top: 1px solid #e5e7eb; padding-top: 20px; font-size: 13px; color: #6b7280; line-height: 1.5;">
                <h4 style="margin: 0 0 6px 0; color: #374151; font-weight: 600; font-size: 14px;">Notes & Payment Terms:</h4>
                <div style="white-space: pre-wrap; color: #6b7280;">${invoice.notes}</div>
              </div>
            ` : ''}
          </div>
          
          <!-- Footer -->
          <div style="background-color: #ea580c; padding: 24px; text-align: center; font-size: 12px; color: #ffffff; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; font-weight: 500;">
            This is an automated email from the team at ${companyName}.
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: fromAddress,
    to: clientEmail,
    subject: `Invoice ${invoice.invoiceNumber} from ${companyName}`,
    html: htmlContent,
  };

  if (pdfBase64) {
    mailOptions.attachments = [
      {
        filename: `invoice-${invoice.invoiceNumber}.pdf`,
        content: pdfBase64,
        encoding: 'base64',
        contentType: 'application/pdf',
      }
    ];
  }

  const info = await activeTransporter.sendMail(mailOptions);
  console.log(`Email sent successfully: ${info.messageId}`);
  return info;
}

export async function sendAnnouncementEmail(clientEmail, clientName, subject, body, companyId = null) {
  if (!clientEmail) {
    console.warn('WARNING: Client email is missing. Email send skipped.');
    return { skipped: true, reason: 'Client email missing' };
  }

  // Load company details dynamically
  let companyName = 'IONETWEB';
  let companyLogo = null;
  let brandColors = { primary: '#00aeef', secondary: '#f26522' };
  let companyEmailSettings = null;

  try {
    if (companyId) {
      const companyIdVal = companyId._id || companyId;
      const Company = (await import('@/models/Company')).default;
      const company = await Company.findById(companyIdVal).lean();
      if (company) {
        companyName = company.name || 'IONETWEB';
        companyLogo = company.logo;
        if (company.brandColors) {
          brandColors = company.brandColors;
        }
        if (company.emailSettings?.user && company.emailSettings?.pass) {
          companyEmailSettings = company.emailSettings;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load company details for announcement email:', e);
  }

  if (companyLogo && !companyLogo.startsWith('http://') && !companyLogo.startsWith('https://') && !companyLogo.startsWith('data:')) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    companyLogo = `${baseUrl}${companyLogo.startsWith('/') ? '' : '/'}${companyLogo}`;
  }

  // Resolve transporter to use
  let activeTransporter = transporter;
  let fromAddress = `"${companyName} Broadcast" <${process.env.EMAIL_USER || 'ionetweb@gmail.com'}>`;

  if (companyEmailSettings) {
    let smtpConfig;
    if (companyEmailSettings.providerType === 'custom') {
      smtpConfig = {
        host: companyEmailSettings.host ? companyEmailSettings.host.trim() : '',
        port: Number(companyEmailSettings.port) || 465,
        secure: companyEmailSettings.secure !== false,
        auth: {
          user: companyEmailSettings.user,
          pass: companyEmailSettings.pass,
        },
      };
    } else {
      smtpConfig = {
        service: 'gmail',
        auth: {
          user: companyEmailSettings.user,
          pass: companyEmailSettings.pass,
        },
      };
    }
    activeTransporter = nodemailer.createTransport(smtpConfig);
    fromAddress = `"${companyName} Broadcast" <${companyEmailSettings.user}>`;
  } else {
    // If no custom SMTP credentials, check if system-wide EMAIL_PASS is present
    if (!process.env.EMAIL_PASS) {
      console.warn('WARNING: System EMAIL_PASS is not configured. Custom connection not set. Email send skipped.');
      return { skipped: true, reason: 'No SMTP credentials configured' };
    }
  }

  const emailSubject = subject || `Broadcast from ${companyName}`;
  const personalizedBody = body.replace(/\[ClientName\]/g, clientName);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${emailSubject}</title>
        <meta name="color-scheme" content="light">
        <meta name="supported-color-schemes" content="light">
        <style>
          :root {
            color-scheme: light;
            supported-color-schemes: light;
          }
          body {
            background-color: #f9fafb !important;
            color: #1f2937 !important;
          }
          .container {
            background-color: #ffffff !important;
            color: #1f2937 !important;
          }
          h1, h2, h3, h4, strong {
            color: #111827 !important;
          }
        </style>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f9fafb; color: #1f2937; padding: 30px 20px; margin: 0; -webkit-font-smoothing: antialiased;">
        <div class="container" style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05); border: 1px solid #e5e7eb;">
          
          <!-- Logo & Header -->
          <div style="text-align: center; padding: 40px 40px 30px 40px; border-bottom: 1px solid #f1f5f9; background-color: #ffffff;">
            ${companyLogo ? `
              <div style="margin-bottom: 16px; text-align: center;">
                <img src="${companyLogo}" alt="${companyName}" style="height: 56px; max-height: 70px; max-width: 220px; object-fit: contain; display: inline-block;" />
              </div>
            ` : ''}
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ea580c; letter-spacing: -0.025em;">
              ${companyName} Announcement
            </h1>
            <p style="margin: 4px 0 0 0; font-size: 13px; color: #6b7280; font-weight: 500;">Official Broadcast Update</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 40px; line-height: 1.6; color: #374151; font-size: 15px; background-color: #ffffff;">
            <h2 style="margin-top: 0; color: #111827; font-size: 18px; font-weight: 700;">Hello ${clientName},</h2>
            <div style="white-space: pre-wrap; margin-top: 16px; color: #374151;">${personalizedBody}</div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #ea580c; padding: 24px; text-align: center; font-size: 12px; color: #ffffff; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px; font-weight: 500;">
            This email was sent by the management system of ${companyName}.
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: fromAddress,
    to: clientEmail,
    subject: emailSubject,
    html: htmlContent,
  };

  const info = await activeTransporter.sendMail(mailOptions);
  console.log(`Announcement Email sent successfully to ${clientEmail}: ${info.messageId}`);
  return info;
}

export async function sendMeetingInvitationEmail({ attendees, clientEmail, title, client, date, time, duration, meetingType, location, meetingUrl, description, companyId }) {
  const cleanMeetingUrl = (meetingUrl && meetingUrl.includes('meet.google.com')) ? meetingUrl : '';
  
  // Build full recipient list: client email + comma-separated attendees, deduplicated
  const allEmails = new Set();
  if (clientEmail && clientEmail.trim()) allEmails.add(clientEmail.trim().toLowerCase());
  if (attendees && attendees.trim()) {
    attendees.split(',').map(e => e.trim()).filter(Boolean).forEach(e => allEmails.add(e.toLowerCase()));
  }
  if (allEmails.size === 0) return { skipped: true, reason: 'No recipients (no client email and no attendees)' };
  const emails = Array.from(allEmails);
  console.log(`[Meeting Invite] Sending invitation to ${emails.length} recipient(s):`, emails);

  // Load company details dynamically
  let companyName = 'IONETWEB';
  let companyLogo = null;
  let companyEmailSettings = null;
  let brandColors = { primary: '#00aeef', secondary: '#f26522' };

  try {
    if (companyId) {
      const Company = (await import('@/models/Company')).default;
      const company = await Company.findById(companyId).lean();
      if (company) {
        companyName = company.name || 'IONETWEB';
        companyLogo = company.logo;
        if (company.brandColors) {
          brandColors = company.brandColors;
        }
        if (company.emailSettings?.user && company.emailSettings?.pass) {
          companyEmailSettings = company.emailSettings;
        }
      }
    }
  } catch (e) {
    console.error('Failed to load company details for meeting email:', e);
  }

  if (companyLogo && !companyLogo.startsWith('http://') && !companyLogo.startsWith('https://') && !companyLogo.startsWith('data:')) {
    const baseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
    companyLogo = `${baseUrl}${companyLogo.startsWith('/') ? '' : '/'}${companyLogo}`;
  }

  // Resolve transporter to use
  let activeTransporter = transporter;
  let fromAddress = `"${companyName} Meetings" <${process.env.EMAIL_USER || 'ionetweb@gmail.com'}>`;

  if (companyEmailSettings) {
    let smtpConfig;
    if (companyEmailSettings.providerType === 'custom') {
      smtpConfig = {
        host: companyEmailSettings.host ? companyEmailSettings.host.trim() : '',
        port: Number(companyEmailSettings.port) || 465,
        secure: companyEmailSettings.secure !== false,
        auth: {
          user: companyEmailSettings.user,
          pass: companyEmailSettings.pass,
        },
      };
    } else {
      smtpConfig = {
        service: 'gmail',
        auth: {
          user: companyEmailSettings.user,
          pass: companyEmailSettings.pass,
        },
      };
    }
    activeTransporter = nodemailer.createTransport(smtpConfig);
    fromAddress = `"${companyName} Meetings" <${companyEmailSettings.user}>`;
  } else {
    if (!process.env.EMAIL_PASS) {
      console.warn('WARNING: System EMAIL_PASS is not configured. Custom connection not set. Email send skipped.');
      return { skipped: true, reason: 'No SMTP credentials configured' };
    }
  }

  // Format date display
  const formattedDate = new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  const subject = `Invitation: ${title} on ${formattedDate}`;

  const htmlContent = `
    <!DOCTYPE html>
    <html lang="en">
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
      </head>
      <body style="margin:0;padding:0;background-color:#f4f4f5;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f4f4f5;padding:40px 0;">
          <tr>
            <td align="center">
              <table width="560" cellpadding="0" cellspacing="0" style="max-width:560px;width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;box-shadow:0 4px 16px rgba(0,0,0,0.07);">

                <!-- LOGO / HEADER -->
                <tr>
                  <td style="padding:36px 40px 20px;text-align:center;border-bottom:1px solid #f1f5f9;">
                    ${companyLogo
                      ? `<img src="${companyLogo}" alt="${companyName}" style="max-height:52px;display:block;margin:0 auto 14px;" />`
                      : `<div style="font-size:22px;font-weight:800;color:${brandColors.primary};margin-bottom:10px;">${companyName}</div>`
                    }
                    <h2 style="margin:0;font-size:19px;font-weight:700;color:${brandColors.primary};">New Meeting Scheduled</h2>
                  </td>
                </tr>

                <!-- INVITE LABEL + TITLE -->
                <tr>
                  <td style="padding:26px 40px 6px;">
                    <p style="margin:0 0 6px;font-size:14px;font-weight:600;color:#111827;">You have been invited to a meeting:</p>
                    <h3 style="margin:0;font-size:18px;font-weight:700;color:${brandColors.primary};">${title}</h3>
                  </td>
                </tr>

                <!-- DETAILS TABLE -->
                <tr>
                  <td style="padding:14px 40px 20px;">
                    <table width="100%" cellpadding="0" cellspacing="0" style="border-collapse:collapse;">

                      ${client && client !== 'No client (personal meeting)' ? `
                      <tr>
                        <td style="padding:8px 20px 8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#374151;width:130px;vertical-align:top;">Client</td>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;vertical-align:top;">${client}</td>
                      </tr>` : ''}

                      <tr>
                        <td style="padding:8px 20px 8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#374151;width:130px;vertical-align:top;">Date</td>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;vertical-align:top;">${formattedDate}</td>
                      </tr>

                      <tr>
                        <td style="padding:8px 20px 8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#374151;vertical-align:top;">Time</td>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;vertical-align:top;">${time} <span style="color:#6b7280;">(${duration})</span></td>
                      </tr>

                      <tr>
                        <td style="padding:8px 20px 8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#374151;vertical-align:top;">Type</td>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;text-transform:capitalize;vertical-align:top;">${meetingType}</td>
                      </tr>

                      ${meetingType === 'offline' && location ? `
                      <tr>
                        <td style="padding:8px 20px 8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#374151;vertical-align:top;">Location</td>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;color:#111827;vertical-align:top;">${location}</td>
                      </tr>` : ''}

                      ${meetingType === 'online' && cleanMeetingUrl ? `
                      <tr>
                        <td style="padding:8px 20px 8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;font-weight:700;color:#374151;vertical-align:top;">Meeting Link</td>
                        <td style="padding:8px 0;border-bottom:1px solid #f3f4f6;font-size:13px;vertical-align:top;"><a href="${cleanMeetingUrl}" style="color:${brandColors.primary};font-weight:600;word-break:break-all;text-decoration:none;">${cleanMeetingUrl}</a></td>
                      </tr>` : ''}

                      ${description ? `
                      <tr>
                        <td style="padding:8px 20px 8px 0;font-size:13px;font-weight:700;color:#374151;vertical-align:top;">Description</td>
                        <td style="padding:8px 0;font-size:13px;color:#374151;vertical-align:top;">${description}</td>
                      </tr>` : ''}

                    </table>
                  </td>
                </tr>

                <!-- JOIN BUTTON -->
                ${meetingType === 'online' && cleanMeetingUrl ? `
                <tr>
                  <td style="padding:4px 40px 36px;text-align:center;">
                    <a href="${cleanMeetingUrl}" style="display:inline-block;background:${brandColors.primary};color:#ffffff;text-decoration:none;font-size:14px;font-weight:700;padding:13px 38px;border-radius:8px;">
                      Join Meeting
                    </a>
                  </td>
                </tr>` : `<tr><td style="height:20px;"></td></tr>`}

                <!-- FOOTER BAR -->
                <tr>
                  <td style="background:${brandColors.primary};padding:18px 40px;text-align:center;">
                    <p style="margin:0;color:#ffffff;font-size:12px;font-weight:500;">This is an automated invitation from the team at ${companyName}.</p>
                  </td>
                </tr>

              </table>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  // Send email to all attendees asynchronously
  const sendPromises = emails.map(email => {
    let personalizedHtml = htmlContent;
    if (cleanMeetingUrl) {
      const personalizedUrl = cleanMeetingUrl.includes('?') 
        ? `${cleanMeetingUrl}&authuser=${encodeURIComponent(email)}` 
        : `${cleanMeetingUrl}?authuser=${encodeURIComponent(email)}`;
      personalizedHtml = htmlContent.split(cleanMeetingUrl).join(personalizedUrl);
    }

    const mailOptions = {
      from: fromAddress,
      to: email,
      subject,
      html: personalizedHtml
    };
    return activeTransporter.sendMail(mailOptions).catch(err => {
      console.error(`Failed to send invitation to ${email}:`, err);
    });
  });

  await Promise.all(sendPromises);
  console.log(`Meeting invitations sent to ${emails.length} recipient(s): ${emails.join(', ')}`);
  return { success: true, count: emails.length };
}

export async function sendOnboardingEmail(email, name, username, tempPassword, companyName) {
  const systemEmailUser = process.env.EMAIL_USER || 'ionetweb@gmail.com';
  const systemEmailPass = process.env.EMAIL_PASS;
  
  if (!systemEmailPass) {
    console.warn('WARNING: System EMAIL_PASS is not configured. Email send skipped.');
    return { skipped: true, reason: 'System EMAIL_PASS missing' };
  }

  const activeTransporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: systemEmailUser,
      pass: systemEmailPass,
    },
  });

  const fromAddress = `"Worklance Onboarding" <${systemEmailUser}>`;
  const subject = `Welcome to Worklance! Your account has been approved`;

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>Welcome to Worklance</title>
      </head>
      <body style="font-family: Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937;">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 12px rgba(0,0,0,0.05); border: 1px solid #e5e7eb;">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #00aeef 0%, #009fe3 100%); padding: 30px 40px; text-align: center;">
              <img src="https://uploads.worklanceai.com/uploads/2026/06/Final%20Logo-13.png" alt="Worklance Logo" style="height: 48px; object-fit: contain;">
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="margin-top: 0; color: #111827; font-size: 22px; font-weight: 800;">Hello ${name},</h2>
              <p style="font-size: 15px; line-height: 1.6; color: #4b5563; margin-bottom: 24px;">
                We are thrilled to inform you that your request to join the <strong>Worklance</strong> platform for <strong>${companyName}</strong> has been <strong>approved</strong> by our administrator!
              </p>
              
              <div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 12px; padding: 20px; margin-bottom: 28px;">
                <h3 style="margin-top: 0; color: #111827; font-size: 14px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 12px;">Your Credentials</h3>
                <table width="100%" style="font-size: 14px; border-collapse: collapse;">
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-weight: 600; width: 120px;">Username:</td>
                    <td style="padding: 6px 0; color: #111827; font-weight: 700;">${username}</td>
                  </tr>
                  <tr>
                    <td style="padding: 6px 0; color: #6b7280; font-weight: 600;">Temp Password:</td>
                    <td style="padding: 6px 0; color: #111827; font-weight: 700; font-family: monospace; font-size: 15px; background: #e0f2fe; padding: 4px 8px; border-radius: 4px; display: inline-block;">${tempPassword}</td>
                  </tr>
                </table>
              </div>

              <div style="text-align: center; margin-bottom: 30px;">
                <a href="${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/login" style="display: inline-block; background: #00aeef; color: #ffffff; text-decoration: none; font-size: 15px; font-weight: 700; padding: 14px 40px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0, 174, 239, 0.25);">
                  Login to Workspace
                </a>
              </div>

              <p style="font-size: 13px; line-height: 1.5; color: #9ca3af; margin-bottom: 0;">
                * Please change your password immediately after logging in for security reasons.
              </p>
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">This is an automated system email from Worklance.</p>
            </td>
          </tr>
        </table>
      </body>
    </html>
  `;

  const mailOptions = {
    from: fromAddress,
    to: email,
    subject,
    html: htmlContent
  };

  try {
    await activeTransporter.sendMail(mailOptions);
    console.log(`Onboarding email successfully sent to ${email}`);
    return { success: true };
  } catch (error) {
    console.error(`Failed to send onboarding email to ${email}:`, error);
    return { success: false, error };
  }
}


