import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'ionetweb@gmail.com',
    pass: process.env.EMAIL_PASS, // App Password
  },
});

export async function sendInvoiceEmail(invoice, project, pdfBase64 = null) {
  if (!process.env.EMAIL_PASS) {
    console.warn('WARNING: EMAIL_PASS is not configured in .env.local. Email send skipped.');
    return { skipped: true, reason: 'EMAIL_PASS not configured' };
  }

  const clientEmail = invoice.clientEmail;
  if (!clientEmail) {
    console.warn('WARNING: Client email is missing. Email send skipped.');
    return { skipped: true, reason: 'Client email missing' };
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
        <title>Invoice ${invoice.invoiceNumber} from IONETWEB</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f8fafc; color: #1e293b; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); border: 1px solid #e2e8f0;">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #00aeef 0%, #009fe3 100%); padding: 30px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">IONETWEB</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.85;">Development & Consulting Services</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px;">
            <h2 style="margin-top: 0; color: #0f172a; font-size: 20px;">Hello ${invoice.clientName},</h2>
            ${(invoice.clientCompany || (invoice.client && invoice.client.company)) ? `<p style="margin-top: -10px; margin-bottom: 15px; color: #475569; font-size: 14px; font-weight: 600;">${invoice.clientCompany || invoice.client.company}</p>` : ''}
            <p style="line-height: 1.6; color: #475569; font-size: 15px;">
              Please find your invoice for the project <strong>${project ? project.name : 'Development Services'}</strong> detailed below.
            </p>
            
            <!-- Invoice Details -->
            <div style="background-color: #f8fafc; border-radius: 10px; padding: 15px; margin: 20px 0; border: 1px solid #e2e8f0; font-size: 14px;">
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="color: #64748b; padding: 5px 0;">Invoice Number:</td>
                  <td style="text-align: right; font-weight: bold; color: #0f172a;">${invoice.invoiceNumber}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 5px 0;">Date Issued:</td>
                  <td style="text-align: right; color: #0f172a;">${new Date(invoice.issueDate).toLocaleDateString('en-IN')}</td>
                </tr>
                <tr>
                  <td style="color: #64748b; padding: 5px 0;">Due Date:</td>
                  <td style="text-align: right; color: #0f172a; font-weight: 600;">${invoice.dueDate ? new Date(invoice.dueDate).toLocaleDateString('en-IN') : 'Upon Receipt'}</td>
                </tr>
              </table>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
              <thead>
                <tr style="background-color: #f1f5f9;">
                  <th style="padding: 10px; text-align: left; color: #475569; border-bottom: 2px solid #cbd5e1;">Description</th>
                  <th style="padding: 10px; text-align: center; color: #475569; border-bottom: 2px solid #cbd5e1; width: 50px;">Qty</th>
                  <th style="padding: 10px; text-align: right; color: #475569; border-bottom: 2px solid #cbd5e1; width: 100px;">Rate</th>
                  <th style="padding: 10px; text-align: right; color: #475569; border-bottom: 2px solid #cbd5e1; width: 100px;">Amount</th>
                </tr>
              </thead>
              <tbody>
                ${itemsHtml}
              </tbody>
            </table>

            <!-- Totals -->
            <div style="display: flex; justify-content: flex-end; margin-top: 20px;">
              <table style="width: 250px; border-collapse: collapse; font-size: 14px; color: #475569;">
                <tr>
                  <td style="padding: 5px 0;">Subtotal:</td>
                  <td style="text-align: right; color: #0f172a;">₹${invoice.subtotal.toLocaleString('en-IN')}</td>
                </tr>
                ${taxAmount > 0 ? `
                  <tr>
                    <td style="padding: 5px 0;">Tax (${invoice.taxRate}%):</td>
                    <td style="text-align: right; color: #ef4444;">+₹${taxAmount.toLocaleString('en-IN')}</td>
                  </tr>
                ` : ''}
                ${discountAmount > 0 ? `
                  <tr>
                    <td style="padding: 5px 0;">Discount (${invoice.discountRate}%):</td>
                    <td style="text-align: right; color: #10b981;">-₹${discountAmount.toLocaleString('en-IN')}</td>
                  </tr>
                ` : ''}
                <tr style="border-top: 2px solid #e2e8f0; font-size: 16px; font-weight: bold; color: #0f172a;">
                  <td style="padding: 10px 0 0 0;">Total Due:</td>
                  <td style="text-align: right; padding: 10px 0 0 0; color: #009fe3;">₹${invoice.total.toLocaleString('en-IN')}</td>
                </tr>
              </table>
            </div>

            <!-- Notes -->
            ${invoice.notes ? `
              <div style="margin-top: 30px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-size: 13px; color: #64748b;">
                <h4 style="margin: 0 0 5px 0; color: #475569;">Notes & Payment Terms:</h4>
                <div style="white-space: pre-wrap;">${invoice.notes}</div>
              </div>
            ` : ''}

            <!-- Call to Action -->
            <div style="text-align: center; margin-top: 40px;">
              <a href="${invoiceUrl}" target="_blank" style="display: inline-block; background-color: #009fe3; color: #ffffff; padding: 12px 24px; border-radius: 10px; font-weight: 600; text-decoration: none; box-shadow: 0 4px 6px -1px rgba(0, 159, 227, 0.25);">
                Download PDF
              </a>
            </div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #94a3b8;">
            This is an automated email from your development team at IONETWEB.
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: `"IONETWEB Invoicing" <${process.env.EMAIL_USER || 'ionetweb@gmail.com'}>`,
    to: clientEmail,
    subject: `Invoice ${invoice.invoiceNumber} from IONETWEB`,
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

  const info = await transporter.sendMail(mailOptions);
  console.log(`Email sent successfully: ${info.messageId}`);
  return info;
}

export async function sendAnnouncementEmail(clientEmail, clientName, subject, body) {
  if (!process.env.EMAIL_PASS) {
    console.warn('WARNING: EMAIL_PASS is not configured in .env.local. Email send skipped.');
    return { skipped: true, reason: 'EMAIL_PASS not configured' };
  }

  if (!clientEmail) {
    console.warn('WARNING: Client email is missing. Email send skipped.');
    return { skipped: true, reason: 'Client email missing' };
  }

  const personalizedBody = body.replace(/\[ClientName\]/g, clientName);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <title>${subject}</title>
      </head>
      <body style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #070e16; color: #f8fafc; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background-color: #0c1520; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0, 0, 0, 0.5); border: 1px solid rgba(255, 255, 255, 0.08);">
          <!-- Header -->
          <div style="background: linear-gradient(135deg, #00aeef 0%, #009fe3 100%); padding: 30px; text-align: center; color: #ffffff;">
            <h1 style="margin: 0; font-size: 24px; font-weight: 700; letter-spacing: -0.02em;">IONETWEB Announcement</h1>
            <p style="margin: 5px 0 0 0; font-size: 14px; opacity: 0.85;">Official Broadcast Update</p>
          </div>
          
          <!-- Content -->
          <div style="padding: 30px; line-height: 1.6; color: #94a3b8; font-size: 15px;">
            <h2 style="margin-top: 0; color: #f8fafc; font-size: 18px;">Hello ${clientName},</h2>
            <div style="white-space: pre-wrap; margin-top: 15px; color: #cbd5e1;">${personalizedBody}</div>
          </div>
          
          <!-- Footer -->
          <div style="background-color: #03070b; border-top: 1px solid rgba(255, 255, 255, 0.05); padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
            This email was sent by the management system of IONETWEB.
          </div>
        </div>
      </body>
    </html>
  `;

  const mailOptions = {
    from: `"IONETWEB Broadcast" <${process.env.EMAIL_USER || 'ionetweb@gmail.com'}>`,
    to: clientEmail,
    subject: subject,
    html: htmlContent,
  };

  const info = await transporter.sendMail(mailOptions);
  console.log(`Announcement Email sent successfully to ${clientEmail}: ${info.messageId}`);
  return info;
}

