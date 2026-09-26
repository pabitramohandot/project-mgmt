import dbConnect from '@/lib/db';
import Lead from '@/models/Lead';
import LeadActivity from '@/models/LeadActivity';
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

    // 1. All leads under company
    const leads = await Lead.find({ companyId }).populate('assignedTo', 'name email').lean();

    const totalLeads = leads.length;
    let totalPipelineValue = 0;
    let totalWonValue = 0;
    let wonCount = 0;
    let lostCount = 0;

    const stageMap = {
      new: { label: 'New Lead', count: 0, value: 0 },
      contacted: { label: 'Contacted', count: 0, value: 0 },
      qualified: { label: 'Qualified', count: 0, value: 0 },
      proposal: { label: 'Proposal Sent', count: 0, value: 0 },
      negotiation: { label: 'Negotiation', count: 0, value: 0 },
      won: { label: 'Won', count: 0, value: 0 },
      lost: { label: 'Lost', count: 0, value: 0 },
    };

    const sourceMap = {};

    leads.forEach((l) => {
      const val = l.value || 0;
      if (l.stage === 'won') {
        totalWonValue += val;
        wonCount += 1;
      } else if (l.stage === 'lost') {
        lostCount += 1;
      } else {
        totalPipelineValue += val;
      }

      if (stageMap[l.stage]) {
        stageMap[l.stage].count += 1;
        stageMap[l.stage].value += val;
      }

      const src = l.source || 'Other';
      if (!sourceMap[src]) {
        sourceMap[src] = 0;
      }
      sourceMap[src] += 1;
    });

    const totalClosed = wonCount + lostCount;
    const winRate = totalClosed > 0 ? Math.round((wonCount / totalClosed) * 100) : 0;

    // Recent leads (sorted by createdAt desc)
    const recentLeads = [...leads]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5);

    // Upcoming activities
    const upcomingActivities = await LeadActivity.find({ companyId, isDone: false })
      .populate('leadId', 'title contactName companyName stage')
      .populate('performedBy', 'name email')
      .sort({ scheduledAt: 1 })
      .limit(6)
      .lean();

    return NextResponse.json({
      totalLeads,
      totalPipelineValue,
      totalWonValue,
      wonCount,
      lostCount,
      winRate,
      stageBreakdown: stageMap,
      sourceBreakdown: sourceMap,
      recentLeads,
      upcomingActivities,
    });
  } catch (error) {
    console.error('CRM Dashboard GET Error:', error);
    return NextResponse.json({ error: 'Failed to fetch CRM dashboard stats' }, { status: 500 });
  }
}
