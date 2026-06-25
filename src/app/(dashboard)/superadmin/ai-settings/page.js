"use client";

import { useState, useEffect } from "react";
import {
  KeyRound, Save, CheckCircle2, XCircle, Eye, EyeOff, RefreshCw,
  Sparkles, Zap, Brain, Cpu, Radio, Shield, Terminal,
} from "lucide-react";
import { useNotification } from "@/components/NotificationProvider";

const PROVIDERS = [
  {
    id: "gemini", name: "Google Gemini",
    description: "Gemini 2.5 Flash — Recommended for workspace AI",
    icon: Sparkles, color: "#4285F4",
    gradient: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)",
    glowColor: "rgba(66, 133, 244, 0.25)", placeholder: "e.g. AIzaSy...",
    docsUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "openai", name: "OpenAI",
    description: "GPT-4o, GPT-4o Mini — Chat completions API",
    icon: Zap, color: "#10a37f",
    gradient: "linear-gradient(135deg, #10a37f 0%, #0d8c6d 100%)",
    glowColor: "rgba(16, 163, 127, 0.25)", placeholder: "e.g. sk-proj-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "claude", name: "Anthropic Claude",
    description: "Claude Sonnet 4, Opus 4 — Messages API",
    icon: Brain, color: "#D97757",
    gradient: "linear-gradient(135deg, #D97757 0%, #c4623f 100%)",
    glowColor: "rgba(217, 119, 87, 0.25)", placeholder: "e.g. sk-ant-api03-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "nvidia", name: "NVIDIA NIM",
    description: "Nemotron Ultra 550B — NIM inference API",
    icon: Cpu, color: "#76B900",
    gradient: "linear-gradient(135deg, #76B900 0%, #5a8f00 100%)",
    glowColor: "rgba(118, 185, 0, 0.25)", placeholder: "e.g. nvapi-...",
    docsUrl: "https://build.nvidia.com/",
  },
  {
    id: "grok", name: "xAI Grok",
    description: "Grok 4.3 — Chat completions API",
    icon: Terminal, color: "#8B5CF6",
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
    glowColor: "rgba(139, 92, 246, 0.25)", placeholder: "e.g. xai-...",
    docsUrl: "https://console.x.ai/",
  },
];

export default function SuperAdminAISettingsPage() {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeProvider, setActiveProvider] = useState("gemini");
  const [keys, setKeys] = useState({ gemini: "", openai: "", claude: "", nvidia: "", grok: "" });
  const [providerStatus, setProviderStatus] = useState({});
  const [visibility, setVisibility] = useState({ gemini: false, openai: false, claude: false, nvidia: false, grok: false });
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});
  const [uploadCode, setUploadCode] = useState("");
  const [savingUploadCode, setSavingUploadCode] = useState(false);
  const [switchingTo, setSwitchingTo] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    try {
      setLoading(true);
      const res = await fetch("/api/superadmin/ai-settings");
      if (res.ok) {
        const data = await res.json();
        setActiveProvider(data.activeProvider || "gemini");
        const newKeys = {}, newStatus = {};
        for (const p of PROVIDERS) {
          const info = data.providers?.[p.id];
          newKeys[p.id] = info?.maskedKey || "";
          newStatus[p.id] = { configured: info?.configured || false };
        }
        setKeys(newKeys);
        setProviderStatus(newStatus);
        setUploadCode(data.uploadCode || "ABC012");
      } else {
        showToast("Failed to load AI settings.", "error");
      }
    } catch (e) {
      showToast("Error loading AI settings.", "error");
    } finally {
      setLoading(false);
    }
  }

  const handleSaveUploadCode = async () => {
    try {
      setSavingUploadCode(true);
      const res = await fetch("/api/superadmin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uploadCode }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast("Uploading Platform Access Code saved successfully.", "success");
      } else {
        showToast(data.error || "Failed to save code.", "error");
      }
    } catch {
      showToast("Error saving code.", "error");
    } finally {
      setSavingUploadCode(false);
    }
  };

  const handleSaveKey = async (providerId) => {
    const key = keys[providerId];
    if (!key || key.includes("••••")) {
      showToast("Please enter a valid API key.", "error");
      return;
    }
    try {
      setSaving(true);
      const res = await fetch("/api/superadmin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [providerId]: key }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`${PROVIDERS.find(p => p.id === providerId)?.name} key saved.`, "success");
        await loadData();
      } else {
        showToast(data.error || "Failed to save key.", "error");
      }
    } catch {
      showToast("Error saving key.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleSetActive = async (providerId) => {
    if (providerId === activeProvider) return;
    try {
      setSwitchingTo(providerId);
      const res = await fetch("/api/superadmin/ai-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ activeProvider: providerId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActiveProvider(providerId);
        showToast(`Switched to ${PROVIDERS.find(p => p.id === providerId)?.name} for all companies.`, "success");
      } else {
        showToast(data.error || "Failed to switch provider.", "error");
      }
    } catch {
      showToast("Error switching provider.", "error");
    } finally {
      setSwitchingTo(null);
    }
  };

  const handleTest = async (providerId) => {
    setTesting(prev => ({ ...prev, [providerId]: true }));
    setTestResults(prev => ({ ...prev, [providerId]: null }));
    try {
      const res = await fetch("/api/superadmin/ai-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, apiKey: keys[providerId] }),
      });
      const data = await res.json();
      setTestResults(prev => ({ ...prev, [providerId]: data }));
      showToast(data.success ? data.message : (data.message || "Test failed"), data.success ? "success" : "error");
    } catch {
      setTestResults(prev => ({ ...prev, [providerId]: { success: false, message: "Network error." } }));
      showToast("Network error during test.", "error");
    } finally {
      setTesting(prev => ({ ...prev, [providerId]: false }));
    }
  };

  if (loading) {
    return (
      <div style={{ padding: "3rem", textAlign: "center", color: "var(--text-secondary)" }}>
        <RefreshCw size={24} className="animate-spin" style={{ display: "inline-block", marginBottom: "0.75rem", color: "var(--accent-primary)" }} />
        <div>Loading AI settings...</div>
      </div>
    );
  }

  const activeProviderMeta = PROVIDERS.find(p => p.id === activeProvider);

  return (
    <div className="animate-fade-in" style={{ maxWidth: "100%", width: "100%" }}>
      {/* Header */}
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1 className="page-title" style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
            <Shield size={26} style={{ color: "var(--accent-primary)", filter: "drop-shadow(0 0 6px var(--accent-primary-glow))" }} />
            Platform AI Settings
          </h1>
          <p className="page-subtitle">
            Configure the global AI provider used by all companies. Only you (superadmin) can manage this.
          </p>
        </div>
      </div>

      {/* Active Provider Banner */}
      <div style={{
        marginBottom: "1.75rem", padding: "1rem 1.25rem", borderRadius: "14px",
        background: `linear-gradient(135deg, ${activeProviderMeta?.color}18 0%, ${activeProviderMeta?.color}08 100%)`,
        border: `1px solid ${activeProviderMeta?.color}40`,
        display: "flex", alignItems: "center", gap: "0.75rem",
      }}>
        <span style={{ width: "10px", height: "10px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 8px #10b981", flexShrink: 0 }} />
        <span style={{ fontSize: "0.88rem", color: "var(--text-primary)", fontWeight: 600 }}>
          Currently Active: <span style={{ color: activeProviderMeta?.color }}>{activeProviderMeta?.name}</span>
        </span>
        <span style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginLeft: "auto" }}>
          All company AI chats are powered by this provider&apos;s key
        </span>
      </div>

      {/* Provider Cards */}
      <div className="provider-grid" style={{ marginBottom: "2rem" }}>
        {PROVIDERS.map((provider) => {
          const Icon = provider.icon;
          const status = providerStatus[provider.id] || {};
          const result = testResults[provider.id];
          const isTesting = testing[provider.id];
          const isVisible = visibility[provider.id];
          const keyValue = keys[provider.id] || "";
          const isActive = activeProvider === provider.id;
          const isSwitching = switchingTo === provider.id;

          return (
            <div key={provider.id} className="card" style={{
              padding: "0", overflow: "hidden", transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              outline: isActive ? `2px solid ${provider.color}66` : "none",
              outlineOffset: "2px",
            }}>
              {/* Top accent bar */}
              <div style={{ height: "3px", background: provider.gradient, opacity: isActive ? 1 : 0.3, transition: "opacity 0.3s ease" }} />

              <div style={{ padding: "1.5rem" }}>
                {/* Provider Header */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1rem" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                    <div style={{
                      width: "40px", height: "40px", borderRadius: "12px",
                      background: `linear-gradient(135deg, ${provider.color}22 0%, ${provider.color}11 100%)`,
                      border: `1px solid ${provider.color}33`, display: "flex", alignItems: "center",
                      justifyContent: "center", boxShadow: `0 2px 8px ${provider.glowColor}`,
                    }}>
                      <Icon size={20} style={{ color: provider.color }} />
                    </div>
                    <div>
                      <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0 }}>{provider.name}</h3>
                      <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, marginTop: "2px" }}>{provider.description}</p>
                    </div>
                  </div>

                  {/* Active / Configured Badge */}
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "4px" }}>
                    {isActive ? (
                      <div style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        padding: "0.3rem 0.7rem", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700,
                        background: "rgba(16, 185, 129, 0.12)", color: "#10b981",
                        border: "1px solid rgba(16, 185, 129, 0.25)",
                      }}>
                        <span style={{ width: "6px", height: "6px", borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981" }} />
                        ACTIVE
                      </div>
                    ) : (
                      <div style={{
                        display: "flex", alignItems: "center", gap: "4px",
                        padding: "0.3rem 0.65rem", borderRadius: "20px", fontSize: "0.7rem", fontWeight: 700,
                        background: status.configured ? "rgba(16, 185, 129, 0.08)" : "rgba(245, 158, 11, 0.1)",
                        color: status.configured ? "#10b981" : "#f59e0b",
                        border: `1px solid ${status.configured ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
                      }}>
                        {status.configured ? <CheckCircle2 size={11} /> : <XCircle size={11} />}
                        {status.configured ? "CONFIGURED" : "NOT SET"}
                      </div>
                    )}
                  </div>
                </div>

                {/* API Key Input */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <label style={{ display: "block", fontSize: "0.78rem", fontWeight: 600, color: "var(--text-secondary)", marginBottom: "0.4rem" }}>
                    API Key
                  </label>
                  <div style={{ display: "flex", gap: "0.4rem", alignItems: "stretch" }}>
                    <div style={{ flex: 1, position: "relative", display: "flex", alignItems: "center" }}>
                      <input
                        type={isVisible ? "text" : "password"}
                        className="form-input"
                        placeholder={provider.placeholder}
                        value={keyValue}
                        onChange={(e) => setKeys(prev => ({ ...prev, [provider.id]: e.target.value }))}
                        style={{ width: "100%", paddingRight: "2.5rem", fontSize: "0.85rem", fontFamily: "monospace" }}
                        id={`ai-key-${provider.id}`}
                      />
                      <button type="button"
                        onClick={() => setVisibility(prev => ({ ...prev, [provider.id]: !prev[provider.id] }))}
                        style={{ position: "absolute", right: "8px", background: "transparent", border: "none", color: "var(--text-muted)", cursor: "pointer", padding: "4px", display: "flex", alignItems: "center" }}
                        title={isVisible ? "Hide key" : "Show key"}
                      >
                        {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                    {/* Save Key Button */}
                    <button
                      type="button"
                      onClick={() => handleSaveKey(provider.id)}
                      disabled={saving || !keyValue || keyValue.includes("••••")}
                      style={{
                        padding: "0 0.85rem", borderRadius: "8px", border: `1px solid ${provider.color}44`,
                        background: `${provider.color}15`, color: provider.color, cursor: "pointer",
                        fontSize: "0.78rem", fontWeight: 700, transition: "all 0.2s",
                        display: "flex", alignItems: "center", gap: "4px", flexShrink: 0,
                        opacity: saving || !keyValue || keyValue.includes("••••") ? 0.4 : 1,
                      }}
                      id={`save-${provider.id}`}
                    >
                      <Save size={13} />
                      <span>Save</span>
                    </button>
                  </div>
                </div>

                {/* Actions Row */}
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "0.5rem", flexWrap: "wrap" }}>
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    {/* Test Button */}
                    <button type="button" onClick={() => handleTest(provider.id)}
                      disabled={isTesting || !keyValue}
                      style={{
                        display: "inline-flex", alignItems: "center", gap: "0.4rem",
                        padding: "0.45rem 0.85rem", borderRadius: "8px",
                        border: `1px solid ${provider.color}44`, background: `${provider.color}0d`,
                        color: isTesting ? "var(--text-muted)" : provider.color,
                        cursor: isTesting || !keyValue ? "not-allowed" : "pointer",
                        fontSize: "0.78rem", fontWeight: 600, transition: "all 0.2s",
                        opacity: !keyValue ? 0.5 : 1,
                      }}
                      id={`test-${provider.id}`}
                    >
                      {isTesting ? <RefreshCw size={12} className="animate-spin" /> : <Zap size={12} />}
                      <span>{isTesting ? "Testing..." : "Test"}</span>
                    </button>

                    {/* Set as Active Button */}
                    {!isActive && (
                      <button type="button" onClick={() => handleSetActive(provider.id)}
                        disabled={isSwitching || !status.configured}
                        style={{
                          display: "inline-flex", alignItems: "center", gap: "0.4rem",
                          padding: "0.45rem 0.85rem", borderRadius: "8px",
                          border: "1px solid rgba(16, 185, 129, 0.3)", background: "rgba(16, 185, 129, 0.1)",
                          color: "#10b981", cursor: isSwitching || !status.configured ? "not-allowed" : "pointer",
                          fontSize: "0.78rem", fontWeight: 700, transition: "all 0.2s",
                          opacity: !status.configured ? 0.5 : 1,
                        }}
                        title={!status.configured ? "Save an API key first before activating this provider" : ""}
                        id={`activate-${provider.id}`}
                      >
                        {isSwitching ? <RefreshCw size={12} className="animate-spin" /> : <Radio size={12} />}
                        <span>{isSwitching ? "Switching..." : "Set as Active"}</span>
                      </button>
                    )}
                  </div>

                  {/* Docs Link */}
                  <a href={provider.docsUrl} target="_blank" rel="noopener noreferrer"
                    style={{ fontSize: "0.72rem", color: "var(--text-muted)", textDecoration: "none", display: "flex", alignItems: "center", gap: "4px", transition: "color 0.2s" }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = provider.color)}
                    onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
                  >
                    <KeyRound size={11} />
                    <span>Get API Key →</span>
                  </a>
                </div>

                {/* Test Result */}
                {result && (
                  <div style={{
                    marginTop: "0.75rem", padding: "0.75rem 1rem", borderRadius: "10px",
                    background: result.success ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                    border: `1px solid ${result.success ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                    display: "flex", flexDirection: "column", gap: "0.35rem",
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "0.4rem", fontSize: "0.82rem", fontWeight: 600, color: result.success ? "#10b981" : "#ef4444" }}>
                      {result.success ? <CheckCircle2 size={14} /> : <XCircle size={14} />}
                      <span>{result.message}</span>
                    </div>
                    {result.response && (
                      <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace", padding: "0.4rem 0.6rem", background: "var(--bg-primary)", borderRadius: "6px", border: "1px solid var(--border-color)", wordBreak: "break-all" }}>
                        {result.response}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Uploading Platform Code Configuration */}
      <div className="card" style={{ padding: "1.5rem", marginBottom: "2rem" }}>
        <h3 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--text-primary)", margin: 0, marginBottom: "0.5rem" }}>
          Uploading Platform Access Code
        </h3>
        <p style={{ fontSize: "0.75rem", color: "var(--text-muted)", margin: 0, marginBottom: "1rem" }}>
          Configure the passcode required by users to authenticate on the uploading platform.
        </p>
        
        <div style={{ display: "flex", gap: "0.5rem", maxWidth: "400px" }}>
          <input
            type="text"
            className="form-input"
            value={uploadCode}
            onChange={(e) => setUploadCode(e.target.value)}
            placeholder="e.g. ABC012"
            style={{ flex: 1, fontFamily: "monospace", fontSize: "0.9rem", fontWeight: 600 }}
          />
          <button
            type="button"
            className="btn btn-primary"
            onClick={handleSaveUploadCode}
            disabled={savingUploadCode || !uploadCode.trim()}
            style={{ display: "flex", alignItems: "center", gap: "0.35rem", padding: "0.5rem 1rem", fontSize: "0.8rem" }}
          >
            {savingUploadCode ? <RefreshCw size={14} className="animate-spin" /> : <Save size={14} />}
            <span>Save Code</span>
          </button>
        </div>
      </div>

      {/* Info Footer */}
      <div style={{
        padding: "1.25rem", borderRadius: "12px",
        background: "rgba(0, 174, 239, 0.04)", border: "1px solid rgba(0, 174, 239, 0.12)",
        fontSize: "0.82rem", lineHeight: "1.6", color: "var(--text-secondary)",
      }}>
        <strong style={{ color: "var(--accent-primary)", display: "block", marginBottom: "4px" }}>
          🔒 Platform Security
        </strong>
        API keys are stored securely in the platform database. Companies only use the AI chat — they cannot view, modify, or add any API keys. All AI usage credits are billed to the active provider key configured here.
      </div>

      <style jsx>{`
        .provider-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 1.25rem;
        }
        @media (max-width: 1100px) {
          .provider-grid {
            grid-template-columns: repeat(2, 1fr);
          }
        }
        @media (max-width: 768px) {
          .provider-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
}
