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
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.025em;">
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
          <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
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
            <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #111827; letter-spacing: -0.025em;">
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
          <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 24px; text-align: center; font-size: 12px; color: #9ca3af; border-bottom-left-radius: 16px; border-bottom-right-radius: 16px;">
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
