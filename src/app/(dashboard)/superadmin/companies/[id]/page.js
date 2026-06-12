"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Users, Building, ShieldCheck, Save } from "lucide-react";
import { useNotification } from "@/components/NotificationProvider";

export default function EditCompanyPage() {
  const router = useRouter();
  const params = useParams();
  const { id } = params;
  const { showToast } = useNotification();

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [users, setUsers] = useState([]);

  const [form, setForm] = useState({
    name: "",
    slug: "",
    logo: "",
    primaryColor: "#00aeef",
    secondaryColor: "#f26522",
    contactEmail: "",
    isActive: true,
  });

  useEffect(() => {
    async function loadCompanyData() {
      try {
        setLoading(true);
        const res = await fetch(`/api/superadmin/companies/${id}`);
        if (res.ok) {
          const data = await res.json();
          const { company, users: companyUsers } = data;
          setForm({
            name: company.name,
            slug: company.slug,
            logo: company.logo || "",
            primaryColor: company.brandColors?.primary || "#00aeef",
            secondaryColor: company.brandColors?.secondary || "#f26522",
            contactEmail: company.contactEmail || "",
            isActive: company.isActive,
          });
          setUsers(companyUsers);
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
          brandColors: {
            primary: form.primaryColor,
            secondary: form.secondaryColor,
          },
          contactEmail: form.contactEmail,
          isActive: form.isActive,
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
          <h1 className="page-title">Edit Company Details</h1>
          <p className="page-subtitle">
            Customize branding, URLs, active status, and view associated staff
            accounts.
          </p>
        </div>
      </div>

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
            <span>Profile settings</span>
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
                      cursor: "pointer",
                    }}
                    value={form.primaryColor}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        primaryColor: e.target.value,
                      }))
                    }
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
                      cursor: "pointer",
                    }}
                    value={form.secondaryColor}
                    onChange={(e) =>
                      setForm((prev) => ({
                        ...prev,
                        secondaryColor: e.target.value,
                      }))
                    }
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
                  />
                </div>
              </div>
            </div>

            <div className="form-group" style={{ marginTop: "1rem" }}>
              <label
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.5rem",
                  cursor: "pointer",
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
                />
                <span style={{ fontSize: "0.9rem", fontWeight: 500 }}>
                  Active Company Status
                </span>
              </label>
            </div>

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
    </div>
  );
}
