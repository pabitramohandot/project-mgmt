import dbConnect from '@/lib/db';
import Lead from '@/models/Lead';
import Client from '@/models/Client';
import { NextResponse } from 'next/server';
import { getRequestSession } from '@/lib/auth';
import { hasPermission } from '@/lib/permissions';

export async function GET(request) {
  try {
    const isAllowed = await hasPermission(request, 'crm', 'read');
    if (!isAllowed) {
      return NextResponse.json({ error: 'Forbidden: Access denied to CRM' }, { status: 403 });
    }

    await dbConnect();
    const { companyId } = getRequestSession(request);
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search')?.toLowerCase() || '';

    // Fetch leads and clients
    const [leads, clients] = await Promise.all([
      Lead.find({ companyId }).populate('assignedTo', 'name email').lean(),
      Client.find({ companyId }).lean(),
    ]);

    const contactMap = {};

    // Process leads into contacts
    leads.forEach((lead) => {
      const key = (lead.email || lead.contactName).toLowerCase().trim();
      if (!contactMap[key]) {
        contactMap[key] = {
          name: lead.contactName,
          email: lead.email || '',
          phone: lead.phone || '',
          company: lead.companyName || '',
          designation: lead.designation || '',
          type: 'Lead Contact',
          totalDeals: 0,
          totalValue: 0,
          lastContactedAt: lead.lastContactedAt || lead.createdAt,
          leadIds: [],
        };
      }
      contactMap[key].totalDeals += 1;
      contactMap[key].totalValue += lead.value || 0;
      contactMap[key].leadIds.push(lead._id);
      if (lead.phone && !contactMap[key].phone) contactMap[key].phone = lead.phone;
      if (lead.companyName && !contactMap[key].company) contactMap[key].company = lead.companyName;
    });

    // Process clients into contacts
    clients.forEach((client) => {
      const key = (client.email || client.name).toLowerCase().trim();
      if (contactMap[key]) {
        contactMap[key].type = 'Converted Client Contact';
        contactMap[key].clientId = client._id;
      } else {
        contactMap[key] = {
          name: client.name,
          email: client.email || '',
          phone: client.phone || client.whatsapp || '',
          company: client.company || '',
          designation: 'Client',
          type: 'Client Contact',
          totalDeals: 0,
          totalValue: 0,
          lastContactedAt: client.createdAt,
          clientId: client._id,
          leadIds: [],
        };
      }
    });

    let contacts = Object.values(contactMap);

    if (search) {
      contacts = contacts.filter(
        (c) =>
          c.name.toLowerCase().includes(search) ||
          c.email.toLowerCase().includes(search) ||
          c.company.toLowerCase().includes(search) ||
          c.phone.includes(search)
      );
    }

    contacts.sort((a, b) => new Date(b.lastContactedAt) - new Date(a.lastContactedAt));

    return NextResponse.json(contacts);
  } catch (error) {
    console.error('CRM Contacts GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch contacts' }, { status: 500 });
  }
}
