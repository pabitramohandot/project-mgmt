'use client';

import AIChatBot from '@/components/AIChatBot';
import { Brain, Sparkles } from 'lucide-react';

export default function AIAgentsPage() {
  return (
    <div className="animate-fade-in" style={{ height: 'calc(100vh - 9.5rem)', display: 'flex', flexDirection: 'column', gap: '1.5rem', overflow: 'hidden' }}>
      <div className="page-header" style={{ marginBottom: 0 }}>
        <div>
          <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Brain size={28} style={{ color: '#ef4444', filter: 'drop-shadow(0 0 6px rgba(239, 68, 68, 0.5))' }} />
            <span>AI Workspace Agent</span>
          </h1>
          <p className="page-subtitle">
            Query your database, compile project status metrics, or automate invoice emails in natural language.
          </p>
        </div>
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'stretch', minHeight: 0 }}>
        <div style={{ width: '100%', display: 'flex', flexDirection: 'column', minHeight: 0 }}>
          <AIChatBot />
        </div>
      </div>
    </div>
  );
}
