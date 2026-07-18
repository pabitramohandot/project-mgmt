"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Building, ShieldCheck, Save, Pencil, MessageSquare, Folder, Clock, Activity } from "lucide-react";
import { useNotification } from "@/components/NotificationProvider";

export default function EditCompanyPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const searchParams = useSearchParams();
  const isViewOnly = searchParams.get("view") === "true";
  const { showToast } = useNotification();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);
  const [stats, setStats] = useState({ projectCount: 0, clientCount: 0, aiMessagesCount: 0 });
  const [loginHistory, setLoginHistory] = useState([]);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    logo: "",
    tagline: "",
    primaryColor: "#00aeef",
    secondaryColor: "#f26522",
    contactEmail: "",
    isActive: true,
    projectLimit: 0,
    clientLimit: 0,
    employeeLimit: 0,
  });

  useEffect(() => {
    async function loadCompanyData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/superadmin/companies/${id}`);
        if (res.ok) {
          const data = await res.json();
          const { company, users: companyUsers, stats: companyStats, loginHistory: companyHistory } = data;
          setForm({
            name: company.name,
            slug: company.slug,
            logo: company.logo || "",
            tagline: company.tagline || "",
            primaryColor: company.brandColors?.primary || "#00aeef",
            secondaryColor: company.brandColors?.secondary || "#f26522",
            contactEmail: company.contactEmail || "",
            isActive: company.isActive,
            projectLimit: company.projectLimit || 0,
            clientLimit: company.clientLimit || 0,
            employeeLimit: company.employeeLimit || 0,
          });
          setUsers(companyUsers);
          if (companyStats) setStats(companyStats);
          if (companyHistory) setLoginHistory(companyHistory);
        } else {
          showToast("Failed to load company details", "error");
          router.push("/superadmin/companies");
        }
      } catch (e) {
        console.error(e);
        showToast("Error loading company details", "error");
      } finally {
        setLoading(false);
      }
    }
    loadCompanyData();
  }, [id]);

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    try {
      setSubmitting(true);
      const res = await fetch(`/api/superadmin/companies/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          slug: form.slug,
          logo: form.logo,
          tagline: form.tagline,
          brandColors: {
            primary: form.primaryColor,
            secondary: form.secondaryColor,
          },
          contactEmail: form.contactEmail,
          isActive: form.isActive,
          projectLimit: form.projectLimit,
          clientLimit: form.clientLimit,
          employeeLimit: form.employeeLimit,
        }),
      });

      if (res.ok) {
        showToast("Company details updated successfully!", "success");
        router.refresh();
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update company.", "error");
      }
    } catch (e) {
      console.error(e);
      showToast("Error updating company details.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div
        style={{
          padding: "3rem",
          textAlign: "center",
          color: "var(--text-secondary)",
        }}
      >
        Loading company details...
      </div>
    );
  }

  return (
    <div className="animate-fade-in">
      <div style={{ marginBottom: "1.5rem" }}>
        <Link
          href="/superadmin/companies"
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "0.5rem",
            color: "var(--text-secondary)",
            fontWeight: 500,
          }}
        >
          <ArrowLeft size={16} />
          <span>Back to Companies</span>
        </Link>
      </div>

      <div className="page-header" style={{ marginBottom: "2rem" }}>
        <div>
          <h1 className="page-title">{isViewOnly ? "Company Details" : "Edit Company Details"}</h1>
          <p className="page-subtitle">
            {isViewOnly
              ? "View branding, URLs, active status, and associated staff accounts."
              : "Customize branding, URLs, active status, and view associated staff accounts."}
          </p>
        </div>
      </div>

      {/* Stats Cards Row (Only in View Mode) */}
      {isViewOnly && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '1rem',
          marginBottom: '2rem'
        }}>
          {/* Projects Card */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ background: 'var(--accent-primary-glow)', color: 'var(--accent-primary)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Folder size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Projects</p>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{stats.projectCount}</h3>
            </div>
          </div>

          {/* Clients Card */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Users size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Total Clients</p>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{stats.clientCount}</h3>
            </div>
          </div>

          {/* AI Messages Card */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ background: 'var(--accent-secondary-glow)', color: 'var(--accent-secondary)', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageSquare size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>AI Messages</p>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{stats.aiMessagesCount}</h3>
            </div>
          </div>

          {/* Staff Members Card */}
          <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1.25rem' }}>
            <div style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6', width: '40px', height: '40px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <ShieldCheck size={20} />
            </div>
            <div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Staff Members</p>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>{users.length}</h3>
            </div>
          </div>
        </div>
      )}

      <div className="grid-2col">
        {/* Edit Form */}
        <div className="card" style={{ padding: "2rem" }}>
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1.5rem",
              fontSize: "1.1rem",
            }}
          >
            <Building size={20} style={{ color: "var(--accent-primary)" }} />
            <span>{isViewOnly ? "Profile details" : "Profile settings"}</span>
          </h2>
          <form onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label className="form-label">Company Name</label>
              <input
                type="text"
                className="form-input"
                value={form.name}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, name: e.target.value }))
                }
                required
                disabled={isViewOnly}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Slug / Route URL</label>
              <input
                type="text"
                className="form-input"
                value={form.slug}
                onChange={(e) =>
                  setForm((prev) => ({
                    ...prev,
                    slug: e.target.value.toLowerCase().replace(/\s+/g, "-"),
                  }))
                }
                required
                disabled={isViewOnly}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Logo Image URL</label>
              <input
                type="text"
                className="form-input"
                value={form.logo}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, logo: e.target.value }))
                }
                disabled={isViewOnly}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Company Tagline / Subtitle</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Development & Consulting Services"
                value={form.tagline}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, tagline: e.target.value }))
                }
                disabled={isViewOnly}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input
                type="email"
                className="form-input"
                value={form.contactEmail}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, contactEmail: e.target.value }))
                }
                disabled={isViewOnly}
              />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Primary Color</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="color"
                    className="form-input"
                    style={{
                      width: "45px",
                      height: "38px",
                      padding: "2px",
                      cursor: isViewOnly ? "default" : "pointer",
                    }}
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        primaryColor: e.target.value,
                      }))
                    }
                    disabled={isViewOnly}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        primaryColor: e.target.value,
                      }))
                    }
                    disabled={isViewOnly}
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Secondary Color</label>
                <div style={{ display: "flex", gap: "0.5rem" }}>
                  <input
                    type="color"
                    className="form-input"
                    style={{
                      width: "45px",
                      height: "38px",
                      padding: "2px",
                      cursor: isViewOnly ? "default" : "pointer",
                    }}
                    value={form.secondaryColor}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        secondaryColor: e.target.value,
                      }))
                    }
                    disabled={isViewOnly}
                  />
                  <input
                    type="text"
                    className="form-input"
                    value={form.secondaryColor}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        secondaryColor: e.target.value,
                      }))
                    }
                    disabled={isViewOnly}
                  />
                </div>
              </div>
            </div>

            <div style={{ margin: "2rem 0", height: "1px", background: "var(--border-color)" }}></div>
            
            <h3 style={{ fontSize: "0.95rem", fontWeight: 600, color: "var(--accent-primary)", marginBottom: "1rem" }}>
              Workspace Creation Limits (0 = Unlimited)
            </h3>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "1rem", marginBottom: "1.5rem" }}>
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Project Limit</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={form.projectLimit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, projectLimit: parseInt(e.target.value) || 0 }))
                  }
                  disabled={isViewOnly}
                />
              </div>
              
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Client Limit</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={form.clientLimit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, clientLimit: parseInt(e.target.value) || 0 }))
                  }
                  disabled={isViewOnly}
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label className="form-label" style={{ fontSize: "0.78rem" }}>Employee Limit</label>
                <input
                  type="number"
                  min="0"
                  className="form-input"
                  value={form.employeeLimit}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, employeeLimit: parseInt(e.target.value) || 0 }))
                  }
                  disabled={isViewOnly}
                />
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: isViewOnly ? "default" : "pointer",
                }}
              >
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, isActive: e.target.checked }))
                  }
                  style={{
                    accentColor: "var(--accent-primary)",
                    width: "18px",
                    height: "18px",
                  }}
                  disabled={isViewOnly}
                />
                <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                  Active Company Status
                </span>
              </label>
            </div>

            {isViewOnly ? (
              <Link
                href={`/superadmin/companies/${id}`}
                className="btn btn-primary"
                style={{
                  width: "100%",
                  marginTop: "1rem",
                  height: "42px",
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "center",
                  alignItems: "center"
                }}
              >
                <Pencil size={18} />
                <span>Edit Company Details</span>
              </Link>
            ) : (
              <button
                type="submit"
                className="btn btn-primary"
                style={{
                  width: "100%",
                  marginTop: "1rem",
                  height: "42px",
                  display: "flex",
                  gap: "0.5rem",
                  justifyContent: "center",
                }}
                disabled={submitting}
              >
                <Save size={18} />
                <span>
                  {submitting ? "Saving changes..." : "Save Company Details"}
                </span>
              </button>
            )}
          </form>
        </div>

        {/* Users list for this company */}
        <div className="card" style={{ padding: "2rem" }}>
          <h2
            style={{
              display: "flex",
              alignItems: "center",
              gap: "0.5rem",
              marginBottom: "1.5rem",
              fontSize: "1.1rem",
            }}
          >
            <Users size={20} style={{ color: "var(--accent-secondary)" }} />
            <span>Associated Staff Accounts ({users.length})</span>
          </h2>

          {users.length === 0 ? (
            <div
              style={{
                padding: "2rem",
                textAlign: "center",
                color: "var(--text-secondary)",
              }}
            >
              No user accounts found for this company. Go to the Users panel to
              create a user and assign them here.
            </div>
          ) : (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              {users.map((u) => (
                <div
                  key={u._id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "1rem",
                    background: "rgba(255,255,255,0.02)",
                    border: "1px solid var(--border-color)",
                    borderRadius: "12px",
                  }}
                >
                  <div>
                    <h4 style={{ fontWeight: 600 }}>{u.username}</h4>
                    <span
                      style={{
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      Created {new Date(u.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "0.5rem",
                    }}
                  >
                    <ShieldCheck
                      size={14}
                      style={{
                        color:
                          u.role === "company_admin"
                            ? "var(--accent-primary)"
                            : "var(--text-muted)",
                      }}
                    />
                    <span
                      style={{
                        fontSize: "0.8rem",
                        textTransform: "capitalize",
                        fontWeight: 500,
                      }}
                    >
                      {u.role.replace("_", " ")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Login History Section (Only in View Mode) */}
      {isViewOnly && (
        <div className="card" style={{ marginTop: '2rem', padding: '2rem' }}>
          <h2 style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            marginBottom: "1.5rem",
            fontSize: "1.1rem",
          }}>
            <Activity size={20} style={{ color: "var(--accent-primary)" }} />
            <span>Login & Session History</span>
          </h2>

          {loginHistory.length === 0 ? (
            <div style={{ padding: "2rem", textAlign: "center", color: "var(--text-secondary)" }}>
              No login sessions recorded yet.
            </div>
          ) : (
            <div className="table-container" style={{ border: 'none' }}>
              <table className="custom-table" style={{ fontSize: '0.85rem' }}>
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Login Time</th>
                    <th>Logout Time</th>
                    <th>Session Duration</th>
                    <th>IP Address</th>
                    <th>Device / Browser</th>
                  </tr>
                </thead>
                <tbody>
                  {loginHistory.map((hist) => {
                    const formatDuration = (sec) => {
                      if (!sec || sec <= 0) return "—";
                      if (sec < 60) return `${sec}s`;
                      const m = Math.floor(sec / 60);
                      const s = sec % 60;
                      if (m < 60) return `${m}m ${s}s`;
                      const h = Math.floor(m / 60);
                      const remM = m % 60;
                      return `${h}h ${remM}m`;
                    };

                    const parseUA = (ua) => {
                      if (!ua) return "Unknown";
                      if (ua.includes("Firefox/")) return "Firefox";
                      if (ua.includes("Chrome/") && ua.includes("Safari/")) return "Chrome";
                      if (ua.includes("Safari/") && !ua.includes("Chrome/")) return "Safari";
                      if (ua.includes("Edge/") || ua.includes("Edg/")) return "Edge";
                      return "Other Browser";
                    };

                    return (
                      <tr key={hist._id}>
                        <td style={{ fontWeight: 600 }}>{hist.username}</td>
                        <td>{new Date(hist.loginTime).toLocaleString('en-IN')}</td>
                        <td>{hist.logoutTime ? new Date(hist.logoutTime).toLocaleString('en-IN') : <span style={{ color: '#10b981', fontWeight: 600 }}>Active Now</span>}</td>
                        <td>
                          {hist.logoutTime ? (
                            formatDuration(hist.duration)
                          ) : (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#10b981' }}>
                              <Clock size={12} className="animate-pulse" />
                              <span>{formatDuration(hist.duration) || "0s"} (Live)</span>
                            </div>
                          )}
                        </td>
                        <td><code>{hist.ipAddress || "—"}</code></td>
                        <td style={{ color: 'var(--text-secondary)', fontSize: '0.78rem' }} title={hist.userAgent}>
                          {parseUA(hist.userAgent)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
