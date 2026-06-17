"use client";

import { useState, useEffect } from "react";
import {
  KeyRound,
  Save,
  Lock,
  CheckCircle2,
  XCircle,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  Zap,
  Brain,
  Cloud,
  Cpu,
  Terminal,
} from "lucide-react";
import { useNotification } from "@/components/NotificationProvider";

const PROVIDERS = [
  {
    id: "gemini",
    name: "Google Gemini",
    description: "Gemini 2.5 Flash — Powers the workspace AI assistant",
    icon: Sparkles,
    color: "#4285F4",
    gradient: "linear-gradient(135deg, #4285F4 0%, #34A853 100%)",
    glowColor: "rgba(66, 133, 244, 0.25)",
    placeholder: "e.g. AIzaSy...",
    docsUrl: "https://aistudio.google.com/apikey",
  },
  {
    id: "openai",
    name: "OpenAI",
    description: "GPT-4o, GPT-4o Mini — Chat completions API",
    icon: Zap,
    color: "#10a37f",
    gradient: "linear-gradient(135deg, #10a37f 0%, #0d8c6d 100%)",
    glowColor: "rgba(16, 163, 127, 0.25)",
    placeholder: "e.g. sk-proj-...",
    docsUrl: "https://platform.openai.com/api-keys",
  },
  {
    id: "claude",
    name: "Anthropic Claude",
    description: "Claude Sonnet 4, Opus 4 — Messages API",
    icon: Brain,
    color: "#D97757",
    gradient: "linear-gradient(135deg, #D97757 0%, #c4623f 100%)",
    glowColor: "rgba(217, 119, 87, 0.25)",
    placeholder: "e.g. sk-ant-api03-...",
    docsUrl: "https://console.anthropic.com/settings/keys",
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    description: "Nemotron Ultra 550B — NIM inference API",
    icon: Cpu,
    color: "#76B900",
    gradient: "linear-gradient(135deg, #76B900 0%, #5a8f00 100%)",
    glowColor: "rgba(118, 185, 0, 0.25)",
    placeholder: "e.g. nvapi-...",
    docsUrl: "https://build.nvidia.com/",
  },
  {
    id: "grok",
    name: "xAI Grok",
    description: "Grok 4.3 — Chat completions API",
    icon: Terminal,
    color: "#8B5CF6",
    gradient: "linear-gradient(135deg, #8B5CF6 0%, #6D28D9 100%)",
    glowColor: "rgba(139, 92, 246, 0.25)",
    placeholder: "e.g. xai-...",
    docsUrl: "https://console.x.ai/",
  },
];

export default function AIKeysSettingsPage() {
  const { showToast } = useNotification();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState("");

  // Keys entered by the user (real values for editing)
  const [keys, setKeys] = useState({
    gemini: "",
    openai: "",
    claude: "",
    nvidia: "",
    grok: "",
  });

  // Server-side provider status
  const [providerStatus, setProviderStatus] = useState({});

  // Visibility toggles per provider
  const [visibility, setVisibility] = useState({
    gemini: false,
    openai: false,
    claude: false,
    nvidia: false,
    grok: false,
  });

  // Testing state per provider
  const [testing, setTesting] = useState({});
  const [testResults, setTestResults] = useState({});

  // 1. Load current user + existing key config
  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);

        // Get user role
        const meRes = await fetch("/api/auth/me");
        if (meRes.ok) {
          const meData = await meRes.json();
          setRole(meData.role);
        }

        // Get existing key configuration
        const keysRes = await fetch("/api/settings/ai-keys");
        if (keysRes.ok) {
          const keysData = await keysRes.json();
          const newKeys = {};
          const newStatus = {};

          for (const provider of PROVIDERS) {
            const info = keysData.providers?.[provider.id];
            newKeys[provider.id] = info?.maskedKey || "";
            newStatus[provider.id] = {
              configured: info?.configured || false,
            };
          }

          setKeys(newKeys);
          setProviderStatus(newStatus);
        }
      } catch (e) {
        console.error(e);
        showToast("Error loading AI key configuration", "error");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  // 2. Save all keys
  const handleSave = async () => {
    if (!isAdmin) {
      showToast("Only admins can modify AI integrations.", "error");
      return;
    }

    try {
      setSaving(true);
      const res = await fetch("/api/settings/ai-keys", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(keys),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || "API keys saved successfully!", "success");
        // Reload status from server
        const refreshRes = await fetch("/api/settings/ai-keys");
        if (refreshRes.ok) {
          const refreshData = await refreshRes.json();
          const newStatus = {};
          const newKeys = {};
          for (const provider of PROVIDERS) {
            const info = refreshData.providers?.[provider.id];
            newKeys[provider.id] = info?.maskedKey || "";
            newStatus[provider.id] = { configured: info?.configured || false };
          }
          setKeys(newKeys);
          setProviderStatus(newStatus);
          setTestResults({});
        }
      } else {
        showToast(data.error || "Failed to save API keys.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error saving API keys.", "error");
    } finally {
      setSaving(false);
    }
  };

  // 3. Test individual provider
  const handleTest = async (providerId) => {
    const key = keys[providerId];
    if (!key) {
      showToast(
        "Please enter and save an API key first before testing.",
        "error",
      );
      return;
    }

    setTesting((prev) => ({ ...prev, [providerId]: true }));
    setTestResults((prev) => ({ ...prev, [providerId]: null }));

    try {
      const res = await fetch("/api/settings/ai-keys", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: providerId, apiKey: key }),
      });

      const data = await res.json();
      setTestResults((prev) => ({ ...prev, [providerId]: data }));

      if (data.success) {
        showToast(data.message, "success");
      } else {
        showToast(data.message || data.error || "Test failed", "error");
      }
    } catch (e) {
      console.error(e);
      setTestResults((prev) => ({
        ...prev,
        [providerId]: {
          success: false,
          message: "Network error. Could not reach test endpoint.",
        },
      }));
      showToast("Network error during test.", "error");
    } finally {
      setTesting((prev) => ({ ...prev, [providerId]: false }));
    }
  };

  const isAdmin = role === "company_admin" || role === "superadmin";

  if (loading) {
    return (
      <div
        style={{
          padding: "3rem",
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        <RefreshCw
          size={24}
          className="animate-spin"
          style={{
            display: "inline-block",
            marginBottom: "0.75rem",
            color: "var(--accent-primary)",
          }}
        />
        <div>Loading AI integration settings...</div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in" style={{ maxWidth: "1000px" }}>
      {/* Page Header */}
      <div className="page-header" style={{ marginBottom: "1.5rem" }}>
        <div>
          <h1
            className="page-title"
            style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}
          >
            <Cloud
              size={26}
              style={{
                color: "var(--accent-primary)",
                filter: "drop-shadow(0 0 6px var(--accent-primary-glow))",
              }}
            />
            AI Integrations
          </h1>
          <p className="page-subtitle">
            Configure API keys for AI providers. Keys are stored securely
            per-company and used to power the workspace assistant and future AI
            features.
          </p>
        </div>
      </div>

      {/* Admin-only warning for non-admins */}
      {!isAdmin && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            padding: "1rem",
            borderRadius: "12px",
            background: "rgba(245, 158, 11, 0.1)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            color: "#fbbf24",
            fontSize: "0.85rem",
            marginBottom: "1.5rem",
          }}
        >
          <Lock size={16} />
          <span>
            You have read-only access. Only Company Administrators can manage AI
            API keys.
          </span>
        </div>
      )}

      {/* Provider Cards Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(440px, 1fr))",
          gap: "1.25rem",
          marginBottom: "2rem",
        }}
      >
        {PROVIDERS.map((provider) => {
          const Icon = provider.icon;
          const status = providerStatus[provider.id] || {};
          const result = testResults[provider.id];
          const isTesting = testing[provider.id];
          const isVisible = visibility[provider.id];
          const keyValue = keys[provider.id] || "";

          return (
            <div
              key={provider.id}
              className="card"
              style={{
                padding: "0",
                overflow: "hidden",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
                position: "relative",
              }}
            >
              {/* Top accent bar */}
              <div
                style={{
                  height: "3px",
                  background: provider.gradient,
                  opacity: status.configured ? 1 : 0.3,
                  transition: "opacity 0.3s ease",
                }}
              />

              <div style={{ padding: "1.5rem" }}>
                {/* Provider Header */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginBottom: "1rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.75rem",
                    }}
                  >
                    <div
                      style={{
                        width: "40px",
                        height: "40px",
                        borderRadius: "12px",
                        background: `linear-gradient(135deg, ${provider.color}22 0%, ${provider.color}11 100%)`,
                        border: `1px solid ${provider.color}33`,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: `0 2px 8px ${provider.glowColor}`,
                      }}
                    >
                      <Icon size={20} style={{ color: provider.color }} />
                    </div>
                    <div>
                      <h3
                        style={{
                          fontSize: "1rem",
                          fontWeight: 700,
                          color: "var(--text-primary)",
                          margin: 0,
                        }}
                      >
                        {provider.name}
                      </h3>
                      <p
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          margin: 0,
                          marginTop: "2px",
                        }}
                      >
                        {provider.description}
                      </p>
                    </div>
                  </div>

                  {/* Status Badge */}
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "0.3rem 0.65rem",
                      borderRadius: "20px",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      background: status.configured
                        ? "rgba(16, 185, 129, 0.1)"
                        : "rgba(245, 158, 11, 0.1)",
                      color: status.configured ? "#10b981" : "#f59e0b",
                      border: `1px solid ${status.configured ? "rgba(16, 185, 129, 0.2)" : "rgba(245, 158, 11, 0.2)"}`,
                    }}
                  >
                    {status.configured ? (
                      <CheckCircle2 size={11} />
                    ) : (
                      <XCircle size={11} />
                    )}
                    <span>
                      {status.configured ? "CONFIGURED" : "NOT SET"}
                    </span>
                  </div>
                </div>

                {/* API Key Input */}
                <div style={{ marginBottom: "0.75rem" }}>
                  <label
                    style={{
                      display: "block",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                      marginBottom: "0.4rem",
                    }}
                  >
                    API Key
                  </label>
                  <div
                    style={{
                      display: "flex",
                      gap: "0.4rem",
                      alignItems: "stretch",
                    }}
                  >
                    <div
                      style={{
                        flex: 1,
                        position: "relative",
                        display: "flex",
                        alignItems: "center",
                      }}
                    >
                      <input
                        type={isVisible ? "text" : "password"}
                        className="form-input"
                        placeholder={provider.placeholder}
                        value={keyValue}
                        onChange={(e) =>
                          setKeys((prev) => ({
                            ...prev,
                            [provider.id]: e.target.value,
                          }))
                        }
                        disabled={!isAdmin}
                        style={{
                          width: "100%",
                          paddingRight: "2.5rem",
                          fontSize: "0.85rem",
                          fontFamily: "monospace",
                        }}
                        id={`ai-key-${provider.id}`}
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setVisibility((prev) => ({
                            ...prev,
                            [provider.id]: !prev[provider.id],
                          }))
                        }
                        style={{
                          position: "absolute",
                          right: "8px",
                          background: "transparent",
                          border: "none",
                          color: "var(--text-muted)",
                          cursor: "pointer",
                          padding: "4px",
                          display: "flex",
                          alignItems: "center",
                        }}
                        title={isVisible ? "Hide key" : "Show key"}
                      >
                        {isVisible ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Actions Row */}
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    gap: "0.5rem",
                  }}
                >
                  {/* Test Button */}
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => handleTest(provider.id)}
                      disabled={isTesting || !keyValue}
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        padding: "0.5rem 1rem",
                        borderRadius: "8px",
                        border: `1px solid ${provider.color}44`,
                        background: `${provider.color}0d`,
                        color: isTesting
                          ? "var(--text-muted)"
                          : provider.color,
                        cursor:
                          isTesting || !keyValue ? "not-allowed" : "pointer",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                        transition: "all 0.2s ease",
                        opacity: !keyValue ? 0.5 : 1,
                      }}
                      id={`test-${provider.id}`}
                    >
                      {isTesting ? (
                        <RefreshCw size={13} className="animate-spin" />
                      ) : (
                        <Zap size={13} />
                      )}
                      <span>
                        {isTesting ? "Testing..." : "Test Connection"}
                      </span>
                    </button>
                  )}

                  {/* Docs Link */}
                  <a
                    href={provider.docsUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      fontSize: "0.72rem",
                      color: "var(--text-muted)",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      transition: "color 0.2s",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.color = provider.color)
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.color = "var(--text-muted)")
                    }
                  >
                    <KeyRound size={11} />
                    <span>Get API Key →</span>
                  </a>
                </div>

                {/* Test Result Banner */}
                {result && (
                  <div
                    style={{
                      marginTop: "0.75rem",
                      padding: "0.75rem 1rem",
                      borderRadius: "10px",
                      background: result.success
                        ? "rgba(16, 185, 129, 0.08)"
                        : "rgba(239, 68, 68, 0.08)",
                      border: `1px solid ${result.success ? "rgba(16, 185, 129, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.35rem",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.4rem",
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: result.success ? "#10b981" : "#ef4444",
                      }}
                    >
                      {result.success ? (
                        <CheckCircle2 size={14} />
                      ) : (
                        <XCircle size={14} />
                      )}
                      <span>{result.message}</span>
                    </div>
                    {result.response && (
                      <div
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          fontFamily: "monospace",
                          padding: "0.4rem 0.6rem",
                          background: "var(--bg-primary)",
                          borderRadius: "6px",
                          border: "1px solid var(--border-color)",
                          wordBreak: "break-all",
                        }}
                      >
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

      {/* Save All Keys Button */}
      {isAdmin && (
        <div style={{ maxWidth: "440px" }}>
          <button
            type="button"
            onClick={handleSave}
            className="btn btn-primary"
            disabled={saving}
            style={{
              width: "100%",
              height: "44px",
              display: "flex",
              gap: "0.5rem",
              justifyContent: "center",
              alignItems: "center",
              fontSize: "0.9rem",
              fontWeight: 700,
            }}
            id="save-ai-keys"
          >
            <Save size={18} />
            <span>
              {saving ? "Saving keys..." : "Save All API Keys"}
            </span>
          </button>
        </div>
      )}

      {/* Info Footer */}
      <div
        style={{
          marginTop: "2rem",
          padding: "1.25rem",
          borderRadius: "12px",
          background: "rgba(0, 174, 239, 0.04)",
          border: "1px solid rgba(0, 174, 239, 0.12)",
          fontSize: "0.82rem",
          lineHeight: "1.6",
          color: "var(--text-secondary)",
        }}
      >
        <strong
          style={{
            color: "var(--accent-primary)",
            display: "block",
            marginBottom: "4px",
          }}
        >
          🔒 Security Information
        </strong>
        API keys are stored securely in your company's database record and are
        never exposed in environment files or client-side code. Only company
        administrators can view, modify, or test API keys. Keys are masked in
        the UI after saving.
      </div>

      <style jsx>{`
        @media (max-width: 520px) {
          div[style*="gridTemplateColumns"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
