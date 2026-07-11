"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Calendar,
  IndianRupee,
  Mail,
  User,
  CheckSquare,
  Square,
  Plus,
  Trash2,
  Edit,
  Clock,
  AlertCircle,
  Eye,
  EyeOff,
  Copy,
  Check,
  AlertTriangle,
  ChevronDown,
  X,
  Share2,
  ExternalLink,
  Search,
} from "lucide-react";
import SearchableSelect from "@/components/SearchableSelect";
import { useNotification } from "@/components/NotificationProvider";

const WhatsAppIcon = ({ size = 16, style }) => (
  <svg
    style={style}
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="currentColor"
  >
    <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.513 2.262 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.717-1.458L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.825 1.451 5.436 0 9.86-4.42 9.863-9.864.001-2.637-1.03-5.115-2.905-6.99C16.488 1.86 14.013.822 11.38.822c-5.44 0-9.863 4.42-9.866 9.863-.001 1.942.5 3.826 1.48 5.513l-1.011 3.693 3.784-.993zm11.588-6.177c-.297-.148-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.148-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
  </svg>
);

const getOverallStatus = (proj) => {
  const activeTypes = proj.projectType || [];
  if (activeTypes.length === 0) {
    return proj.status || "Planning";
  }

  const statuses = [];
  const now = new Date();

  if (activeTypes.includes("Development")) {
    let devStatus = proj.devStatus || "Planning";
    if (
      devStatus !== "Completed" &&
      proj.devEndDate &&
      new Date(proj.devEndDate) < now
    ) {
      devStatus = "Pending";
    }
    statuses.push(devStatus);
  }

  if (activeTypes.includes("360 Deg Digital Marketing")) {
    let marketingStatus = proj.marketingStatus || "Planning";
    if (
      marketingStatus !== "Completed" &&
      proj.marketingEndDate &&
      new Date(proj.marketingEndDate) < now
    ) {
      marketingStatus = "Pending";
    }
    statuses.push(marketingStatus);
  }

  if (activeTypes.includes("Meta / Google Ads")) {
    let adsStatus = proj.adsStatus || "Planning";
    if (
      adsStatus !== "Completed" &&
      proj.adsDate &&
      new Date(proj.adsDate) < now
    ) {
      adsStatus = "Pending";
    }
    statuses.push(adsStatus);
  }

  if (statuses.length === 0) {
    return proj.status || "Planning";
  }

  if (statuses.includes("Pending")) return "Pending";
  if (statuses.includes("Under Review")) return "Under Review";
  if (statuses.includes("In Progress")) return "In Progress";
  if (statuses.includes("Planning")) return "Planning";
  return "Completed";
};

const predefinedSubs = [
  "Education",
  "Shopping",
  "GYM",
  "Wedding",
  "Real Estate",
  "Healthcare",
  "Restaurant/Food",
  "Travel",
  "Portfolio",
  "Corporate",
  "SEO",
  "SMO",
  "GBP",
  "Meta Ads",
  "Google Ads",
  "Static",
  "Motion",
  "Real",
  "Brand Identity",
  "UI/UX",
  "Print Design",
];

const tabs = [
  { id: "details", label: "Project Details" },
  { id: "credentials", label: "Project Credential" },
  { id: "links", label: "Project Links" },
  { id: "pricing", label: "Pricing" },
  { id: "invoices", label: "Invoice" },
  { id: "status", label: "Status" },
  { id: "tasks", label: "Task List" },
  { id: "calendar", label: "Content Calendar" },
  { id: "history", label: "Work History" },
];

const tabPermissionMap = {
  details: "project_details",
  credentials: "project_credential",
  links: "project_links",
  pricing: "project_pricing",
  invoices: "project_invoice",
  status: "project_status",
  tasks: "project_tasks",
  calendar: "project_calendar",
  history: "project_status",
};

export default function ProjectDetailPage() {
  const { showToast, showConfirm } = useNotification();
  const getSubcategoriesList = (type) => {
    switch (type) {
      case "Development":
        return [
          "Education",
          "Shopping",
          "GYM",
          "Wedding",
          "Real Estate",
          "Healthcare",
          "Restaurant/Food",
          "Travel",
          "Portfolio",
          "Corporate",
        ];
      case "360 Deg Digital Marketing":
        return ["SEO", "SMO", "GBP"];
      case "Meta / Google Ads":
        return ["Meta Ads", "Google Ads"];
      case "Design":
        return [
          "Static",
          "Motion",
          "Real",
          "Brand Identity",
          "UI/UX",
          "Print Design",
        ];
      default:
        return [];
    }
  };
  const params = useParams();
  const router = useRouter();
  const id = params.id;

  const [project, setProject] = useState(null);
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [role, setRole] = useState("");
  const [username, setUsername] = useState("");
  const [permissions, setPermissions] = useState(null);
  const [category, setCategory] = useState("");
  const [companyUsers, setCompanyUsers] = useState([]);
  const [activeTab, setActiveTab] = useState("details");
  const [uploadCode, setUploadCode] = useState("ABC012");
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [editQuotationUrl, setEditQuotationUrl] = useState("");

  // Assigned employees state
  const [assignedEmployees, setAssignedEmployees] = useState([]);
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState([]);
  const [savingAssignment, setSavingAssignment] = useState(false);

  // Task checklist state
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false);
  const [expandedTasks, setExpandedTasks] = useState({});
  const [taskForm, setTaskForm] = useState({
    name: "",
    priority: "Medium",
    dueDate: "",
    assignedTo: "",
    notes: "",
  });
  const [newStatusUpdate, setNewStatusUpdate] = useState("");
  const [addingUpdate, setAddingUpdate] = useState(false);
  const [historySearchQuery, setHistorySearchQuery] = useState("");
  const [selectedHistoryIds, setSelectedHistoryIds] = useState([]);

  // Edit project state
  const [isEditing, setIsEditing] = useState(false);
  const [editQuotationFile, setEditQuotationFile] = useState(null);
  const [editForm, setEditForm] = useState({
    name: "",
    description: "",
    clientName: "",
    clientEmail: "",
    client: "",
    siteUrl: "",
    quotePrice: "",
    finalPrice: "",
    hostingPrice: "",
    domainPrice: "",
    devPrice: "",
    marketingPrice: "",
    adsPrice: "",
    designPrice: "",
    budget: "",
    status: "",
    devStatus: "Planning",
    marketingStatus: "Planning",
    adsStatus: "Planning",
    designStatus: "Planning",
    startDate: "",
    endDate: "",
    devStartDate: "",
    devEndDate: "",
    marketingStartDate: "",
    marketingEndDate: "",
    adsDate: "",
    designStartDate: "",
    designEndDate: "",
    hostingExpiry: "",
    domainExpiry: "",
    credentials: [],
    links: [],
    quotation: null,
    projectType: [],
    subcategories: [],
    contentCalendar: [],
  });
  const [editCustomSubs, setEditCustomSubs] = useState({
    Development: "",
    "360 Deg Digital Marketing": "",
    "Meta / Google Ads": "",
    Design: "",
  });
  const [editShowCustomInput, setEditShowCustomInput] = useState({
    Development: false,
    "360 Deg Digital Marketing": false,
    "Meta / Google Ads": false,
    Design: false,
  });
  const [updating, setUpdating] = useState(false);
  const [isTypeDropdownOpen, setIsTypeDropdownOpen] = useState(false);
  const [isAddPostModalOpen, setIsAddPostModalOpen] = useState(false);
  const [isViewCalendarOpen, setIsViewCalendarOpen] = useState(false);
  const [currentPost, setCurrentPost] = useState(null);
  const [calendarMonthFilter, setCalendarMonthFilter] = useState(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  });
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportFromDate, setExportFromDate] = useState("");
  const [exportToDate, setExportToDate] = useState("");
  const [postForm, setPostForm] = useState({
    scheduledDate: "",
    postType: "Static",
    topic: "",
    content: "",
    hashtags: "",
    visual: "",
    platforms: [],
    status: "Pending",
  });

  const [clients, setClients] = useState([]);
  const [isAddClientOpen, setIsAddClientOpen] = useState(false);
  const [inlineClient, setInlineClient] = useState({ name: "", email: "" });

  // Credentials view state
  const [visiblePasswords, setVisiblePasswords] = useState({});
  const [copiedKey, setCopiedKey] = useState(null);
  const [fourDaysThreshold] = useState(
    () => new Date(Date.now() + 4 * 24 * 60 * 60 * 1000),
  );

  const fetchClients = useCallback(async () => {
    try {
      const res = await fetch("/api/clients");
      if (res.ok) {
        const data = await res.json();
        setClients(data);
      }
    } catch (e) {
      console.error("Failed to load clients", e);
    }
  }, []);

  const handleSaveAssignment = async () => {
    setSavingAssignment(true);
    try {
      const res = await fetch(`/api/projects/${id}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ employeeIds: selectedEmployeeIds }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to save assignment");
      }
      const data = await res.json();
      setAssignedEmployees(data.assignedEmployees || []);
      setSelectedEmployeeIds(
        (data.assignedEmployees || []).map((e) => e._id || e),
      );
      setIsAssignModalOpen(false);
      showToast("Project assignment updated", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setSavingAssignment(false);
    }
  };

  const handleCreateInlineClient = async () => {
    if (!inlineClient.name || !inlineClient.email) {
      showToast("Name and Email are required for client profile", "error");
      return;
    }
    try {
      const res = await fetch("/api/clients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(inlineClient),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.error || "Failed to create client");
      }
      const newClientObj = await res.json();
      showToast("Client profile created", "success");
      await fetchClients();
      setEditForm((prev) => ({
        ...prev,
        client: newClientObj._id,
        clientName: newClientObj.name,
        clientEmail: newClientObj.email,
      }));
      setInlineClient({ name: "", email: "" });
      setIsAddClientOpen(false);
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const fetchProjectData = useCallback(async () => {
    try {
      const [projectRes, clientsRes, meRes] = await Promise.all([
        fetch(`/api/projects/${id}`),
        fetch("/api/clients"),
        fetch("/api/auth/me"),
      ]);

      if (!projectRes.ok) throw new Error("Project not found");
      const projectData = await projectRes.json();

      let clientsData = [];
      if (clientsRes.ok) {
        clientsData = await clientsRes.json();
        setClients(clientsData);
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        setRole(meData.role);
        setPermissions(meData.permissions);
        setCategory(meData.category || "");
        setCompanyUsers(meData.companyUsers || []);
        if (meData.uploadCode) {
          setUploadCode(meData.uploadCode);
        }
        if (meData.username) {
          setUsername(meData.username);
        }
      }

      setProject(projectData.project);
      setInvoices(projectData.invoices);
      if (projectData.companyUsers) {
        const mappedUsers = projectData.companyUsers
          .filter((u) => u.role !== "superadmin")
          .map((u) => ({
            id: u._id.toString() || u.id || u._id,
            username: u.username,
            role: u.role,
            email: u.email || "",
          }));
        setCompanyUsers(mappedUsers);
      }
      // Set assigned employees from populated project data
      setAssignedEmployees(projectData.project.assignedEmployees || []);
      setSelectedEmployeeIds(
        (projectData.project.assignedEmployees || []).map((e) => e._id || e),
      );

      // Initialize edit form
      const customValues = (projectData.project.subcategories || []).filter(
        (sub) => !predefinedSubs.includes(sub),
      );

      const loadedCustomSubs = {
        Development: "",
        "360 Deg Digital Marketing": "",
        "Meta / Google Ads": "",
        Design: "",
      };
      const loadedShowCustomInput = {
        Development: false,
        "360 Deg Digital Marketing": false,
        "Meta / Google Ads": false,
        Design: false,
      };

      const activeTypes = Array.isArray(projectData.project.projectType)
        ? projectData.project.projectType
        : projectData.project.projectType
          ? [projectData.project.projectType]
          : [];

      let customIdx = 0;
      activeTypes.forEach((type) => {
        if (customIdx < customValues.length) {
          loadedCustomSubs[type] = customValues[customIdx];
          loadedShowCustomInput[type] = true;
          customIdx++;
        }
      });

      setEditCustomSubs(loadedCustomSubs);
      setEditShowCustomInput(loadedShowCustomInput);

      let matchedClientId = projectData.project.client ?? "";
      if (
        !matchedClientId &&
        projectData.project.clientName &&
        clientsData.length > 0
      ) {
        const matchingClient = clientsData.find(
          (c) =>
            c.name.toLowerCase() ===
            projectData.project.clientName.toLowerCase(),
        );
        if (matchingClient) {
          matchedClientId = matchingClient._id;
        }
      }

      setEditForm({
        name: projectData.project.name,
        description: projectData.project.description ?? "",
        clientName: projectData.project.clientName,
        clientEmail: projectData.project.clientEmail ?? "",
        client: matchedClientId,
        siteUrl: projectData.project.siteUrl ?? "",
        quotePrice: projectData.project.quotePrice ?? "",
        finalPrice: projectData.project.finalPrice ?? "",
        hostingPrice: projectData.project.hostingPrice ?? "",
        domainPrice: projectData.project.domainPrice ?? "",
        devPrice: projectData.project.devPrice ?? "",
        marketingPrice: projectData.project.marketingPrice ?? "",
        adsPrice: projectData.project.adsPrice ?? "",
        designPrice: projectData.project.designPrice ?? "",
        budget: projectData.project.budget ?? 0,
        status: projectData.project.status,
        devStatus: projectData.project.devStatus ?? "Planning",
        marketingStatus: projectData.project.marketingStatus ?? "Planning",
        adsStatus: projectData.project.adsStatus ?? "Planning",
        designStatus: projectData.project.designStatus ?? "Planning",
        startDate: projectData.project.startDate
          ? new Date(projectData.project.startDate)
              .toISOString()
              .substring(0, 10)
          : "",
        endDate: projectData.project.endDate
          ? new Date(projectData.project.endDate).toISOString().substring(0, 10)
          : "",
        devStartDate: projectData.project.devStartDate
          ? new Date(projectData.project.devStartDate)
              .toISOString()
              .substring(0, 10)
          : "",
        devEndDate: projectData.project.devEndDate
          ? new Date(projectData.project.devEndDate)
              .toISOString()
              .substring(0, 10)
          : "",
        marketingStartDate: projectData.project.marketingStartDate
          ? new Date(projectData.project.marketingStartDate)
              .toISOString()
              .substring(0, 10)
          : "",
        marketingEndDate: projectData.project.marketingEndDate
          ? new Date(projectData.project.marketingEndDate)
              .toISOString()
              .substring(0, 10)
          : "",
        adsDate: projectData.project.adsDate
          ? new Date(projectData.project.adsDate).toISOString().substring(0, 10)
          : "",
        designStartDate: projectData.project.designStartDate
          ? new Date(projectData.project.designStartDate)
              .toISOString()
              .substring(0, 10)
          : "",
        designEndDate: projectData.project.designEndDate
          ? new Date(projectData.project.designEndDate)
              .toISOString()
              .substring(0, 10)
          : "",
        hostingExpiry: projectData.project.hostingExpiry
          ? new Date(projectData.project.hostingExpiry)
              .toISOString()
              .substring(0, 10)
          : "",
        domainExpiry: projectData.project.domainExpiry
          ? new Date(projectData.project.domainExpiry)
              .toISOString()
              .substring(0, 10)
          : "",
        credentials: projectData.project.credentials ?? [],
        links: projectData.project.links ?? [],
        quotation: projectData.project.quotation ?? null,
        projectType: activeTypes,
        subcategories: projectData.project.subcategories ?? [],
        contentCalendar: projectData.project.contentCalendar ?? [],
      });
      setEditQuotationUrl(projectData.project.quotation?.filePath || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const handleAddCredential = () => {
    setEditForm((prev) => ({
      ...prev,
      credentials: [
        ...prev.credentials,
        {
          type: "Other",
          label: "",
          username: "",
          password: "",
          loginUrl: "",
          notes: "",
        },
      ],
    }));
  };

  const handleRemoveCredential = (index) => {
    const updated = editForm.credentials.filter((_, i) => i !== index);
    setEditForm((prev) => ({ ...prev, credentials: updated }));
  };

  const handleCredentialChange = (index, field, value) => {
    setEditForm((prev) => {
      const updated = prev.credentials.map((cred, i) => {
        if (i === index) {
          return { ...cred, [field]: value };
        }
        return cred;
      });
      return { ...prev, credentials: updated };
    });
  };

  const handleCopy = (text, key) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const togglePasswordVisibility = (key) => {
    setVisiblePasswords((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Direct Credentials modification logic (View Mode actions)
  const [credModalOpen, setCredModalOpen] = useState(false);
  const [editingCredIndex, setEditingCredIndex] = useState(null);
  const [credForm, setCredForm] = useState({
    type: "Other",
    label: "",
    username: "",
    password: "",
    loginUrl: "",
    notes: "",
  });

  const handleOpenAddCredModal = () => {
    setEditingCredIndex(null);
    setCredForm({
      type: "Other",
      label: "",
      username: "",
      password: "",
      loginUrl: "",
      notes: "",
    });
    setCredModalOpen(true);
  };

  const handleOpenEditCredModal = (index, cred) => {
    setEditingCredIndex(index);
    setCredForm({
      type: cred.type || "Other",
      label: cred.label || "",
      username: cred.username || "",
      password: cred.password || "",
      loginUrl: cred.loginUrl || "",
      notes: cred.notes || "",
    });
    setCredModalOpen(true);
  };

  const handleSaveCredentialDirect = async (e) => {
    e.preventDefault();
    if (!credForm.label && !credForm.username) {
      showToast("Label or Username is required", "error");
      return;
    }

    try {
      setUpdating(true);
      let updatedCredentials = [...(project.credentials || [])];

      const newCred = {
        type: credForm.type,
        label: credForm.label.trim(),
        username: credForm.username.trim(),
        password: credForm.password,
        loginUrl: credForm.loginUrl.trim(),
        notes: credForm.notes.trim(),
      };

      if (editingCredIndex !== null) {
        updatedCredentials[editingCredIndex] = newCred;
      } else {
        updatedCredentials.push(newCred);
      }

      const logMessage = editingCredIndex !== null 
        ? `Credential Updated: ${newCred.type} (${newCred.label})` 
        : `Credential Created: ${newCred.type} (${newCred.label})`;

      const updatedStatusUpdates = [
        ...(project.statusUpdates || []),
        { message: logMessage, date: new Date() }
      ];

      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          credentials: updatedCredentials,
          statusUpdates: updatedStatusUpdates
        }),
      });

      if (!res.ok) throw new Error("Failed to update credentials");

      const updatedProject = await res.json();
      setProject(updatedProject);

      setEditForm((prev) => ({
        ...prev,
        credentials: updatedProject.credentials || [],
      }));

      showToast(
        editingCredIndex !== null
          ? "Credential updated successfully"
          : "Credential added successfully",
        "success",
      );
      setCredModalOpen(false);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteCredentialDirect = (index) => {
    showConfirm({
      title: "Delete Credential",
      message: "Are you sure you want to delete this credential?",
      type: "danger",
      onConfirm: async () => {
        try {
          setUpdating(true);
          const targetCred = project.credentials[index];
          const logMessage = `Credential Deleted: ${targetCred.type} (${targetCred.label})`;
          
          const updatedCredentials = (project.credentials || []).filter(
            (_, i) => i !== index,
          );

          const updatedStatusUpdates = [
            ...(project.statusUpdates || []),
            { message: logMessage, date: new Date() }
          ];

          const res = await fetch(`/api/projects/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              credentials: updatedCredentials,
              statusUpdates: updatedStatusUpdates
            }),
          });

          if (!res.ok) throw new Error("Failed to delete credential");

          const updatedProject = await res.json();
          setProject(updatedProject);

          setEditForm((prev) => ({
            ...prev,
            credentials: updatedProject.credentials || [],
          }));

          showToast("Credential deleted successfully", "success");
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          setUpdating(false);
        }
      },
    });
  };

  // Direct Links modification logic (View Mode actions)
  const [linkModalOpen, setLinkModalOpen] = useState(false);
  const [editingLinkIndex, setEditingLinkIndex] = useState(null);
  const [linkForm, setLinkForm] = useState({ name: "", url: "", notes: "" });

  const handleOpenAddLinkModal = () => {
    setEditingLinkIndex(null);
    setLinkForm({ name: "", url: "", notes: "" });
    setLinkModalOpen(true);
  };

  const handleOpenEditLinkModal = (index, lnk) => {
    setEditingLinkIndex(index);
    setLinkForm({
      name: lnk.name || "",
      url: lnk.url || "",
      notes: lnk.notes || "",
    });
    setLinkModalOpen(true);
  };

  const handleSaveLinkDirect = async (e) => {
    e.preventDefault();
    if (!linkForm.name || !linkForm.url) {
      showToast("Name and URL are required", "error");
      return;
    }

    try {
      setUpdating(true);
      let updatedLinks = [...(project.links || [])];

      const newLnk = {
        name: linkForm.name.trim(),
        url: linkForm.url.trim(),
        notes: linkForm.notes.trim(),
      };

      if (editingLinkIndex !== null) {
        updatedLinks[editingLinkIndex] = newLnk;
      } else {
        updatedLinks.push(newLnk);
      }

      const logMessage = editingLinkIndex !== null 
        ? `Link Updated: ${newLnk.name}` 
        : `Link Created: ${newLnk.name}`;

      const updatedStatusUpdates = [
        ...(project.statusUpdates || []),
        { message: logMessage, date: new Date() }
      ];

      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          links: updatedLinks,
          statusUpdates: updatedStatusUpdates
        }),
      });

      if (!res.ok) throw new Error("Failed to update links");

      const updatedProject = await res.json();
      setProject(updatedProject);

      setEditForm((prev) => ({
        ...prev,
        links: updatedProject.links || [],
      }));

      showToast(
        editingLinkIndex !== null
          ? "Link updated successfully"
          : "Link added successfully",
        "success",
      );
      setLinkModalOpen(false);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteLinkDirect = (index) => {
    showConfirm({
      title: "Delete Link",
      message: "Are you sure you want to delete this link?",
      type: "danger",
      onConfirm: async () => {
        try {
          setUpdating(true);
          const targetLink = project.links[index];
          const logMessage = `Link Deleted: ${targetLink.name}`;
          
          const updatedLinks = (project.links || []).filter(
            (_, i) => i !== index,
          );

          const updatedStatusUpdates = [
            ...(project.statusUpdates || []),
            { message: logMessage, date: new Date() }
          ];

          const res = await fetch(`/api/projects/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ 
              links: updatedLinks,
              statusUpdates: updatedStatusUpdates
            }),
          });

          if (!res.ok) throw new Error("Failed to delete link");

          const updatedProject = await res.json();
          setProject(updatedProject);

          setEditForm((prev) => ({
            ...prev,
            links: updatedProject.links || [],
          }));

          showToast("Link deleted successfully", "success");
        } catch (err) {
          showToast(err.message, "error");
        } finally {
          setUpdating(false);
        }
      },
    });
  };

  // Direct Credentials share logic
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [selectedCreds, setSelectedCreds] = useState([]); // indices of credentials
  const [shareRecipientType, setShareRecipientType] = useState("client"); // 'client' | 'employee' | 'custom'
  const [selectedRecipientId, setSelectedRecipientId] = useState(""); // Client ID or Employee ID
  const [customPhone, setCustomPhone] = useState("");
  const [customEmail, setCustomEmail] = useState("");

  const handleOpenShareModal = () => {
    if (!project || !project.credentials || project.credentials.length === 0)
      return;

    // Select all indices by default
    setSelectedCreds(project.credentials.map((_, i) => i));
    setShareRecipientType("client");

    // Pre-select project client if available
    if (project.client) {
      setSelectedRecipientId(project.client);
    } else if (clients && clients.length > 0) {
      setSelectedRecipientId(clients[0]._id);
    } else {
      setSelectedRecipientId("");
    }

    setCustomPhone("");
    setCustomEmail("");
    setShareModalOpen(true);
  };

  const handleToggleSelectCred = (index) => {
    setSelectedCreds((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const handleToggleSelectAllCreds = () => {
    if (!project || !project.credentials) return;
    if (selectedCreds.length === project.credentials.length) {
      setSelectedCreds([]);
    } else {
      setSelectedCreds(project.credentials.map((_, i) => i));
    }
  };

  const formatCredentialsText = () => {
    if (!project || selectedCreds.length === 0) return "";

    let text = `🔑 *Project Credentials for ${project.name}*\n\n`;
    selectedCreds.forEach((idx) => {
      const cred = project.credentials[idx];
      if (!cred) return;
      text += `*${cred.type} - ${cred.label || "Credentials"}*\n`;
      if (cred.username) text += `• Username: ${cred.username}\n`;
      if (cred.password) text += `• Password: ${cred.password}\n`;
      if (cred.loginUrl) text += `• Login URL: ${cred.loginUrl}\n`;
      if (cred.notes) text += `• Notes: ${cred.notes}\n`;
      text += `\n`;
    });

    return text.trim();
  };

  const formatCredentialsEmailBody = () => {
    if (!project || selectedCreds.length === 0) return "";

    let text = `Project Credentials for ${project.name}\n\n`;
    selectedCreds.forEach((idx) => {
      const cred = project.credentials[idx];
      if (!cred) return;
      text += `--- ${cred.type} - ${cred.label || "Credentials"} ---\n`;
      if (cred.username) text += `Username: ${cred.username}\n`;
      if (cred.password) text += `Password: ${cred.password}\n`;
      if (cred.loginUrl) text += `Login URL: ${cred.loginUrl}\n`;
      if (cred.notes) text += `Notes: ${cred.notes}\n`;
      text += `\n`;
    });

    return text.trim();
  };

  const getRecipientInfo = () => {
    let email = "";
    let phone = "";

    if (shareRecipientType === "client") {
      const clientObj = clients.find((c) => c._id === selectedRecipientId);
      if (clientObj) {
        email = clientObj.email || "";
        phone = clientObj.phone || clientObj.whatsapp || "";
      } else {
        email = project.clientEmail || "";
      }
    } else if (shareRecipientType === "employee") {
      const emp = companyUsers.find((u) => u.id === selectedRecipientId);
      if (emp) {
        email = emp.email || "";
        phone = emp.whatsapp || emp.phone || "";
      }
    } else if (shareRecipientType === "custom") {
      email = customEmail;
      phone = customPhone;
    }

    if (phone) {
      phone = phone.replace(/[^\d+]/g, "");
    }

    return { email, phone };
  };

  const handleShareWhatsApp = () => {
    const { phone } = getRecipientInfo();
    const text = formatCredentialsText();
    if (!text) {
      showToast("Please select at least one credential to share", "error");
      return;
    }

    const encodedText = encodeURIComponent(text);
    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(url, "_blank");
  };

  const handleShareEmail = () => {
    const { email } = getRecipientInfo();
    const body = formatCredentialsEmailBody();
    if (!body) {
      showToast("Please select at least one credential to share", "error");
      return;
    }

    const subject = encodeURIComponent(
      `Credentials for Project: ${project.name}`,
    );
    const encodedBody = encodeURIComponent(body);
    const url = `mailto:${email}?subject=${subject}&body=${encodedBody}`;

    window.location.href = url;
  };

  // Direct Links share logic
  const [linkShareModalOpen, setLinkShareModalOpen] = useState(false);
  const [selectedLinks, setSelectedLinks] = useState([]); // indices of links
  const [linkShareRecipientType, setLinkShareRecipientType] =
    useState("client"); // 'client' | 'employee' | 'custom'
  const [selectedLinkRecipientId, setSelectedLinkRecipientId] = useState(""); // Client ID or Employee ID
  const [customLinkPhone, setCustomLinkPhone] = useState("");
  const [customLinkEmail, setCustomLinkEmail] = useState("");

  const handleOpenLinkShareModal = () => {
    if (!project || !project.links || project.links.length === 0) return;

    // Select all indices by default
    setSelectedLinks(project.links.map((_, i) => i));
    setLinkShareRecipientType("client");

    // Pre-select project client if available
    if (project.client) {
      setSelectedLinkRecipientId(project.client);
    } else if (clients && clients.length > 0) {
      setSelectedLinkRecipientId(clients[0]._id);
    } else {
      setSelectedLinkRecipientId("");
    }

    setCustomLinkPhone("");
    setCustomLinkEmail("");
    setLinkShareModalOpen(true);
  };

  const handleToggleSelectLink = (index) => {
    setSelectedLinks((prev) =>
      prev.includes(index) ? prev.filter((i) => i !== index) : [...prev, index],
    );
  };

  const handleToggleSelectAllLinks = () => {
    if (!project || !project.links) return;
    if (selectedLinks.length === project.links.length) {
      setSelectedLinks([]);
    } else {
      setSelectedLinks(project.links.map((_, i) => i));
    }
  };

  const formatLinksText = () => {
    if (!project || selectedLinks.length === 0) return "";

    let text = `🔗 *Project Links for ${project.name}*\n\n`;
    selectedLinks.forEach((idx) => {
      const lnk = project.links[idx];
      if (!lnk) return;
      text += `*${lnk.name}*\n`;
      if (lnk.url) text += `• Link: ${lnk.url}\n`;
      if (lnk.notes) text += `• Notes: ${lnk.notes}\n`;
      text += `\n`;
    });

    return text.trim();
  };

  const formatLinksEmailBody = () => {
    if (!project || selectedLinks.length === 0) return "";

    let text = `Project Links for ${project.name}\n\n`;
    selectedLinks.forEach((idx) => {
      const lnk = project.links[idx];
      if (!lnk) return;
      text += `--- ${lnk.name} ---\n`;
      if (lnk.url) text += `Link: ${lnk.url}\n`;
      if (lnk.notes) text += `Notes: ${lnk.notes}\n`;
      text += `\n`;
    });

    return text.trim();
  };

  const getLinkRecipientInfo = () => {
    let email = "";
    let phone = "";

    if (linkShareRecipientType === "client") {
      const clientObj = clients.find((c) => c._id === selectedLinkRecipientId);
      if (clientObj) {
        email = clientObj.email || "";
        phone = clientObj.phone || clientObj.whatsapp || "";
      } else {
        email = project.clientEmail || "";
      }
    } else if (linkShareRecipientType === "employee") {
      const emp = companyUsers.find((u) => u.id === selectedLinkRecipientId);
      if (emp) {
        email = emp.email || "";
        phone = emp.whatsapp || emp.phone || "";
      }
    } else if (linkShareRecipientType === "custom") {
      email = customLinkEmail;
      phone = customLinkPhone;
    }

    if (phone) {
      phone = phone.replace(/[^\d+]/g, "");
    }

    return { email, phone };
  };

  const handleShareLinksWhatsApp = () => {
    const { phone } = getLinkRecipientInfo();
    const text = formatLinksText();
    if (!text) {
      showToast("Please select at least one link to share", "error");
      return;
    }

    const encodedText = encodeURIComponent(text);
    const url = phone
      ? `https://api.whatsapp.com/send?phone=${phone}&text=${encodedText}`
      : `https://api.whatsapp.com/send?text=${encodedText}`;

    window.open(url, "_blank");
  };

  const handleShareLinksEmail = () => {
    const { email } = getLinkRecipientInfo();
    const body = formatLinksEmailBody();
    if (!body) {
      showToast("Please select at least one link to share", "error");
      return;
    }

    const subject = encodeURIComponent(`Links for Project: ${project.name}`);
    const encodedBody = encodeURIComponent(body);
    const url = `mailto:${email}?subject=${subject}&body=${encodedBody}`;

    window.location.href = url;
  };

  const handleAddLink = () => {
    setEditForm((prev) => ({
      ...prev,
      links: [...prev.links, { name: "", url: "", notes: "" }],
    }));
  };

  const handleRemoveLink = (index) => {
    const updated = editForm.links.filter((_, i) => i !== index);
    setEditForm((prev) => ({ ...prev, links: updated }));
  };

  const handleLinkChange = (index, field, value) => {
    setEditForm((prev) => {
      const updated = prev.links.map((lnk, i) => {
        if (i === index) {
          return { ...lnk, [field]: value };
        }
        return lnk;
      });
      return { ...prev, links: updated };
    });
  };

  const getExpiryStatus = (dateString) => {
    if (!dateString) return null;
    const diffTime = new Date(dateString) - new Date();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    if (diffDays < 0) return "expired";
    if (diffDays <= 30) return "warning";
    return "ok";
  };

  useEffect(() => {
    if (id) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      fetchProjectData();
    }
  }, [id, fetchProjectData]);

  useEffect(() => {
    if (project) {
      const compName =
        typeof window !== "undefined"
          ? localStorage.getItem("company_name") || "Workspace"
          : "Workspace";
      document.title = `${project.name} (${project.status}) | ${compName} Manager`;
    }
  }, [project]);

  useEffect(() => {
    if (permissions) {
      const currentPermKey = tabPermissionMap[activeTab];
      if (
        !permissions[currentPermKey] ||
        permissions[currentPermKey] === "none"
      ) {
        const firstAllowed = tabs.find((tab) => {
          const permKey = tabPermissionMap[tab.id];
          return permissions[permKey] && permissions[permKey] !== "none";
        });
        if (firstAllowed) {
          setActiveTab(firstAllowed.id);
        }
      }
    }
  }, [permissions, activeTab]);

  const handleAddStatusUpdate = async (e) => {
    e.preventDefault();
    if (!newStatusUpdate.trim()) return;
    try {
      setAddingUpdate(true);
      const updatedList = [
        ...(project.statusUpdates || []),
        { message: newStatusUpdate.trim(), date: new Date() },
      ];
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ statusUpdates: updatedList }),
      });
      if (!res.ok) throw new Error("Failed to post status update");
      const updatedProject = await res.json();
      setProject(updatedProject);
      setNewStatusUpdate("");
      showToast("Status update posted successfully", "success");
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setAddingUpdate(false);
    }
  };

  const handleDeleteStatusUpdate = async (updateId) => {
    showConfirm({
      title: "Remove Status Update",
      message:
        "Are you sure you want to remove this status update from history?",
      type: "danger",
      onConfirm: async () => {
        try {
          const updatedList = project.statusUpdates.filter(
            (u) => u._id !== updateId,
          );
          const res = await fetch(`/api/projects/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ statusUpdates: updatedList }),
          });
          if (!res.ok) throw new Error("Failed to delete status update");
          const updatedProject = await res.json();
          setProject(updatedProject);
          showToast("Status update removed", "success");
        } catch (err) {
          showToast(err.message, "error");
        }
      },
    });
  };

  const handleBulkDeleteHistory = async () => {
    if (selectedHistoryIds.length === 0) return;
    showConfirm({
      title: "Delete Selected Logs",
      message: `Are you sure you want to delete the ${selectedHistoryIds.length} selected history entries?`,
      type: "danger",
      onConfirm: async () => {
        try {
          const updatedList = project.statusUpdates.filter(
            (u) => !selectedHistoryIds.includes(u._id),
          );
          const res = await fetch(`/api/projects/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ statusUpdates: updatedList }),
          });
          if (!res.ok) throw new Error("Failed to delete selected logs");
          const updatedProject = await res.json();
          setProject(updatedProject);
          setSelectedHistoryIds([]);
          showToast("Selected history logs removed", "success");
        } catch (err) {
          showToast(err.message, "error");
        }
      },
    });
  };

  const handleToggleTask = async (taskId, completed, currentStatus) => {
    if (!project) return;

    const nextCompleted = !completed;
    const nextStatus = nextCompleted ? "Completed" : "Todo";

    const updatedTasks = project.tasks.map((task) =>
      task._id === taskId
        ? { ...task, completed: nextCompleted, status: nextStatus }
        : task,
    );

    // Optimistic UI update
    setProject((prev) => ({ ...prev, tasks: updatedTasks }));

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update task");
      }
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
      // Revert back on error
      fetchProjectData();
    }
  };

  const handleUpdateTaskMeta = async (taskId, field, value) => {
    if (!project) return;

    const updatedTasks = project.tasks.map((task) => {
      if (task._id === taskId) {
        const updated = { ...task, [field]: value };
        if (field === "status") {
          updated.completed = value === "Completed";
        }
        if (field === "dueDate") {
          updated.dueDate = value ? new Date(value).toISOString() : null;
        }
        return updated;
      }
      return task;
    });

    // Optimistic UI update
    setProject((prev) => ({ ...prev, tasks: updatedTasks }));

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to update task metadata");
      }
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
      fetchProjectData();
    }
  };

  const handleAddTask = async (e) => {
    e.preventDefault();
    if (!taskForm.name.trim() || !project) return;

    const newTask = {
      name: taskForm.name.trim(),
      completed: false,
      status: "Todo",
      priority: taskForm.priority,
      dueDate: taskForm.dueDate
        ? new Date(taskForm.dueDate).toISOString()
        : null,
      assignedTo: taskForm.assignedTo || "",
      notes: taskForm.notes || "",
      assignedBy: username,
    };
    const updatedTasks = [...(project.tasks || []), newTask];

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to add task");
      }
      const updatedProject = await res.json();
      setProject(updatedProject);
      setTaskForm({
        name: "",
        priority: "Medium",
        dueDate: "",
        assignedTo: "",
        notes: "",
      });
      setIsAddTaskModalOpen(false);
      showToast("Task added successfully", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!project) return;

    const updatedTasks = project.tasks.filter((task) => task._id !== taskId);

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
      if (!res.ok) throw new Error("Failed to delete task");
      const updatedProject = await res.json();
      setProject(updatedProject);
      showToast("Task deleted successfully", "success");
    } catch (err) {
      console.error(err);
      showToast("Could not delete task.", "error");
    }
  };

  const handleMarkTaskRead = async (taskId) => {
    if (!project) return;

    const updatedTasks = project.tasks.map((task) => {
      if (task._id === taskId) {
        return { ...task, isRead: true };
      }
      return task;
    });

    // Optimistic UI update
    setProject((prev) => ({ ...prev, tasks: updatedTasks }));

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tasks: updatedTasks }),
      });
      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to mark task as read");
      }
      showToast("Task acknowledged", "success");
    } catch (err) {
      console.error(err);
      showToast(err.message, "error");
      fetchProjectData();
    }
  };

  const handleSavePost = async (e) => {
    e.preventDefault();
    if (!postForm.scheduledDate) {
      showToast("Scheduled date is required", "error");
      return;
    }

    const scheduledDateObj = new Date(postForm.scheduledDate);
    const year = scheduledDateObj.getFullYear();
    const month = String(scheduledDateObj.getMonth() + 1).padStart(2, "0");
    const monthStr = `${year}-${month}`; // automatically compute month e.g. "2026-06"

    const postData = {
      ...postForm,
      ideation: postForm.topic,
      caption: postForm.content,
      description: postForm.visual,
      month: monthStr,
      scheduledDate: scheduledDateObj.toISOString(),
    };

    let updatedCalendar = [];
    if (currentPost && currentPost._id) {
      // Edit mode
      updatedCalendar = (project.contentCalendar || []).map((p) =>
        p._id === currentPost._id ? { ...postData, _id: currentPost._id } : p,
      );
    } else {
      // Add mode
      updatedCalendar = [...(project.contentCalendar || []), postData];
    }

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentCalendar: updatedCalendar }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error ||
            errData.message ||
            "Failed to save content calendar post",
        );
      }
      const updatedProject = await res.json();
      setProject(updatedProject);

      // Update local editForm to avoid overwriting on later project edits
      setEditForm((prev) => ({
        ...prev,
        contentCalendar: updatedProject.contentCalendar || [],
      }));

      setIsAddPostModalOpen(false);
      setCurrentPost(null);
      setPostForm({
        scheduledDate: "",
        postType: "Static",
        topic: "",
        content: "",
        hashtags: "",
        visual: "",
        platforms: [],
        status: "Pending",
      });
      showToast(
        currentPost
          ? "Post updated successfully"
          : "Post scheduled successfully",
        "success",
      );
    } catch (err) {
      showToast(err.message, "error");
    }
  };

  const handleDeletePost = async (postId) => {
    showConfirm({
      title: "Delete Calendar Post",
      message: "Are you sure you want to delete this scheduled post?",
      type: "danger",
      onConfirm: async () => {
        const updatedCalendar = (project.contentCalendar || []).filter(
          (p) => p._id !== postId,
        );
        try {
          const res = await fetch(`/api/projects/${id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ contentCalendar: updatedCalendar }),
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(
              errData.error || errData.message || "Failed to delete post",
            );
          }
          const updatedProject = await res.json();
          setProject(updatedProject);

          setEditForm((prev) => ({
            ...prev,
            contentCalendar: updatedProject.contentCalendar || [],
          }));

          showToast("Post removed from content calendar", "success");
        } catch (err) {
          showToast(err.message, "error");
        }
      },
    });
  };

  const formatMonthDisplay = (monthStr) => {
    if (!monthStr) return "N/A";
    const [year, month] = monthStr.split("-");
    const date = new Date(year, parseInt(month) - 1);
    return date.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
  };

  const getMonthsOptions = () => {
    const months = new Set();
    const now = new Date();
    months.add(
      `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`,
    );
    (project.contentCalendar || []).forEach((post) => {
      if (post.month) {
        months.add(post.month);
      }
    });
    return Array.from(months).sort();
  };

  const handleExportCalendar = (fromDateStr, toDateStr) => {
    if (!fromDateStr || !toDateStr) {
      showToast("From and To dates are required for export", "error");
      return;
    }

    const fromDateObj = new Date(fromDateStr);
    const toDateObj = new Date(toDateStr);
    fromDateObj.setHours(0, 0, 0, 0);
    toDateObj.setHours(23, 59, 59, 999);

    const filteredPosts = (project.contentCalendar || [])
      .filter((post) => {
        const d = new Date(post.scheduledDate);
        return d >= fromDateObj && d <= toDateObj;
      })
      .sort((a, b) => new Date(a.scheduledDate) - new Date(b.scheduledDate));

    if (filteredPosts.length === 0) {
      showToast(
        "No posts found to export for the selected date range",
        "error",
      );
      return;
    }

    const headers = [
      "Post ID",
      "Date",
      "Day",
      "Status",
      "Post Type",
      "Topic",
      "Content",
      "Visual/Reference link",
      "Hashtags",
      "Target post",
    ];

    const rows = filteredPosts.map((post) => {
      const scheduledDateObj = new Date(post.scheduledDate);
      const d = scheduledDateObj;
      const dateStr = `${String(d.getDate()).padStart(2, "0")}/${String(d.getMonth() + 1).padStart(2, "0")}/${d.getFullYear()}`;
      const dayStr = scheduledDateObj.toLocaleDateString("en-IN", {
        weekday: "long",
      });
      const platformsStr = (post.platforms || []).join(", ");

      const escape = (text) => {
        if (text === null || text === undefined) return "";
        // Strip emojis
        const stripped = String(text).replace(
          /[\uD800-\uDBFF][\uDC00-\uDFFF]|\u2600-\u27BF|[\uE000-\uF8FF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|[\u2011-\u26FF]|\uD83E[\uDC00-\uDFFF]/g,
          "",
        );
        if (
          stripped.includes(",") ||
          stripped.includes("\n") ||
          stripped.includes('"')
        ) {
          return `"${stripped.replace(/"/g, '""')}"`;
        }
        return stripped;
      };

      return [
        escape(post._id || ""),
        escape(dateStr),
        escape(dayStr),
        escape(post.status || "Pending"),
        escape(post.postType || "Static"),
        escape(post.topic || post.ideation || ""),
        escape(post.content || post.caption || ""),
        escape(post.visual || post.description || ""),
        escape(post.hashtags || ""),
        escape(platformsStr),
      ];
    });

    const csvContent = [
      headers.join(","),
      ...rows.map((e) => e.join(",")),
    ].join("\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);

    const fromStrFormatted = new Date(fromDateStr)
      .toLocaleDateString("en-IN")
      .replace(/\//g, "-");
    const toStrFormatted = new Date(toDateStr)
      .toLocaleDateString("en-IN")
      .replace(/\//g, "-");
    const filename = `${project.name.replace(/\s+/g, "_")}_Content_Calendar_${fromStrFormatted}_to_${toStrFormatted}.csv`;
    link.setAttribute("download", filename);

    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast("Content calendar exported successfully as CSV", "success");
  };

  const openExportModal = () => {
    let year = new Date().getFullYear();
    let month = new Date().getMonth() + 1;
    if (calendarMonthFilter) {
      const parts = calendarMonthFilter.split("-");
      if (parts.length === 2) {
        year = parseInt(parts[0], 10);
        month = parseInt(parts[1], 10);
      }
    }
    const firstDay = `${year}-${String(month).padStart(2, "0")}-01`;
    const lastDayNum = new Date(year, month, 0).getDate();
    const lastDay = `${year}-${String(month).padStart(2, "0")}-${String(lastDayNum).padStart(2, "0")}`;
    setExportFromDate(firstDay);
    setExportToDate(lastDay);
    setIsExportModalOpen(true);
  };

  const parseCSV = (text) => {
    const lines = [];
    let row = [""];
    let insideQuote = false;

    for (let i = 0; i < text.length; i++) {
      const char = text[i];
      const nextChar = text[i + 1];

      if (char === '"') {
        if (insideQuote && nextChar === '"') {
          row[row.length - 1] += '"';
          i++;
        } else {
          insideQuote = !insideQuote;
        }
      } else if (char === "," && !insideQuote) {
        row.push("");
      } else if ((char === "\r" || char === "\n") && !insideQuote) {
        if (char === "\r" && nextChar === "\n") {
          i++;
        }
        lines.push(row);
        row = [""];
      } else {
        row[row.length - 1] += char;
      }
    }
    if (row.length > 1 || row[0] !== "") {
      lines.push(row);
    }
    return lines;
  };

  const handleImportCalendar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        let text = event.target.result;

        // Strip UTF-8 BOM if present
        if (text.startsWith("\ufeff")) {
          text = text.substring(1);
        }

        const lines = parseCSV(text);
        if (lines.length < 2) {
          showToast("CSV is empty or invalid", "error");
          return;
        }

        const headers = lines[0];
        const headerMap = {};
        headers.forEach((h, idx) => {
          const norm = h
            .toLowerCase()
            .trim()
            .replace(/[^a-z0-9]/g, "");
          headerMap[norm] = idx;
        });

        const getValue = (row, keyVariants) => {
          for (const variant of keyVariants) {
            const idx = headerMap[variant];
            if (idx !== undefined && row[idx] !== undefined) {
              return row[idx].trim();
            }
          }
          return "";
        };

        const parseDateString = (dateStr, timeStr) => {
          if (!dateStr) return null;
          const cleanStr = dateStr.trim();

          let resultDate = null;

          // Try split by common delimiters
          let parts = [];
          if (cleanStr.includes("/")) {
            parts = cleanStr.split("/");
          } else if (cleanStr.includes("-")) {
            parts = cleanStr.split("-");
          } else if (cleanStr.includes(".")) {
            parts = cleanStr.split(".");
          }

          if (parts.length === 3) {
            const p0 = parseInt(parts[0], 10);
            const p1 = parseInt(parts[1], 10);
            const p2 = parseInt(parts[2], 10);

            if (!isNaN(p0) && !isNaN(p1) && !isNaN(p2)) {
              if (parts[0].length === 4) {
                // YYYY-MM-DD
                resultDate = new Date(p0, p1 - 1, p2);
              } else {
                // DD-MM-YYYY
                let yr = p2;
                if (yr < 100) yr += 2000;
                resultDate = new Date(yr, p1 - 1, p0);
              }
            }
          }

          // Fallback to built-in Date parser
          if (!resultDate || isNaN(resultDate.getTime())) {
            const d = new Date(cleanStr);
            if (!isNaN(d.getTime())) {
              resultDate = d;
            }
          }

          if (!resultDate || isNaN(resultDate.getTime())) {
            return null;
          }

          // Combine with timeStr if present
          let hours = 12;
          let minutes = 0;
          if (timeStr) {
            const match = timeStr.trim().match(/(\d+):(\d+)\s*(AM|PM)?/i);
            if (match) {
              hours = parseInt(match[1], 10);
              minutes = parseInt(match[2], 10);
              const ampm = match[3];
              if (ampm) {
                if (ampm.toUpperCase() === "PM" && hours < 12) {
                  hours += 12;
                } else if (ampm.toUpperCase() === "AM" && hours === 12) {
                  hours = 0;
                }
              }
            }
          }

          resultDate.setHours(hours, minutes, 0, 0);
          return resultDate;
        };

        const currentCalendar = [...(project.contentCalendar || [])];
        let newCount = 0;
        let updateCount = 0;

        for (let i = 1; i < lines.length; i++) {
          const row = lines[i];
          if (row.length === 1 && row[0] === "") continue;

          const postId = getValue(row, ["postid", "id"]);
          const dateStr = getValue(row, ["date", "scheduleddate", "dateday"]);
          const status = getValue(row, ["status"]);
          const postType = getValue(row, ["posttype", "type"]);
          const topic = getValue(row, [
            "topic",
            "ideationbrief",
            "ideation",
            "brief",
          ]);
          const content = getValue(row, ["content", "caption"]);
          const hashtags = getValue(row, ["hashtags"]);
          const visual = getValue(row, [
            "visualreferencelink",
            "visual",
            "descriptioninternalnotes",
            "description",
            "notes",
            "internalnotes",
          ]);
          const targetPostRaw = getValue(row, ["targetpost", "platforms"]);

          if (!dateStr) continue;

          // Strip day name suffix if present (e.g. "16/06/2026 (Tuesday)")
          const cleanDateStr = dateStr.replace(/\s*\(.*?\)\s*/g, "").trim();

          const parsedDate = parseDateString(cleanDateStr, null);
          if (!parsedDate) continue;

          const year = parsedDate.getFullYear();
          const monthStr = `${year}-${String(parsedDate.getMonth() + 1).padStart(2, "0")}`;

          const platforms = targetPostRaw
            ? targetPostRaw
                .split(",")
                .map((p) => {
                  const clean = p.trim().toLowerCase();
                  if (clean === "instagram" || clean === "ig")
                    return "Instagram";
                  if (clean === "facebook" || clean === "fb") return "Facebook";
                  if (clean === "youtube" || clean === "yt") return "Youtube";
                  if (clean === "linkedin" || clean === "li") return "LinkedIn";
                  if (clean === "twitter" || clean === "tw") return "Twitter";
                  if (
                    clean === "gbp" ||
                    clean === "google business" ||
                    clean === "google business profile"
                  )
                    return "GBP";
                  return "";
                })
                .filter(Boolean)
            : [];

          let normStatus = "Pending";
          const cleanStatus = status.trim().toLowerCase();
          if (
            cleanStatus === "posted" ||
            cleanStatus === "completed" ||
            cleanStatus === "published"
          ) {
            normStatus = "Posted";
          } else if (
            cleanStatus === "design approved" ||
            cleanStatus === "approved" ||
            cleanStatus === "ready"
          ) {
            normStatus = "Design Approved";
          } else if (cleanStatus === "design done" || cleanStatus === "done") {
            normStatus = "Design Done";
          } else {
            normStatus = "Pending";
          }

          let normPostType = "Static";
          if (postType) {
            const cleanPostType = postType
              .trim()
              .toLowerCase()
              .replace(/[^a-z0-9]/g, "");
            if (cleanPostType === "static") normPostType = "Static";
            else if (cleanPostType === "motion") normPostType = "Motion";
            else if (cleanPostType === "reel") normPostType = "Reel";
            else if (cleanPostType === "carousel") normPostType = "Carousel";
            else if (cleanPostType === "motiongraphicwishpost")
              normPostType = "Motion Graphic Wish Post";
            else if (cleanPostType === "wishpost") normPostType = "Wish post";
          }

          const postData = {
            scheduledDate: parsedDate.toISOString(),
            month: monthStr,
            platforms,
            status: normStatus,
            postType: normPostType,
            topic,
            content,
            visual,
            hashtags,
            // Legacy fallbacks
            ideation: topic,
            caption: content,
            description: visual,
          };

          let matchIdx = -1;
          if (postId) {
            matchIdx = currentCalendar.findIndex((p) => p._id === postId);
          }

          if (matchIdx !== -1) {
            currentCalendar[matchIdx] = {
              ...currentCalendar[matchIdx],
              ...postData,
            };
            updateCount++;
          } else {
            currentCalendar.push(postData);
            newCount++;
          }
        }

        if (newCount === 0 && updateCount === 0) {
          showToast("No valid calendar posts found in CSV", "error");
          return;
        }

        const res = await fetch(`/api/projects/${id}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contentCalendar: currentCalendar }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(
            errData.error ||
              errData.message ||
              "Failed to import and save content calendar",
          );
        }
        const updatedProject = await res.json();
        setProject(updatedProject);
        setEditForm((prev) => ({
          ...prev,
          contentCalendar: updatedProject.contentCalendar || [],
        }));

        showToast(
          `Imported calendar: ${newCount} added, ${updateCount} updated`,
          "success",
        );
      } catch (err) {
        showToast(err.message, "error");
      } finally {
        e.target.value = "";
      }
    };
    reader.readAsText(file);
  };

  const handleQuickStatusChange = async (postId, newStatus) => {
    const updatedCalendar = (project.contentCalendar || []).map((post) => {
      if (post._id === postId) {
        return { ...post, status: newStatus };
      }
      return post;
    });

    // Optimistic UI update
    setProject((prev) => ({
      ...prev,
      contentCalendar: updatedCalendar,
    }));

    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contentCalendar: updatedCalendar }),
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error || errData.message || "Failed to update status",
        );
      }
      const updatedProject = await res.json();
      setProject(updatedProject);
      setEditForm((prev) => ({
        ...prev,
        contentCalendar: updatedProject.contentCalendar || [],
      }));
      showToast("Status updated successfully", "success");
    } catch (err) {
      showToast(err.message, "error");
      fetchProjectData(); // revert
    }
  };

  const getStatusStyle = (status) => {
    switch (status) {
      case "Posted":
        return {
          bg: "rgba(16, 185, 129, 0.12)",
          color: "#10b981",
          border: "rgba(16, 185, 129, 0.3)",
        };
      case "Design Approved":
        return {
          bg: "rgba(0, 174, 239, 0.12)",
          color: "#00aeef",
          border: "rgba(0, 174, 239, 0.3)",
        };
      case "Design Done":
        return {
          bg: "rgba(242, 101, 34, 0.12)",
          color: "#f26522",
          border: "rgba(242, 101, 34, 0.3)",
        };
      case "Pending":
      default:
        return {
          bg: "rgba(217, 119, 6, 0.12)",
          color: "#d97706",
          border: "rgba(217, 119, 6, 0.3)",
        };
    }
  };

  const renderPostSummaryCard = (post) => {
    const platformMeta = {
      Instagram: {
        label: "IG",
        color: "#ec4899",
        bg: "rgba(236, 72, 153, 0.08)",
        border: "rgba(236, 72, 153, 0.2)",
      },
      Facebook: {
        label: "FB",
        color: "#3b82f6",
        bg: "rgba(59, 130, 246, 0.08)",
        border: "rgba(59, 130, 246, 0.2)",
      },
      LinkedIn: {
        label: "LI",
        color: "#06b6d4",
        bg: "rgba(6, 182, 212, 0.08)",
        border: "rgba(6, 182, 212, 0.2)",
      },
      Youtube: {
        label: "YT",
        color: "#ef4444",
        bg: "rgba(239, 68, 68, 0.08)",
        border: "rgba(239, 68, 68, 0.2)",
      },
      Twitter: {
        label: "TW",
        color: "#0ea5e9",
        bg: "rgba(14, 165, 233, 0.08)",
        border: "rgba(14, 165, 233, 0.2)",
      },
      GBP: {
        label: "GBP",
        color: "#f26522",
        bg: "rgba(242, 101, 34, 0.08)",
        border: "rgba(242, 101, 34, 0.2)",
      },
    };

    const statusStyle = getStatusStyle(post.status);
    const scheduledDateObj = new Date(post.scheduledDate);
    const weekday = scheduledDateObj.toLocaleDateString("en-IN", {
      weekday: "long",
    });
    const dateStr = scheduledDateObj.toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
    });
    const timeStr = scheduledDateObj.toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

    return (
      <div
        key={post._id}
        style={{
          padding: "0.45rem 0.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "0.75rem",
          width: "100%",
          borderRadius: "8px",
        }}
        className="post-summary-strip post-summary-card"
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.75rem",
            flexShrink: 0,
          }}
        >
          {/* Date & Time display */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              minWidth: "150px",
            }}
          >
            <span
              style={{
                fontSize: "0.8rem",
                fontWeight: 700,
                color: "var(--text-primary)",
                whiteSpace: "nowrap",
              }}
            >
              {dateStr} • {weekday}
            </span>
            <span
              style={{
                fontSize: "0.68rem",
                color: "var(--text-muted)",
                whiteSpace: "nowrap",
                marginTop: "1px",
              }}
            >
              {timeStr}
            </span>
          </div>

          {/* Platform badges */}
          <div
            style={{
              display: "flex",
              gap: "3px",
              flexWrap: "wrap",
              width: "48px",
            }}
          >
            {post.platforms &&
              post.platforms.map((p) => {
                const meta = platformMeta[p] || {
                  label: p.substring(0, 2).toUpperCase(),
                  color: "var(--text-secondary)",
                  bg: "rgba(255,255,255,0.05)",
                  border: "var(--border-color)",
                };
                return (
                  <span
                    key={p}
                    style={{
                      fontSize: "0.6rem",
                      fontWeight: 700,
                      color: meta.color,
                      background: meta.bg,
                      border: `1px solid ${meta.border}`,
                      padding: "1px 3px",
                      borderRadius: "3px",
                      textTransform: "uppercase",
                      lineHeight: "1.1",
                    }}
                    title={p}
                  >
                    {meta.label}
                  </span>
                );
              })}
          </div>
        </div>

        {/* Content details (Truncated) */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "2px",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
            <span
              style={{
                fontSize: "0.65rem",
                fontWeight: 700,
                padding: "1px 5px",
                borderRadius: "4px",
                background: "rgba(0, 174, 239, 0.1)",
                color: "var(--accent-primary)",
                border: "1px solid rgba(0, 174, 239, 0.2)",
                whiteSpace: "nowrap",
              }}
            >
              {post.postType || "Static"}
            </span>
            <span
              style={{
                fontSize: "0.78rem",
                fontWeight: 600,
                color: "var(--text-primary)",
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
              title={`Topic: ${post.topic || post.ideation || ""}`}
            >
              {post.topic || post.ideation || "No Topic"}
            </span>
          </div>
          {(post.content || post.caption) && (
            <div
              style={{
                fontSize: "0.74rem",
                color: "var(--text-secondary)",
                textOverflow: "ellipsis",
                overflow: "hidden",
                whiteSpace: "nowrap",
              }}
              title={`Content: ${post.content || post.caption}`}
            >
              {post.content || post.caption}
            </div>
          )}
        </div>

        {/* Status & Actions */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.5rem",
            flexShrink: 0,
          }}
        >
          <select
            value={post.status}
            onChange={(e) => handleQuickStatusChange(post._id, e.target.value)}
            disabled={permissions?.project_calendar !== "write"}
            style={{
              fontSize: "0.65rem",
              padding: "0.125rem 1.25rem 0.125rem 0.35rem",
              textTransform: "none",
              lineHeight: "1",
              borderRadius: "4px",
              fontWeight: 600,
              border: `1px solid ${statusStyle.border}`,
              background: `${statusStyle.bg} url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='${encodeURIComponent(statusStyle.color)}' stroke-width='2.5' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpolyline points='6 9 12 15 18 9'/%3E%3C/svg%3E") no-repeat right 0.25rem center / 0.55rem`,
              color: statusStyle.color,
              cursor:
                permissions?.project_calendar === "write"
                  ? "pointer"
                  : "default",
              WebkitAppearance: "none",
              MozAppearance: "none",
              appearance: "none",
              height: "22px",
            }}
          >
            <option
              value="Pending"
              style={{ background: "var(--bg-secondary)", color: "#94a3b8" }}
            >
              Pending
            </option>
            <option
              value="Design Done"
              style={{
                background: "var(--bg-secondary)",
                color: "var(--accent-secondary)",
              }}
            >
              Design Done
            </option>
            <option
              value="Design Approved"
              style={{
                background: "var(--bg-secondary)",
                color: "var(--accent-primary)",
              }}
            >
              Design Approved
            </option>
            <option
              value="Posted"
              style={{ background: "var(--bg-secondary)", color: "#10b981" }}
            >
              Posted
            </option>
          </select>

          {permissions?.project_calendar === "write" && (
            <div style={{ display: "flex", gap: "0.15rem" }}>
              <button
                type="button"
                className="icon-btn-edit"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => {
                  setCurrentPost(post);
                  const localDate = new Date(post.scheduledDate);
                  const offset = localDate.getTimezoneOffset();
                  const adjustedDate = new Date(
                    localDate.getTime() - offset * 60 * 1000,
                  );
                  const formattedDate = adjustedDate
                    .toISOString()
                    .substring(0, 16);
                  setPostForm({
                    scheduledDate: formattedDate,
                    postType: post.postType || "Static",
                    topic: post.topic || post.ideation || "",
                    content: post.content || post.caption || "",
                    hashtags: post.hashtags || "",
                    visual: post.visual || post.description || "",
                    platforms: post.platforms || [],
                    status: post.status || "Pending",
                  });
                  setIsAddPostModalOpen(true);
                }}
                title="Edit Post"
              >
                <Edit size={13} />
              </button>
              <button
                type="button"
                className="icon-btn-delete"
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "4px",
                  borderRadius: "4px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
                onClick={() => handleDeletePost(post._id)}
                title="Delete Post"
              >
                <Trash2 size={13} />
              </button>
            </div>
          )}
        </div>
      </div>
    );
  };

  const handleCancelEdit = () => {
    if (project) {
      const activeTypes = Array.isArray(project.projectType)
        ? project.projectType
        : project.projectType
          ? [project.projectType]
          : [];
      const customValues = (project.subcategories || []).filter(
        (sub) => !predefinedSubs.includes(sub),
      );
      const loadedCustomSubs = {
        Development: "",
        "360 Deg Digital Marketing": "",
        "Meta / Google Ads": "",
        Design: "",
      };
      const loadedShowCustomInput = {
        Development: false,
        "360 Deg Digital Marketing": false,
        "Meta / Google Ads": false,
        Design: false,
      };
      let customIdx = 0;
      activeTypes.forEach((type) => {
        if (customIdx < customValues.length) {
          loadedCustomSubs[type] = customValues[customIdx];
          loadedShowCustomInput[type] = true;
          customIdx++;
        }
      });
      setEditCustomSubs(loadedCustomSubs);
      setEditShowCustomInput(loadedShowCustomInput);

      setEditForm({
        name: project.name,
        description: project.description ?? "",
        clientName: project.clientName,
        clientEmail: project.clientEmail ?? "",
        client: project.client ?? "",
        siteUrl: project.siteUrl ?? "",
        quotePrice: project.quotePrice ?? "",
        finalPrice: project.finalPrice ?? "",
        hostingPrice: project.hostingPrice ?? "",
        domainPrice: project.domainPrice ?? "",
        devPrice: project.devPrice ?? "",
        marketingPrice: project.marketingPrice ?? "",
        adsPrice: project.adsPrice ?? "",
        designPrice: project.designPrice ?? "",
        budget: project.budget ?? 0,
        status: project.status,
        devStatus: project.devStatus ?? "Planning",
        marketingStatus: project.marketingStatus ?? "Planning",
        adsStatus: project.adsStatus ?? "Planning",
        designStatus: project.designStatus ?? "Planning",
        startDate: project.startDate
          ? new Date(project.startDate).toISOString().substring(0, 10)
          : "",
        endDate: project.endDate
          ? new Date(project.endDate).toISOString().substring(0, 10)
          : "",
        devStartDate: project.devStartDate
          ? new Date(project.devStartDate).toISOString().substring(0, 10)
          : "",
        devEndDate: project.devEndDate
          ? new Date(project.devEndDate).toISOString().substring(0, 10)
          : "",
        marketingStartDate: project.marketingStartDate
          ? new Date(project.marketingStartDate).toISOString().substring(0, 10)
          : "",
        marketingEndDate: project.marketingEndDate
          ? new Date(project.marketingEndDate).toISOString().substring(0, 10)
          : "",
        adsDate: project.adsDate
          ? new Date(project.adsDate).toISOString().substring(0, 10)
          : "",
        designStartDate: project.designStartDate
          ? new Date(project.designStartDate).toISOString().substring(0, 10)
          : "",
        designEndDate: project.designEndDate
          ? new Date(project.designEndDate).toISOString().substring(0, 10)
          : "",
        hostingExpiry: project.hostingExpiry
          ? new Date(project.hostingExpiry).toISOString().substring(0, 10)
          : "",
        domainExpiry: project.domainExpiry
          ? new Date(project.domainExpiry).toISOString().substring(0, 10)
          : "",
        credentials: project.credentials ?? [],
        links: project.links ?? [],
        quotation: project.quotation ?? null,
        projectType: activeTypes,
        subcategories: project.subcategories ?? [],
        contentCalendar: project.contentCalendar ?? [],
      });
      setEditQuotationUrl(project.quotation?.filePath || "");
      setEditQuotationFile(null);
    }
    setIsEditing(false);
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      setUpdating(true);

      let quotationData = editForm.quotation;
      if (editQuotationFile) {
        const formData = new FormData();
        formData.append("file", editQuotationFile);

        const uploadRes = await fetch("/api/upload", {
          method: "POST",
          body: formData,
        });
        if (!uploadRes.ok) {
          throw new Error("Failed to upload quotation file");
        }
        const uploadData = await uploadRes.json();
        quotationData = {
          fileName: editQuotationFile.name,
          filePath: uploadData.url,
        };
      } else if (editQuotationUrl.trim()) {
        quotationData = {
          fileName: editQuotationUrl.split("/").pop() || "Quotation Document",
          filePath: editQuotationUrl.trim(),
        };
      }

      // Calculate overall project startDate and endDate based on category-specific dates
      const startDates = [];
      const endDates = [];
      if (editForm.projectType.includes("Development")) {
        if (editForm.devStartDate)
          startDates.push(new Date(editForm.devStartDate));
        if (editForm.devEndDate) endDates.push(new Date(editForm.devEndDate));
      }
      if (editForm.projectType.includes("360 Deg Digital Marketing")) {
        if (editForm.marketingStartDate)
          startDates.push(new Date(editForm.marketingStartDate));
        if (editForm.marketingEndDate)
          endDates.push(new Date(editForm.marketingEndDate));
      }
      if (editForm.projectType.includes("Meta / Google Ads")) {
        if (editForm.adsDate) {
          startDates.push(new Date(editForm.adsDate));
          endDates.push(new Date(editForm.adsDate));
        }
      }
      if (editForm.projectType.includes("Design")) {
        if (editForm.designStartDate)
          startDates.push(new Date(editForm.designStartDate));
        if (editForm.designEndDate)
          endDates.push(new Date(editForm.designEndDate));
      }
      const calculatedStartDate =
        startDates.length > 0 ? new Date(Math.min(...startDates)) : null;
      const calculatedEndDate =
        endDates.length > 0 ? new Date(Math.min(...endDates)) : null;

      const calculatedOverallStatus = getOverallStatus({
        projectType: editForm.projectType,
        status: editForm.status,
        devStatus: editForm.devStatus,
        marketingStatus: editForm.marketingStatus,
        adsStatus: editForm.adsStatus,
        designStatus: editForm.designStatus,
        devEndDate: editForm.devEndDate,
        marketingEndDate: editForm.marketingEndDate,
        adsDate: editForm.adsDate,
        designEndDate: editForm.designEndDate,
      });

      const changedFields = [];
      if (project.name !== editForm.name) changedFields.push("Name");
      if (project.description !== editForm.description) changedFields.push("Description");
      if (project.clientName !== editForm.clientName) changedFields.push("Client Name");
      if (project.clientEmail !== editForm.clientEmail) changedFields.push("Client Email");
      
      const oldType = Array.isArray(project.projectType) ? [...project.projectType].sort().join(",") : project.projectType || "";
      const newType = Array.isArray(editForm.projectType) ? [...editForm.projectType].sort().join(",") : editForm.projectType || "";
      if (oldType !== newType) changedFields.push("Project Type");

      const oldSubs = Array.isArray(project.subcategories) ? [...project.subcategories].sort().join(",") : project.subcategories || "";
      const newSubs = Array.isArray(editForm.subcategories) ? [...editForm.subcategories].sort().join(",") : editForm.subcategories || "";
      if (oldSubs !== newSubs) changedFields.push("Subcategories");

      if (project.devStatus !== editForm.devStatus) changedFields.push("Development Status");
      if (project.marketingStatus !== editForm.marketingStatus) changedFields.push("Marketing Status");
      if (project.adsStatus !== editForm.adsStatus) changedFields.push("Ads Status");
      if (project.designStatus !== editForm.designStatus) changedFields.push("Design Status");
      
      const oldHostExp = project.hostingExpiry ? new Date(project.hostingExpiry).toISOString().split('T')[0] : "";
      const newHostExp = editForm.hostingExpiry ? new Date(editForm.hostingExpiry).toISOString().split('T')[0] : "";
      if (oldHostExp !== newHostExp) changedFields.push("Hosting Expiry");

      const oldDomExp = project.domainExpiry ? new Date(project.domainExpiry).toISOString().split('T')[0] : "";
      const newDomExp = editForm.domainExpiry ? new Date(editForm.domainExpiry).toISOString().split('T')[0] : "";
      if (oldDomExp !== newDomExp) changedFields.push("Domain Expiry");

      let updatedStatusUpdates = project.statusUpdates || [];
      if (changedFields.length > 0) {
        const logMessage = `Project Details Updated: ${changedFields.join(", ")}`;
        updatedStatusUpdates = [
          ...updatedStatusUpdates,
          { message: logMessage, date: new Date() }
        ];
      }

      const res = await fetch(`/api/projects/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...editForm,
          statusUpdates: updatedStatusUpdates,
          quotePrice:
            editForm.quotePrice !== "" && editForm.quotePrice !== null
              ? parseFloat(editForm.quotePrice)
              : null,
          hostingPrice:
            editForm.hostingPrice !== "" && editForm.hostingPrice !== null
              ? parseFloat(editForm.hostingPrice)
              : null,
          domainPrice:
            editForm.domainPrice !== "" && editForm.domainPrice !== null
              ? parseFloat(editForm.domainPrice)
              : null,
          devPrice:
            editForm.devPrice !== "" && editForm.devPrice !== null
              ? parseFloat(editForm.devPrice)
              : null,
          marketingPrice:
            editForm.marketingPrice !== "" && editForm.marketingPrice !== null
              ? parseFloat(editForm.marketingPrice)
              : null,
          adsPrice:
            editForm.adsPrice !== "" && editForm.adsPrice !== null
              ? parseFloat(editForm.adsPrice)
              : null,
          designPrice:
            editForm.designPrice !== "" && editForm.designPrice !== null
              ? parseFloat(editForm.designPrice)
              : null,
          finalPrice: (() => {
            const hp =
              editForm.hostingPrice !== "" && editForm.hostingPrice !== null
                ? parseFloat(editForm.hostingPrice) || 0
                : null;
            const dp =
              editForm.domainPrice !== "" && editForm.domainPrice !== null
                ? parseFloat(editForm.domainPrice) || 0
                : null;
            const devP =
              editForm.devPrice !== "" && editForm.devPrice !== null
                ? parseFloat(editForm.devPrice) || 0
                : null;
            const mP =
              editForm.marketingPrice !== "" && editForm.marketingPrice !== null
                ? parseFloat(editForm.marketingPrice) || 0
                : null;
            const adP =
              editForm.adsPrice !== "" && editForm.adsPrice !== null
                ? parseFloat(editForm.adsPrice) || 0
                : null;
            const desP =
              editForm.designPrice !== "" && editForm.designPrice !== null
                ? parseFloat(editForm.designPrice) || 0
                : null;
            const hasPricing =
              hp !== null ||
              dp !== null ||
              devP !== null ||
              mP !== null ||
              adP !== null ||
              desP !== null;
            return hasPricing
              ? (hp || 0) +
                  (dp || 0) +
                  (devP || 0) +
                  (mP || 0) +
                  (adP || 0) +
                  (desP || 0)
              : project.finalPrice || 0;
          })(),
          budget: (() => {
            const hp =
              editForm.hostingPrice !== "" && editForm.hostingPrice !== null
                ? parseFloat(editForm.hostingPrice) || 0
                : null;
            const dp =
              editForm.domainPrice !== "" && editForm.domainPrice !== null
                ? parseFloat(editForm.domainPrice) || 0
                : null;
            const devP =
              editForm.devPrice !== "" && editForm.devPrice !== null
                ? parseFloat(editForm.devPrice) || 0
                : null;
            const mP =
              editForm.marketingPrice !== "" && editForm.marketingPrice !== null
                ? parseFloat(editForm.marketingPrice) || 0
                : null;
            const adP =
              editForm.adsPrice !== "" && editForm.adsPrice !== null
                ? parseFloat(editForm.adsPrice) || 0
                : null;
            const desP =
              editForm.designPrice !== "" && editForm.designPrice !== null
                ? parseFloat(editForm.designPrice) || 0
                : null;
            const hasPricing =
              hp !== null ||
              dp !== null ||
              devP !== null ||
              mP !== null ||
              adP !== null ||
              desP !== null;
            return hasPricing
              ? (hp || 0) +
                  (dp || 0) +
                  (devP || 0) +
                  (mP || 0) +
                  (adP || 0) +
                  (desP || 0)
              : project.budget || 0;
          })(),
          startDate: calculatedStartDate,
          endDate: calculatedEndDate,
          status: calculatedOverallStatus,
          devStatus: editForm.devStatus || "Planning",
          marketingStatus: editForm.marketingStatus || "Planning",
          adsStatus: editForm.adsStatus || "Planning",
          designStatus: editForm.designStatus || "Planning",
          devStartDate: editForm.devStartDate || null,
          devEndDate: editForm.devEndDate || null,
          marketingStartDate: editForm.marketingStartDate || null,
          marketingEndDate: editForm.marketingEndDate || null,
          adsDate: editForm.adsDate || null,
          designStartDate: editForm.designStartDate || null,
          designEndDate: editForm.designEndDate || null,
          hostingExpiry: editForm.hostingExpiry || null,
          domainExpiry: editForm.domainExpiry || null,
          quotation: quotationData,
        }),
      });

      if (!res.ok) throw new Error("Failed to update project");
      const updatedProject = await res.json();
      setProject(updatedProject);

      const activeTypes = Array.isArray(updatedProject.projectType)
        ? updatedProject.projectType
        : updatedProject.projectType
          ? [updatedProject.projectType]
          : [];

      const customValues = (updatedProject.subcategories || []).filter(
        (sub) => !predefinedSubs.includes(sub),
      );
      const loadedCustomSubs = {
        Development: "",
        "360 Deg Digital Marketing": "",
        "Meta / Google Ads": "",
        Design: "",
      };
      const loadedShowCustomInput = {
        Development: false,
        "360 Deg Digital Marketing": false,
        "Meta / Google Ads": false,
        Design: false,
      };

      let customIdx = 0;
      activeTypes.forEach((type) => {
        if (customIdx < customValues.length) {
          loadedCustomSubs[type] = customValues[customIdx];
          loadedShowCustomInput[type] = true;
          customIdx++;
        }
      });

      setEditCustomSubs(loadedCustomSubs);
      setEditShowCustomInput(loadedShowCustomInput);

      // Update form state with new saved values
      setEditForm({
        name: updatedProject.name,
        description: updatedProject.description ?? "",
        clientName: updatedProject.clientName,
        clientEmail: updatedProject.clientEmail ?? "",
        client: updatedProject.client ?? "",
        siteUrl: updatedProject.siteUrl ?? "",
        quotePrice: updatedProject.quotePrice ?? "",
        finalPrice: updatedProject.finalPrice ?? "",
        hostingPrice: updatedProject.hostingPrice ?? "",
        domainPrice: updatedProject.domainPrice ?? "",
        devPrice: updatedProject.devPrice ?? "",
        marketingPrice: updatedProject.marketingPrice ?? "",
        adsPrice: updatedProject.adsPrice ?? "",
        designPrice: updatedProject.designPrice ?? "",
        budget: updatedProject.budget ?? 0,
        status: updatedProject.status,
        devStatus: updatedProject.devStatus ?? "Planning",
        marketingStatus: updatedProject.marketingStatus ?? "Planning",
        adsStatus: updatedProject.adsStatus ?? "Planning",
        designStatus: updatedProject.designStatus ?? "Planning",
        startDate: updatedProject.startDate
          ? new Date(updatedProject.startDate).toISOString().substring(0, 10)
          : "",
        endDate: updatedProject.endDate
          ? new Date(updatedProject.endDate).toISOString().substring(0, 10)
          : "",
        devStartDate: updatedProject.devStartDate
          ? new Date(updatedProject.devStartDate).toISOString().substring(0, 10)
          : "",
        devEndDate: updatedProject.devEndDate
          ? new Date(updatedProject.devEndDate).toISOString().substring(0, 10)
          : "",
        marketingStartDate: updatedProject.marketingStartDate
          ? new Date(updatedProject.marketingStartDate)
              .toISOString()
              .substring(0, 10)
          : "",
        marketingEndDate: updatedProject.marketingEndDate
          ? new Date(updatedProject.marketingEndDate)
              .toISOString()
              .substring(0, 10)
          : "",
        adsDate: updatedProject.adsDate
          ? new Date(updatedProject.adsDate).toISOString().substring(0, 10)
          : "",
        designStartDate: updatedProject.designStartDate
          ? new Date(updatedProject.designStartDate)
              .toISOString()
              .substring(0, 10)
          : "",
        designEndDate: updatedProject.designEndDate
          ? new Date(updatedProject.designEndDate)
              .toISOString()
              .substring(0, 10)
          : "",
        hostingExpiry: updatedProject.hostingExpiry
          ? new Date(updatedProject.hostingExpiry)
              .toISOString()
              .substring(0, 10)
          : "",
        domainExpiry: updatedProject.domainExpiry
          ? new Date(updatedProject.domainExpiry).toISOString().substring(0, 10)
          : "",
        credentials: updatedProject.credentials ?? [],
        links: updatedProject.links ?? [],
        quotation: updatedProject.quotation ?? null,
        projectType: activeTypes,
        subcategories: updatedProject.subcategories ?? [],
        contentCalendar: updatedProject.contentCalendar ?? [],
      });

      setEditQuotationFile(null);

      // Save employee assignment changes made in the edit form
      try {
        const assignRes = await fetch(`/api/projects/${id}/assign`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ employeeIds: selectedEmployeeIds }),
        });
        if (assignRes.ok) {
          const assignData = await assignRes.json();
          setAssignedEmployees(assignData.assignedEmployees || []);
        }
      } catch (_) {
        /* non-critical */
      }

      showToast("Project details updated successfully", "success");
      setIsEditing(false);
    } catch (err) {
      showToast(err.message, "error");
    } finally {
      setUpdating(false);
    }
  };

  const handleDeleteProject = async () => {
    showConfirm({
      title: "Delete Project",
      message:
        "Are you sure you want to delete this project? This will also delete all associated invoices and cannot be undone.",
      type: "danger",
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/projects/${id}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error("Failed to delete project");
          showToast("Project deleted successfully", "success");
          router.push("/projects");
        } catch (err) {
          showToast(err.message, "error");
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="empty-state">
        <Clock
          className="animate-spin"
          size={48}
          style={{ color: "var(--accent-primary)" }}
        />
        <h3>Loading project details...</h3>
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="empty-state" style={{ color: "#ef4444" }}>
        <AlertCircle size={48} />
        <h3>Error Loading Project</h3>
        <p>{error || "Project not found"}</p>
        <Link
          href="/projects"
          className="btn btn-secondary"
          style={{ marginTop: "1rem" }}
        >
          Back to Projects
        </Link>
      </div>
    );
  }

  const employeeFilteredTasks = (project?.tasks || []).filter((t) => {
    if (category === "Employee") {
      return t.assignedTo?.toLowerCase() === username?.toLowerCase();
    }
    return true;
  });

  const completedTasks = employeeFilteredTasks.filter((t) => t.completed).length;
  const totalTasks = employeeFilteredTasks.length;
  const taskProgress =
    totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  const assignableUsers = (() => {
    const list = [];
    const seenUsernames = new Set();

    (companyUsers || []).forEach((u) => {
      if (u.username && !seenUsernames.has(u.username)) {
        list.push({ id: u.id || u._id, username: u.username });
        seenUsernames.add(u.username);
      }
    });

    (assignedEmployees || []).forEach((u) => {
      if (u.username && !seenUsernames.has(u.username)) {
        list.push({ id: u._id || u.id, username: u.username });
        seenUsernames.add(u.username);
      }
    });

    return list;
  })();

  const formatCurrency = (value) => {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(value);
  };

  const allowedTabs = tabs.filter((tab) => {
    if (!permissions) return false;
    const permKey = tabPermissionMap[tab.id];
    return permissions[permKey] && permissions[permKey] !== "none";
  });

  const invoicesList = [...invoices].sort(
    (a, b) => new Date(a.issueDate) - new Date(b.issueDate),
  );
  const paidTotal = invoices
    .filter((inv) => inv.status === "Paid")
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  const pendingTotal = invoices
    .filter((inv) => inv.status !== "Paid")
    .reduce((sum, inv) => sum + (inv.total || 0), 0);
  const totalInvoiced = invoices.reduce(
    (sum, inv) => sum + (inv.total || 0),
    0,
  );
  const billingProgress =
    totalInvoiced > 0 ? Math.round((paidTotal / totalInvoiced) * 100) : 0;
  const outstandingTotal = Math.max(
    0,
    (project.finalPrice || 0) - totalInvoiced,
  );
  const paymentProgress =
    (project.finalPrice || 0) > 0
      ? Math.min(100, Math.round((paidTotal / (project.finalPrice || 0)) * 100))
      : 0;
  const projectOutstanding = Math.max(0, (project.finalPrice || 0) - paidTotal);

  const handleExportTaskReport = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Popup blocker prevented opening the report. Please allow popups.', 'error');
      return;
    }

    const brandColor = getComputedStyle(document.documentElement).getPropertyValue('--accent-primary') || '#00aeef';
    
    let tasksToReport = [...employeeFilteredTasks];
    if (exportFromDate) {
      tasksToReport = tasksToReport.filter(t => t.dueDate && new Date(t.dueDate) >= new Date(exportFromDate));
    }
    if (exportToDate) {
      const toDateObj = new Date(exportToDate);
      toDateObj.setHours(23, 59, 59, 999);
      tasksToReport = tasksToReport.filter(t => t.dueDate && new Date(t.dueDate) <= toDateObj);
    }

    const totalTasksCount = tasksToReport.length;
    const completedTasksCount = tasksToReport.filter(t => t.completed).length;
    const progress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0;
    const todoCount = tasksToReport.filter(t => t.status === 'Todo').length;
    const inProgressCount = tasksToReport.filter(t => t.status === 'In Progress').length;

    // Serialise tasks so they can be downloaded as CSV from the print window
    const tasksJson = JSON.stringify(tasksToReport.map(t => ({
      name: t.name,
      assignedTo: t.assignedTo || '—',
      priority: t.priority || 'Medium',
      dueDate: t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : '—',
      status: t.status || 'Todo',
      notes: t.notes || '',
      assignedBy: t.assignedBy || '—'
    })));

    const tableRows = [...tasksToReport]
      .sort((a, b) => {
        if (!a.dueDate && !b.dueDate) return 0;
        if (!a.dueDate) return 1;
        if (!b.dueDate) return -1;
        return new Date(a.dueDate) - new Date(b.dueDate);
      })
      .map(t => {
        const priorityColor = t.priority === 'High' ? '#ef4444' : t.priority === 'Low' ? '#10b981' : '#f59e0b';
        const priorityBg = t.priority === 'High' ? 'rgba(239, 68, 68, 0.1)' : t.priority === 'Low' ? 'rgba(16, 185, 129, 0.1)' : 'rgba(245, 158, 11, 0.1)';
        const statusBadgeClass = t.status === 'Completed' ? 'status-completed' : t.status === 'In Progress' ? 'status-inprogress' : 'status-todo';
        return `
          <tr>
            <td>
              <div style="font-weight: 600; font-size: 0.95rem; color: #0f172a;">${t.name}</div>
              ${t.notes ? `<div style="font-size: 0.8rem; color: #64748b; margin-top: 4px; font-weight: normal; line-height: 1.3;">${t.notes}</div>` : ''}
            </td>
            <td>${t.assignedTo || '—'}</td>
            <td>
              <span class="badge" style="background: ${priorityBg}; color: ${priorityColor}; border: 1px solid ${priorityColor}33;">
                <span class="dot" style="background: ${priorityColor};"></span>
                ${t.priority || 'Medium'}
              </span>
            </td>
            <td>${t.dueDate ? new Date(t.dueDate).toLocaleDateString('en-IN') : '—'}</td>
            <td><span class="badge ${statusBadgeClass}">${t.status || 'Todo'}</span></td>
            <td>${t.assignedBy || '—'}</td>
          </tr>
        `;
      }).join('');

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Task Completion Report - ${project.name}</title>
        <style>
          body {
            font-family: 'Outfit', 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            color: #1e293b;
            background-color: #f8fafc;
            margin: 0;
            padding: 0;
          }
          .no-print-bar {
            background: #0f172a;
            color: white;
            padding: 12px 24px;
            display: flex;
            justify-content: space-between;
            align-items: center;
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
            position: sticky;
            top: 0;
            z-index: 100;
          }
          .btn {
            background: #2563eb;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            font-weight: 500;
            cursor: pointer;
            display: inline-flex;
            align-items: center;
            gap: 8px;
            font-size: 0.875rem;
            transition: all 0.2s;
          }
          .btn:hover {
            background: #1d4ed8;
          }
          .btn-secondary {
            background: #334155;
          }
          .btn-secondary:hover {
            background: #1e293b;
          }
          .container {
            max-width: 1000px;
            margin: 40px auto;
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.05), 0 4px 6px -4px rgb(0 0 0 / 0.05);
            border: 1px solid #e2e8f0;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #f1f5f9;
            padding-bottom: 24px;
            margin-bottom: 30px;
          }
          h1 {
            margin: 0 0 8px 0;
            font-size: 28px;
            color: #0f172a;
            font-weight: 700;
            letter-spacing: -0.02em;
          }
          .project-meta {
            font-size: 0.95rem;
            color: #64748b;
            line-height: 1.6;
          }
          .meta-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #f1f5f9;
          }
          .meta-item {
            display: flex;
            flex-direction: column;
            gap: 4px;
          }
          .meta-label {
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            color: #94a3b8;
            font-weight: 600;
          }
          .meta-value {
            font-size: 0.95rem;
            color: #334155;
            font-weight: 500;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 16px;
            margin-bottom: 30px;
          }
          .stat-card {
            background: #fff;
            padding: 16px;
            border-radius: 12px;
            border: 1px solid #e2e8f0;
            text-align: center;
          }
          .stat-num {
            font-size: 24px;
            font-weight: 700;
            color: #0f172a;
          }
          .stat-label {
            font-size: 0.8rem;
            color: #64748b;
            margin-top: 4px;
          }
          .progress-section {
            background: #f8fafc;
            padding: 20px;
            border-radius: 12px;
            border: 1px solid #f1f5f9;
            margin-bottom: 35px;
          }
          .progress-bar-container {
            height: 12px;
            background: #e2e8f0;
            border-radius: 9999px;
            overflow: hidden;
            margin-top: 8px;
          }
          .progress-bar-fill {
            height: 100%;
            background: ${brandColor};
            border-radius: 9999px;
            width: ${progress}%;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 20px;
          }
          th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            padding: 14px 16px;
            text-align: left;
            border-bottom: 2px solid #e2e8f0;
          }
          td {
            padding: 14px 16px;
            font-size: 0.9rem;
            border-bottom: 1px solid #f1f5f9;
            color: #334155;
            vertical-align: top;
          }
          .badge {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 9999px;
            font-size: 0.75rem;
            font-weight: 600;
          }
          .dot {
            width: 6px;
            height: 6px;
            border-radius: 50%;
          }
          .status-completed {
            background: #ecfdf5;
            color: #065f46;
            border: 1px solid #a7f3d0;
          }
          .status-inprogress {
            background: #eff6ff;
            color: #1e40af;
            border: 1px solid #bfdbfe;
          }
          .status-todo {
            background: #f1f5f9;
            color: #475569;
            border: 1px solid #cbd5e1;
          }
          .footer {
            margin-top: 40px;
            border-top: 1px solid #f1f5f9;
            padding-top: 20px;
            text-align: center;
            font-size: 0.75rem;
            color: #94a3b8;
          }
          @media print {
            .no-print-bar {
              display: none;
            }
            body {
              background: white;
              margin: 0;
            }
            .container {
              box-shadow: none;
              border: none;
              padding: 0;
              margin: 0;
              max-width: 100%;
            }
          }
        </style>
      </head>
      <body>
        <div class="no-print-bar">
          <div style="font-weight: 600; font-size: 0.95rem;">Project Task Completion Report</div>
          <div style="display: flex; gap: 10px;">
            <button class="btn btn-secondary" onclick="downloadCSV()">Download CSV</button>
            <button class="btn" onclick="window.print()">Print / Save PDF</button>
          </div>
        </div>
        <div class="container">
          <div class="header">
            <div>
              <h1>${project.name}</h1>
              <div class="project-meta">
                <span>Client: <strong>${project.clientName}</strong></span>
                ${project.siteUrl ? ` &nbsp;•&nbsp; <span>Website: <a href="${project.siteUrl}" target="_blank" style="color: #2563eb; text-decoration: none;">${project.siteUrl}</a></span>` : ''}
                ${(exportFromDate || exportToDate) ? ` &nbsp;•&nbsp; <span>Date Range: <strong>${exportFromDate ? new Date(exportFromDate).toLocaleDateString('en-IN') : 'Start'} to ${exportToDate ? new Date(exportToDate).toLocaleDateString('en-IN') : 'End'}</strong></span>` : ''}
              </div>
            </div>
            <div style="text-align: right;">
              <span class="badge ${project.status === 'Completed' ? 'status-completed' : project.status === 'In Progress' ? 'status-inprogress' : 'status-todo'}" style="font-size: 0.85rem; padding: 6px 14px;">
                ${project.status}
              </span>
            </div>
          </div>

          <div class="meta-grid">
            <div class="meta-item">
              <div class="meta-label">Project Type</div>
              <div class="meta-value">${(project.projectType || []).join(', ') || '—'}</div>
            </div>
            <div class="meta-item">
              <div class="meta-label">Start Date</div>
              <div class="meta-value">${project.startDate ? new Date(project.startDate).toLocaleDateString('en-IN') : '—'}</div>
            </div>
          </div>

          <div class="progress-section">
            <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 0.95rem;">
              <span>Overall Task Checklist Progress</span>
              <span style="color: ${brandColor};">${progress}%</span>
            </div>
            <div class="progress-bar-container">
              <div class="progress-bar-fill"></div>
            </div>
          </div>

          <div class="stats-grid">
            <div class="stat-card">
              <div class="stat-num">${totalTasksCount}</div>
              <div class="stat-label">Total Tasks</div>
            </div>
            <div class="stat-card" style="border-left: 4px solid #10b981;">
              <div class="stat-num" style="color: #10b981;">${completedTasksCount}</div>
              <div class="stat-label">Completed</div>
            </div>
            <div class="stat-card" style="border-left: 4px solid #2563eb;">
              <div class="stat-num" style="color: #2563eb;">${inProgressCount}</div>
              <div class="stat-label">In Progress</div>
            </div>
            <div class="stat-card" style="border-left: 4px solid #64748b;">
              <div class="stat-num" style="color: #475569;">${todoCount}</div>
              <div class="stat-label">Todo</div>
            </div>
          </div>

          <h2 style="font-size: 1.2rem; font-weight: 600; color: #0f172a; margin-top: 30px; margin-bottom: 12px; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
            Task Checklist Breakdown
          </h2>
          <table>
            <thead>
              <tr>
                <th>Task Details</th>
                <th>Assigned To</th>
                <th>Priority</th>
                <th>Due Date</th>
                <th>Status</th>
                <th>Assigned By</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows || '<tr><td colspan="6" style="text-align: center; color: #94a3b8; padding: 30px;">No tasks match the active filters.</td></tr>'}
            </tbody>
          </table>

          <div class="footer">
            <p>Task Completion Report generated dynamically by IONETWEB Workspace Management.</p>
            <p style="margin-top: 4px; font-size: 0.7rem;">Generated on ${new Date().toLocaleString('en-IN')}</p>
          </div>
        </div>

        <script>
          const tasksData = ${tasksJson};
          const projectName = "${project.name.replace(/"/g, '\\"')}";

          function downloadCSV() {
            const headers = ["Task Name", "Assigned To", "Priority", "Due Date", "Status", "Notes", "Assigned By"];
            const rows = tasksData.map(t => [
              t.name,
              t.assignedTo,
              t.priority,
              t.dueDate,
              t.status,
              t.notes,
              t.assignedBy
            ]);

            const csvContent = [
              headers.join(","),
              ...rows.map(r => r.map(val => '"' + String(val).replace(/"/g, '""') + '"').join(","))
            ].join("\\n");

            const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.setAttribute("href", url);
            link.setAttribute("download", projectName.replace(/\s+/g, '_') + "_Task_Completion_Report.csv");
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
        </script>
      </body>
      </html>
    `;

    printWindow.document.open();
    printWindow.document.write(htmlContent);
    printWindow.document.close();
  };

  return (
    <>
      <div className="animate-fade-in">
        {/* Back navigation */}
        <div style={{ marginBottom: "1.5rem" }}>
          <Link
            href="/projects"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.5rem",
              color: "var(--text-secondary)",
              fontWeight: 500,
            }}
          >
            <ArrowLeft size={16} />
            <span>Back to Projects</span>
          </Link>
        </div>

        {/* Persistent Page Header */}
        <div
          className="card"
          style={{
            marginBottom: "1.5rem",
            padding: "1.75rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: "1.25rem",
            }}
          >
            <div style={{ flex: "1 1 300px" }}>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "0.85rem",
                  flexWrap: "wrap",
                  marginBottom: "0.5rem",
                }}
              >
                <h1
                  style={{
                    fontSize: "1.8rem",
                    fontWeight: 800,
                    margin: 0,
                    color: "var(--text-primary)",
                    letterSpacing: "-0.02em",
                    lineHeight: "1.2",
                  }}
                >
                  {project.name}
                </h1>
                <span
                  className={`badge badge-${project.status.toLowerCase().replace(" ", "")}`}
                  style={{
                    padding: "0.35rem 0.85rem",
                    borderRadius: "6px",
                    fontSize: "0.72rem",
                    fontWeight: 700,
                    letterSpacing: "0.03em",
                    lineHeight: "1",
                    transform: "translateY(1px)",
                  }}
                >
                  {project.status}
                </span>
              </div>
              <p
                style={{
                  color: "var(--text-secondary)",
                  lineHeight: "1.6",
                  fontSize: "0.92rem",
                  margin: 0,
                  whiteSpace: "pre-wrap",
                  marginTop: "0.5rem",
                }}
              >
                {project.description ||
                  "No description provided for this project."}
              </p>
            </div>
            {permissions?.project_details === "write" && (
              <div
                style={{
                  display: "flex",
                  gap: "0.5rem",
                  alignSelf: "flex-start",
                }}
              >
                {!isEditing ? (
                  <>
                    <button
                      className="btn btn-secondary"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.5rem 1rem",
                      }}
                      onClick={() => setIsEditing(true)}
                    >
                      <Edit size={16} />
                      <span>Edit Details</span>
                    </button>
                    <button
                      className="btn btn-danger"
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        padding: "0.5rem 1rem",
                      }}
                      onClick={handleDeleteProject}
                    >
                      <Trash2 size={16} />
                      <span>Delete Project</span>
                    </button>
                  </>
                ) : (
                  <div style={{ display: "flex", gap: "0.5rem" }}>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      onClick={handleCancelEdit}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      form="project-edit-form"
                      className="btn btn-primary"
                      disabled={updating}
                    >
                      {updating ? "Saving..." : "Save"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Assigned Team Members */}
        <div
          className="card"
          style={{
            marginBottom: "1.5rem",
            padding: "1.25rem 1.75rem",
            background: "var(--bg-secondary)",
            border: "1px solid var(--border-color)",
            borderRadius: "12px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: "1rem",
              flexWrap: "wrap",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "1rem",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{
                  fontSize: "0.85rem",
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  whiteSpace: "nowrap",
                }}
              >
                Assigned Team:
              </span>
              {assignedEmployees.length === 0 ? (
                <span
                  style={{
                    fontSize: "0.82rem",
                    color: "var(--text-muted)",
                    fontStyle: "italic",
                  }}
                >
                  No employees assigned yet
                </span>
              ) : (
                <div
                  style={{
                    display: "flex",
                    gap: "0.5rem",
                    flexWrap: "wrap",
                    alignItems: "center",
                  }}
                >
                  {assignedEmployees.map((emp) => {
                    const name = emp.username || emp;
                    const initials = name.substring(0, 2).toUpperCase();
                    let hash = 0;
                    for (let i = 0; i < name.length; i++) {
                      hash = name.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    const hue = Math.abs(hash % 360);
                    return (
                      <div
                        key={emp._id || emp}
                        title={emp.username}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          background: "var(--bg-primary)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "20px",
                          padding: "0.25rem 0.65rem 0.25rem 0.25rem",
                        }}
                      >
                        <div
                          style={{
                            width: "24px",
                            height: "24px",
                            borderRadius: "50%",
                            background: `hsl(${hue}, 65%, 45%)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.65rem",
                            fontWeight: 700,
                            color: "#fff",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <span
                          style={{
                            fontSize: "0.78rem",
                            fontWeight: 500,
                            color: "var(--text-primary)",
                          }}
                        >
                          {emp.username}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
            {(role === "superadmin" ||
              role === "company_admin" ||
              category === "Management") && (
              <button
                className="btn btn-secondary"
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: "0.4rem",
                  padding: "0.4rem 0.9rem",
                  fontSize: "0.82rem",
                  whiteSpace: "nowrap",
                }}
                onClick={() => {
                  setSelectedEmployeeIds(
                    assignedEmployees.map((e) => e._id || e),
                  );
                  setIsAssignModalOpen(true);
                }}
              >
                <User size={14} />
                Assign Members
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="tabs-nav-container">
          {allowedTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`tab-nav-btn ${activeTab === tab.id ? "active" : ""}`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Contents wrapper */}
        <div style={{ marginBottom: "3rem" }}>
          {isEditing ? (
            <form id="project-edit-form" onSubmit={handleEditSubmit}>
              {/* Tab 1: Project Details (Edit Mode) */}
              {activeTab === "details" && (
                <div className="card animate-fade-in">
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      marginBottom: "1.5rem",
                      borderBottom: "1px solid var(--border-color)",
                      paddingBottom: "0.75rem",
                    }}
                  >
                    Edit Details Info
                  </h3>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr",
                      gap: "2rem",
                      alignItems: "start",
                    }}
                    className="responsive-grid"
                  >
                    {/* Left Column: Category, Name, Desc, Client & Quotation */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.5rem",
                      }}
                    >
                      {/* Project Type & Subcategory Selection */}
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.01)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "12px",
                          padding: "1rem",
                          position: "relative",
                        }}
                      >
                        <div
                          className="form-group"
                          style={{ marginBottom: 0, position: "relative" }}
                        >
                          <label
                            className="form-label"
                            style={{ fontWeight: 600 }}
                          >
                            Project Type *
                          </label>
                          <button
                            type="button"
                            className="form-select animate-fade-in"
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              textAlign: "left",
                              background: "rgba(255, 255, 255, 0.03)",
                              cursor: "pointer",
                              width: "100%",
                              minHeight: "38px",
                              color:
                                editForm.projectType.length > 0
                                  ? "var(--text-primary)"
                                  : "var(--text-muted)",
                            }}
                            onClick={() =>
                              setIsTypeDropdownOpen(!isTypeDropdownOpen)
                            }
                          >
                            <span
                              style={{
                                textOverflow: "ellipsis",
                                overflow: "hidden",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {editForm.projectType.length > 0
                                ? editForm.projectType.join(", ")
                                : "Select Project Types"}
                            </span>
                            <ChevronDown
                              size={16}
                              style={{
                                color: "var(--text-secondary)",
                                flexShrink: 0,
                              }}
                            />
                          </button>

                          {isTypeDropdownOpen && (
                            <>
                              <div
                                style={{
                                  position: "fixed",
                                  top: 0,
                                  left: 0,
                                  right: 0,
                                  bottom: 0,
                                  zIndex: 998,
                                }}
                                onClick={() => setIsTypeDropdownOpen(false)}
                              />
                              <div
                                style={{
                                  position: "absolute",
                                  top: "100%",
                                  left: 0,
                                  right: 0,
                                  zIndex: 999,
                                  background: "var(--bg-secondary)",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "8px",
                                  marginTop: "4px",
                                  boxShadow: "0 10px 25px rgba(0, 0, 0, 0.5)",
                                  padding: "0.4rem",
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.2rem",
                                }}
                              >
                                {[
                                  "Development",
                                  "360 Deg Digital Marketing",
                                  "Meta / Google Ads",
                                  "Design",
                                ].map((type) => {
                                  const isChecked =
                                    editForm.projectType.includes(type);
                                  return (
                                    <label
                                      key={type}
                                      style={{
                                        display: "flex",
                                        alignItems: "center",
                                        justifyContent: "space-between",
                                        padding: "0.55rem 0.75rem",
                                        borderRadius: "6px",
                                        cursor: "pointer",
                                        fontSize: "0.85rem",
                                        background: isChecked
                                          ? "rgba(0, 174, 239, 0.08)"
                                          : "transparent",
                                        color: isChecked
                                          ? "var(--accent-primary)"
                                          : "var(--text-primary)",
                                        margin: 0,
                                      }}
                                      className="type-dropdown-item"
                                    >
                                      <div
                                        style={{
                                          display: "flex",
                                          alignItems: "center",
                                          gap: "0.5rem",
                                        }}
                                      >
                                        <input
                                          type="checkbox"
                                          checked={isChecked}
                                          onChange={() => {
                                            let updatedTypes;
                                            if (isChecked) {
                                              updatedTypes =
                                                editForm.projectType.filter(
                                                  (t) => t !== type,
                                                );
                                            } else {
                                              updatedTypes = [
                                                ...editForm.projectType,
                                                type,
                                              ];
                                            }
                                            const newSubs =
                                              editForm.subcategories.filter(
                                                (sub) => {
                                                  const isPre =
                                                    updatedTypes.some((t) =>
                                                      getSubcategoriesList(
                                                        t,
                                                      ).includes(sub),
                                                    );
                                                  if (isPre) return true;
                                                  return updatedTypes.some(
                                                    (t) =>
                                                      editShowCustomInput[t] &&
                                                      editCustomSubs[
                                                        t
                                                      ].trim() === sub,
                                                  );
                                                },
                                              );
                                            setEditForm((prev) => ({
                                              ...prev,
                                              projectType: updatedTypes,
                                              subcategories: newSubs,
                                            }));
                                          }}
                                          style={{
                                            width: "14px",
                                            height: "14px",
                                            borderRadius: "3px",
                                            cursor: "pointer",
                                          }}
                                          onClick={(e) => e.stopPropagation()}
                                        />
                                        <span style={{ userSelect: "none" }}>
                                          {type}
                                        </span>
                                      </div>
                                      {isChecked && (
                                        <Check
                                          size={14}
                                          style={{
                                            color: "var(--accent-primary)",
                                          }}
                                        />
                                      )}
                                    </label>
                                  );
                                })}
                              </div>
                            </>
                          )}
                        </div>

                        {Array.isArray(editForm.projectType) &&
                          editForm.projectType.length > 0 && (
                            <div
                              className="form-group"
                              style={{ marginTop: "1rem", marginBottom: 0 }}
                            >
                              <label
                                className="form-label"
                                style={{
                                  marginBottom: "0.5rem",
                                  display: "block",
                                  fontSize: "0.8rem",
                                }}
                              >
                                Select Subcategories
                              </label>
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.75rem",
                                }}
                              >
                                {editForm.projectType.map((type) => {
                                  const subs = getSubcategoriesList(type);
                                  return (
                                    <div
                                      key={type}
                                      style={{
                                        background: "var(--bg-primary)",
                                        border: "1px solid var(--border-color)",
                                        borderRadius: "10px",
                                        padding: "0.85rem",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: "0.8rem",
                                          fontWeight: 700,
                                          color: "var(--accent-primary)",
                                          display: "block",
                                          marginBottom: "0.5rem",
                                          letterSpacing: "0.02em",
                                          textTransform: "uppercase",
                                        }}
                                      >
                                        {type}
                                      </span>
                                      <div
                                        style={{
                                          display: "grid",
                                          gridTemplateColumns:
                                            "repeat(auto-fill, minmax(110px, 1fr))",
                                          gap: "0.5rem",
                                        }}
                                      >
                                        {subs.map((sub) => {
                                          const isChecked =
                                            editForm.subcategories.includes(
                                              sub,
                                            );
                                          return (
                                            <label
                                              key={sub}
                                              style={{
                                                display: "flex",
                                                alignItems: "center",
                                                gap: "0.35rem",
                                                fontSize: "0.8rem",
                                                color: "var(--text-primary)",
                                                fontWeight: 500,
                                                cursor: "pointer",
                                                margin: 0,
                                              }}
                                            >
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                  const updated = isChecked
                                                    ? editForm.subcategories.filter(
                                                        (s) => s !== sub,
                                                      )
                                                    : [
                                                        ...editForm.subcategories,
                                                        sub,
                                                      ];
                                                  setEditForm((prev) => ({
                                                    ...prev,
                                                    subcategories: updated,
                                                  }));
                                                }}
                                                style={{
                                                  width: "13px",
                                                  height: "13px",
                                                  borderRadius: "3px",
                                                  cursor: "pointer",
                                                }}
                                              />
                                              <span
                                                style={{
                                                  userSelect: "none",
                                                  overflow: "hidden",
                                                  textOverflow: "ellipsis",
                                                  whiteSpace: "nowrap",
                                                }}
                                                title={sub}
                                              >
                                                {sub}
                                              </span>
                                            </label>
                                          );
                                        })}
                                        {/* Others option */}
                                        <label
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "0.35rem",
                                            fontSize: "0.8rem",
                                            color: "var(--text-primary)",
                                            fontWeight: 500,
                                            cursor: "pointer",
                                            margin: 0,
                                          }}
                                        >
                                          <input
                                            type="checkbox"
                                            checked={
                                              editShowCustomInput[type] || false
                                            }
                                            onChange={(e) => {
                                              const checked = e.target.checked;
                                              setEditShowCustomInput(
                                                (prev) => ({
                                                  ...prev,
                                                  [type]: checked,
                                                }),
                                              );
                                              if (!checked) {
                                                const currentCustomVal =
                                                  editCustomSubs[type];
                                                if (currentCustomVal) {
                                                  setEditForm((prev) => ({
                                                    ...prev,
                                                    subcategories:
                                                      prev.subcategories.filter(
                                                        (s) =>
                                                          s !==
                                                          currentCustomVal.trim(),
                                                      ),
                                                  }));
                                                }
                                              } else {
                                                const currentCustomVal =
                                                  editCustomSubs[type];
                                                if (
                                                  currentCustomVal &&
                                                  currentCustomVal.trim()
                                                ) {
                                                  setEditForm((prev) => ({
                                                    ...prev,
                                                    subcategories: [
                                                      ...prev.subcategories,
                                                      currentCustomVal.trim(),
                                                    ],
                                                  }));
                                                }
                                              }
                                            }}
                                            style={{
                                              width: "13px",
                                              height: "13px",
                                              borderRadius: "3px",
                                              cursor: "pointer",
                                            }}
                                          />
                                          <span style={{ userSelect: "none" }}>
                                            Others
                                          </span>
                                        </label>
                                      </div>
                                      {editShowCustomInput[type] && (
                                        <input
                                          type="text"
                                          placeholder="Specify other subcategory..."
                                          className="form-input"
                                          style={{
                                            fontSize: "0.75rem",
                                            padding: "0.35rem 0.5rem",
                                            marginTop: "0.5rem",
                                            height: "auto",
                                          }}
                                          value={editCustomSubs[type] || ""}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const oldVal = editCustomSubs[type];
                                            setEditCustomSubs((prev) => ({
                                              ...prev,
                                              [type]: val,
                                            }));

                                            setEditForm((prev) => {
                                              let updated =
                                                prev.subcategories.filter(
                                                  (s) => s !== oldVal.trim(),
                                                );
                                              if (val.trim()) {
                                                updated = [
                                                  ...updated,
                                                  val.trim(),
                                                ];
                                              }
                                              return {
                                                ...prev,
                                                subcategories: updated,
                                              };
                                            });
                                          }}
                                        />
                                      )}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label
                          className="form-label"
                          style={{ fontWeight: 600 }}
                        >
                          Project Name *
                        </label>
                        <input
                          type="text"
                          className="form-input"
                          value={editForm.name}
                          required
                          onChange={(e) =>
                            setEditForm({ ...editForm, name: e.target.value })
                          }
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label
                          className="form-label"
                          style={{ fontWeight: 600 }}
                        >
                          Description
                        </label>
                        <textarea
                          className="form-textarea"
                          style={{ minHeight: "120px" }}
                          value={editForm.description}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              description: e.target.value,
                            })
                          }
                        />
                      </div>

                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label
                          className="form-label"
                          style={{ fontWeight: 600 }}
                        >
                          Site URL
                        </label>
                        <input
                          type="url"
                          className="form-input"
                          value={editForm.siteUrl || ''}
                          placeholder="e.g., https://example.com"
                          onChange={(e) =>
                            setEditForm({ ...editForm, siteUrl: e.target.value })
                          }
                        />
                      </div>

                      {/* Client Selection */}
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.01)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "12px",
                          padding: "1rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <label
                            className="form-label"
                            style={{ marginBottom: 0, fontWeight: 600 }}
                          >
                            Select Client profile *
                          </label>
                          <button
                            type="button"
                            onClick={() => setIsAddClientOpen(!isAddClientOpen)}
                            className="btn btn-secondary"
                            style={{
                              padding: "0.25rem 0.6rem",
                              fontSize: "0.75rem",
                              border: "1px solid var(--accent-primary)",
                              color: "var(--accent-primary)",
                            }}
                          >
                            {isAddClientOpen
                              ? "Select Existing"
                              : "+ New Client"}
                          </button>
                        </div>

                        {isAddClientOpen ? (
                          <div
                            className="animate-fade-in"
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem",
                            }}
                          >
                            <div
                              className="form-row"
                              style={{ gap: "0.75rem" }}
                            >
                              <div className="form-group">
                                <label
                                  className="form-label"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  Client Name *
                                </label>
                                <input
                                  type="text"
                                  placeholder="e.g., John Doe"
                                  className="form-input"
                                  value={inlineClient.name}
                                  onChange={(e) =>
                                    setInlineClient({
                                      ...inlineClient,
                                      name: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div className="form-group">
                                <label
                                  className="form-label"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  Client Email *
                                </label>
                                <input
                                  type="email"
                                  placeholder="e.g., john@company.com"
                                  className="form-input"
                                  value={inlineClient.email}
                                  onChange={(e) =>
                                    setInlineClient({
                                      ...inlineClient,
                                      email: e.target.value,
                                    })
                                  }
                                />
                              </div>
                            </div>
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{
                                padding: "0.4rem",
                                fontSize: "0.8rem",
                                width: "100%",
                                marginTop: "0.25rem",
                              }}
                              onClick={handleCreateInlineClient}
                            >
                              Create & Select Client Profile
                            </button>
                          </div>
                        ) : (
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <SearchableSelect
                              options={clients.map((c) => ({
                                value: c._id,
                                label: c.status === "Inactive" ? `${c.name} (Inactive)` : c.name,
                                sublabel: `${c.company ? `${c.company} • ` : ""}${c.email}${c.status === "Inactive" ? " (Inactive)" : ""}`,
                                searchText: `${c.name} ${c.company || ""} ${c.email} ${c.status || ""}`,
                              }))}
                              placeholder="Search and select client..."
                              required={true}
                              value={editForm.client || ""}
                              onChange={(clientId) => {
                                const selectedClientObj = clients.find(
                                  (c) => c._id === clientId,
                                );
                                setEditForm((prev) => ({
                                  ...prev,
                                  client: clientId,
                                  clientName: selectedClientObj
                                    ? selectedClientObj.name
                                    : "",
                                  clientEmail: selectedClientObj
                                    ? selectedClientObj.email
                                    : "",
                                }));
                              }}
                            />
                          </div>
                        )}
                      </div>

                      {/* Quotation upload section */}
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.01)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "12px",
                          padding: "1rem",
                        }}
                      >
                        <label
                          className="form-label"
                          style={{
                            display: "block",
                            fontWeight: 600,
                            marginBottom: "0.5rem",
                          }}
                        >
                          Quotation Document
                        </label>
                        {editForm.quotation ? (
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              background: "rgba(255, 255, 255, 0.02)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "8px",
                              padding: "0.5rem 0.75rem",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--text-primary)",
                                fontWeight: 500,
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              📄 {editForm.quotation.fileName}
                            </span>
                            <button
                              type="button"
                              className="btn btn-danger"
                              style={{
                                padding: "0.3rem 0.5rem",
                                fontSize: "0.7rem",
                                flexShrink: 0,
                              }}
                              onClick={() => {
                                setEditForm((prev) => ({
                                  ...prev,
                                  quotation: null,
                                }));
                                setEditQuotationUrl("");
                                setEditQuotationFile(null);
                              }}
                            >
                              Remove
                            </button>
                          </div>
                        ) : (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.25rem",
                                opacity: 0.45,
                                pointerEvents: "none",
                                userSelect: "none",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                }}
                              >
                                <span
                                  style={{
                                    fontSize: "0.75rem",
                                    color: "var(--text-muted)",
                                    fontWeight: 500,
                                  }}
                                >
                                  Upload File
                                </span>
                                <span
                                  style={{
                                    fontSize: "0.62rem",
                                    background: "rgba(245, 158, 11, 0.12)",
                                    color: "#f59e0b",
                                    border: "1px solid rgba(245, 158, 11, 0.3)",
                                    borderRadius: "9999px",
                                    padding: "0.05rem 0.4rem",
                                    fontWeight: 600,
                                    letterSpacing: "0.03em",
                                  }}
                                >
                                  Coming Soon
                                </span>
                              </div>
                              <div
                                style={{
                                  background: "var(--bg-secondary)",
                                  border: "1px solid var(--border-color)",
                                  borderRadius: "8px",
                                  padding: "0.65rem 0.85rem",
                                  fontSize: "0.8rem",
                                  color: "var(--text-muted)",
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "0.5rem",
                                }}
                              >
                                <span>📁</span>
                                <span>
                                  File upload is currently unavailable. Use the
                                  URL option below.
                                </span>
                              </div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                              }}
                            >
                              <div
                                style={{
                                  height: "1px",
                                  background: "var(--border-color)",
                                  flex: 1,
                                }}
                              ></div>
                              <span
                                style={{
                                  fontSize: "0.7rem",
                                  color: "var(--text-muted)",
                                  fontWeight: 600,
                                }}
                              >
                                OR
                              </span>
                              <div
                                style={{
                                  height: "1px",
                                  background: "var(--border-color)",
                                  flex: 1,
                                }}
                              ></div>
                            </div>

                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.25rem",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.75rem",
                                  color: "var(--text-secondary)",
                                  fontWeight: 500,
                                }}
                              >
                                Enter Document URL
                              </span>
                              <div style={{ display: "flex", gap: "0.75rem" }}>
                                <input
                                  type="text"
                                  className="form-input"
                                  style={{ flex: 1 }}
                                  placeholder="e.g. https://domain.com/quotation.pdf"
                                  value={editQuotationUrl}
                                  onChange={(e) => {
                                    setEditQuotationUrl(e.target.value);
                                    setEditQuotationFile(null); // Clear file if URL typed
                                  }}
                                />
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.35rem",
                                    whiteSpace: "nowrap",
                                    padding: "0 1rem",
                                  }}
                                  onClick={() => setIsUploadModalOpen(true)}
                                >
                                  <ExternalLink size={14} />
                                  <span>Get URL</span>
                                </button>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Assign Team Members (inline in edit form) */}
                      {companyUsers.filter((u) => u.role !== "company_admin")
                        .length > 0 && (
                        <div
                          style={{
                            background: "rgba(255, 255, 255, 0.01)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "12px",
                            padding: "1rem",
                          }}
                        >
                          <label
                            className="form-label"
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.4rem",
                              fontWeight: 600,
                              marginBottom: "0.75rem",
                            }}
                          >
                            <User
                              size={14}
                              style={{ color: "var(--accent-primary)" }}
                            />
                            Assign Team Members
                          </label>

                          {/* Selected chips */}
                          {selectedEmployeeIds.length > 0 && (
                            <div
                              style={{
                                display: "flex",
                                flexWrap: "wrap",
                                gap: "0.4rem",
                                marginBottom: "0.75rem",
                              }}
                            >
                              {selectedEmployeeIds.map((eid) => {
                                const u = companyUsers.find(
                                  (u) => u.id === eid,
                                );
                                if (!u) return null;
                                return (
                                  <div
                                    key={eid}
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.3rem",
                                      background: "rgba(0,174,239,0.12)",
                                      border: "1px solid rgba(0,174,239,0.3)",
                                      color: "var(--accent-primary)",
                                      borderRadius: "20px",
                                      padding: "0.2rem 0.55rem 0.2rem 0.4rem",
                                      fontSize: "0.75rem",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {u.username}
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setSelectedEmployeeIds((prev) =>
                                          prev.filter((id) => id !== eid),
                                        )
                                      }
                                      style={{
                                        background: "none",
                                        border: "none",
                                        cursor: "pointer",
                                        padding: 0,
                                        lineHeight: 1,
                                        color: "inherit",
                                        opacity: 0.7,
                                      }}
                                    >
                                      ×
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.3rem",
                              maxHeight: "180px",
                              overflowY: "auto",
                              border: "1px solid var(--border-color)",
                              borderRadius: "8px",
                              background: "var(--bg-primary)",
                            }}
                          >
                            {companyUsers
                              .filter((u) => u.role !== "company_admin")
                              .map((user) => {
                                const isChecked = selectedEmployeeIds.includes(
                                  user.id,
                                );
                                return (
                                  <label
                                    key={user.id}
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.6rem",
                                      padding: "0.5rem 0.75rem",
                                      cursor: "pointer",
                                      background: isChecked
                                        ? "rgba(0,174,239,0.08)"
                                        : "transparent",
                                      margin: 0,
                                      borderBottom:
                                        "1px solid var(--border-color)",
                                    }}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      onChange={() =>
                                        setSelectedEmployeeIds((prev) =>
                                          prev.includes(user.id)
                                            ? prev.filter(
                                                (id) => id !== user.id,
                                              )
                                            : [...prev, user.id],
                                        )
                                      }
                                      style={{
                                        width: "14px",
                                        height: "14px",
                                        cursor: "pointer",
                                      }}
                                      onClick={(e) => e.stopPropagation()}
                                    />
                                    <span
                                      style={{
                                        fontSize: "0.85rem",
                                        color: isChecked
                                          ? "var(--accent-primary)"
                                          : "var(--text-primary)",
                                        fontWeight: isChecked ? 600 : 400,
                                        flex: 1,
                                      }}
                                    >
                                      {user.username}
                                    </span>
                                    {user.email && (
                                      <span
                                        style={{
                                          fontSize: "0.72rem",
                                          color: "var(--text-muted)",
                                        }}
                                      >
                                        {user.email}
                                      </span>
                                    )}
                                    {isChecked && (
                                      <Check
                                        size={12}
                                        style={{
                                          color: "var(--accent-primary)",
                                          flexShrink: 0,
                                        }}
                                      />
                                    )}
                                  </label>
                                );
                              })}
                          </div>
                          <p
                            style={{
                              fontSize: "0.72rem",
                              color: "var(--text-muted)",
                              marginTop: "0.4rem",
                              marginBottom: 0,
                            }}
                          >
                            Changes are saved when you click "Save" above.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Right Column: Categories, Timelines & Expiries */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.5rem",
                      }}
                    >
                      {/* Category-Specific Dates Section */}
                      {(editForm.projectType.includes("Development") ||
                        editForm.projectType.includes(
                          "360 Deg Digital Marketing",
                        ) ||
                        editForm.projectType.includes("Meta / Google Ads") ||
                        editForm.projectType.includes("Design")) && (
                        <div
                          style={{
                            background: "rgba(255, 255, 255, 0.01)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "12px",
                            padding: "1rem",
                          }}
                        >
                          <label
                            className="form-label"
                            style={{
                              marginBottom: "0.75rem",
                              display: "block",
                              fontWeight: 600,
                              color: "var(--accent-primary)",
                            }}
                          >
                            Category Timelines
                          </label>

                          {editForm.projectType.includes("Development") && (
                            <div
                              style={{
                                marginBottom: "1rem",
                                borderBottom:
                                  editForm.projectType.includes(
                                    "360 Deg Digital Marketing",
                                  ) ||
                                  editForm.projectType.includes(
                                    "Meta / Google Ads",
                                  ) ||
                                  editForm.projectType.includes("Design")
                                    ? "1px dashed var(--border-color)"
                                    : "none",
                                paddingBottom:
                                  editForm.projectType.includes(
                                    "360 Deg Digital Marketing",
                                  ) ||
                                  editForm.projectType.includes(
                                    "Meta / Google Ads",
                                  ) ||
                                  editForm.projectType.includes("Design")
                                    ? "1rem"
                                    : "0",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                  display: "block",
                                  marginBottom: "0.5rem",
                                  color: "var(--text-primary)",
                                }}
                              >
                                Development Timeline
                              </span>
                              <div
                                className="form-row"
                                style={{ gap: "0.75rem" }}
                              >
                                <div
                                  className="form-group"
                                  style={{ marginBottom: 0 }}
                                >
                                  <label
                                    className="form-label"
                                    style={{ fontSize: "0.75rem" }}
                                  >
                                    Start Date
                                  </label>
                                  <input
                                    type="date"
                                    className="form-input"
                                    value={editForm.devStartDate}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        devStartDate: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div
                                  className="form-group"
                                  style={{ marginBottom: 0 }}
                                >
                                  <label
                                    className="form-label"
                                    style={{ fontSize: "0.75rem" }}
                                  >
                                    End Date (Target)
                                  </label>
                                  <input
                                    type="date"
                                    className="form-input"
                                    value={editForm.devEndDate}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        devEndDate: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <div
                                className="form-group"
                                style={{
                                  marginTop: "0.75rem",
                                  marginBottom: 0,
                                }}
                              >
                                <label
                                  className="form-label"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  Development Status
                                </label>
                                <select
                                  className="form-select"
                                  value={editForm.devStatus || "Planning"}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      devStatus: e.target.value,
                                    })
                                  }
                                >
                                  <option value="Planning">Planning</option>
                                  <option value="In Progress">
                                    In Progress
                                  </option>
                                  <option value="Under Review">
                                    Under Review
                                  </option>
                                  <option value="Completed">Completed</option>
                                  <option value="Pending">Pending</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {editForm.projectType.includes(
                            "360 Deg Digital Marketing",
                          ) && (
                            <div
                              style={{
                                marginBottom:
                                  editForm.projectType.includes(
                                    "Meta / Google Ads",
                                  ) || editForm.projectType.includes("Design")
                                    ? "1rem"
                                    : "0",
                                borderBottom:
                                  editForm.projectType.includes(
                                    "Meta / Google Ads",
                                  ) || editForm.projectType.includes("Design")
                                    ? "1px dashed var(--border-color)"
                                    : "none",
                                paddingBottom:
                                  editForm.projectType.includes(
                                    "Meta / Google Ads",
                                  ) || editForm.projectType.includes("Design")
                                    ? "1rem"
                                    : "0",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                  display: "block",
                                  marginBottom: "0.5rem",
                                  color: "var(--text-primary)",
                                }}
                              >
                                360° Digital Marketing Timeline
                              </span>
                              <div
                                className="form-row"
                                style={{ gap: "0.75rem" }}
                              >
                                <div
                                  className="form-group"
                                  style={{ marginBottom: 0 }}
                                >
                                  <label
                                    className="form-label"
                                    style={{ fontSize: "0.75rem" }}
                                  >
                                    Start Date
                                  </label>
                                  <input
                                    type="date"
                                    className="form-input"
                                    value={editForm.marketingStartDate}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        marketingStartDate: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div
                                  className="form-group"
                                  style={{ marginBottom: 0 }}
                                >
                                  <label
                                    className="form-label"
                                    style={{ fontSize: "0.75rem" }}
                                  >
                                    End Date (Target)
                                  </label>
                                  <input
                                    type="date"
                                    className="form-input"
                                    value={editForm.marketingEndDate}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        marketingEndDate: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <div
                                className="form-group"
                                style={{
                                  marginTop: "0.75rem",
                                  marginBottom: 0,
                                }}
                              >
                                <label
                                  className="form-label"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  Marketing Status
                                </label>
                                <select
                                  className="form-select"
                                  value={editForm.marketingStatus || "Planning"}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      marketingStatus: e.target.value,
                                    })
                                  }
                                >
                                  <option value="Planning">Planning</option>
                                  <option value="In Progress">
                                    In Progress
                                  </option>
                                  <option value="Under Review">
                                    Under Review
                                  </option>
                                  <option value="Completed">Completed</option>
                                  <option value="Pending">Pending</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {editForm.projectType.includes(
                            "Meta / Google Ads",
                          ) && (
                            <div
                              style={{
                                marginBottom: editForm.projectType.includes(
                                  "Design",
                                )
                                  ? "1rem"
                                  : "0",
                                borderBottom: editForm.projectType.includes(
                                  "Design",
                                )
                                  ? "1px dashed var(--border-color)"
                                  : "none",
                                paddingBottom: editForm.projectType.includes(
                                  "Design",
                                )
                                  ? "1rem"
                                  : "0",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                  display: "block",
                                  marginBottom: "0.5rem",
                                  color: "var(--text-primary)",
                                }}
                              >
                                Google / Meta Ads Timeline
                              </span>
                              <div
                                className="form-group"
                                style={{ marginBottom: 0 }}
                              >
                                <label
                                  className="form-label"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  Campaign Date
                                </label>
                                <input
                                  type="date"
                                  className="form-input"
                                  value={editForm.adsDate}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      adsDate: e.target.value,
                                    })
                                  }
                                />
                              </div>
                              <div
                                className="form-group"
                                style={{
                                  marginTop: "0.75rem",
                                  marginBottom: 0,
                                }}
                              >
                                <label
                                  className="form-label"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  Ads Status
                                </label>
                                <select
                                  className="form-select"
                                  value={editForm.adsStatus || "Planning"}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      adsStatus: e.target.value,
                                    })
                                  }
                                >
                                  <option value="Planning">Planning</option>
                                  <option value="In Progress">
                                    In Progress
                                  </option>
                                  <option value="Under Review">
                                    Under Review
                                  </option>
                                  <option value="Completed">Completed</option>
                                  <option value="Pending">Pending</option>
                                </select>
                              </div>
                            </div>
                          )}

                          {editForm.projectType.includes("Design") && (
                            <div style={{ marginTop: "0.5rem" }}>
                              <span
                                style={{
                                  fontSize: "0.8rem",
                                  fontWeight: 600,
                                  display: "block",
                                  marginBottom: "0.5rem",
                                  color: "var(--text-primary)",
                                }}
                              >
                                Design Timeline
                              </span>
                              <div
                                className="form-row"
                                style={{ gap: "0.75rem" }}
                              >
                                <div
                                  className="form-group"
                                  style={{ marginBottom: 0 }}
                                >
                                  <label
                                    className="form-label"
                                    style={{ fontSize: "0.75rem" }}
                                  >
                                    Start Date
                                  </label>
                                  <input
                                    type="date"
                                    className="form-input"
                                    value={editForm.designStartDate}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        designStartDate: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                                <div
                                  className="form-group"
                                  style={{ marginBottom: 0 }}
                                >
                                  <label
                                    className="form-label"
                                    style={{ fontSize: "0.75rem" }}
                                  >
                                    End Date (Target)
                                  </label>
                                  <input
                                    type="date"
                                    className="form-input"
                                    value={editForm.designEndDate}
                                    onChange={(e) =>
                                      setEditForm({
                                        ...editForm,
                                        designEndDate: e.target.value,
                                      })
                                    }
                                  />
                                </div>
                              </div>
                              <div
                                className="form-group"
                                style={{
                                  marginTop: "0.75rem",
                                  marginBottom: 0,
                                }}
                              >
                                <label
                                  className="form-label"
                                  style={{ fontSize: "0.75rem" }}
                                >
                                  Design Status
                                </label>
                                <select
                                  className="form-select"
                                  value={editForm.designStatus || "Planning"}
                                  onChange={(e) =>
                                    setEditForm({
                                      ...editForm,
                                      designStatus: e.target.value,
                                    })
                                  }
                                >
                                  <option value="Planning">Planning</option>
                                  <option value="In Progress">
                                    In Progress
                                  </option>
                                  <option value="Under Review">
                                    Under Review
                                  </option>
                                  <option value="Completed">Completed</option>
                                  <option value="Pending">Pending</option>
                                </select>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Status & Expiry Dates */}
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.01)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "12px",
                          padding: "1rem",
                          display: "flex",
                          flexDirection: "column",
                          gap: "1rem",
                        }}
                      >
                        {editForm.projectType.length === 0 && (
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label
                              className="form-label"
                              style={{ fontWeight: 600 }}
                            >
                              Project Status
                            </label>
                            <select
                              className="form-select"
                              value={editForm.status}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  status: e.target.value,
                                })
                              }
                            >
                              <option value="Planning">Planning</option>
                              <option value="In Progress">In Progress</option>
                              <option value="Under Review">Under Review</option>
                              <option value="Completed">Completed</option>
                              <option value="Pending">Pending</option>
                            </select>
                          </div>
                        )}

                        <div className="form-row" style={{ gap: "0.75rem" }}>
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label
                              className="form-label"
                              style={{ fontSize: "0.75rem" }}
                            >
                              Hosting Expiry Date
                            </label>
                            <input
                              type="date"
                              className="form-input"
                              value={editForm.hostingExpiry}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  hostingExpiry: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div
                            className="form-group"
                            style={{ marginBottom: 0 }}
                          >
                            <label
                              className="form-label"
                              style={{ fontSize: "0.75rem" }}
                            >
                              Domain Expiry Date
                            </label>
                            <input
                              type="date"
                              className="form-input"
                              value={editForm.domainExpiry}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  domainExpiry: e.target.value,
                                })
                              }
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Project Credentials (Edit Mode) */}
              {activeTab === "credentials" && (
                <div className="card animate-fade-in">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1.5rem",
                      borderBottom: "1px solid var(--border-color)",
                      paddingBottom: "0.75rem",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        margin: 0,
                      }}
                    >
                      Project Credentials
                    </h3>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                      onClick={handleAddCredential}
                    >
                      <Plus size={14} style={{ marginRight: "4px" }} /> Add
                      Credential
                    </button>
                  </div>

                  {editForm.credentials.length === 0 ? (
                    <p
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                        textAlign: "center",
                        margin: "2rem 0",
                      }}
                    >
                      No credentials added yet.
                    </p>
                  ) : (
                    editForm.credentials.map((cred, index) => (
                      <div
                        key={index}
                        style={{
                          background: "rgba(255, 255, 255, 0.01)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "12px",
                          padding: "1rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: "var(--accent-primary)",
                            }}
                          >
                            CREDENTIAL #{index + 1}
                          </span>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: "0.25rem", borderRadius: "6px" }}
                            onClick={() => handleRemoveCredential(index)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">
                              Credential Type
                            </label>
                            <select
                              className="form-select"
                              value={cred.type || "Other"}
                              onChange={(e) =>
                                handleCredentialChange(
                                  index,
                                  "type",
                                  e.target.value,
                                )
                              }
                            >
                              <option value="Hosting">Hosting</option>
                              <option value="Domain">Domain</option>
                              <option value="Development">Development</option>
                              <option value="SEO">SEO</option>
                              <option value="SMO">SMO</option>
                              <option value="Design">Design</option>
                              <option value="Other">Other</option>
                            </select>
                          </div>
                          <div className="form-group">
                            <label className="form-label">
                              Label (e.g. GoDaddy, Hostinger)
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              value={cred.label || ""}
                              onChange={(e) =>
                                handleCredentialChange(
                                  index,
                                  "label",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                        <div
                          className="form-row"
                          style={{ marginTop: "0.5rem" }}
                        >
                          <div className="form-group">
                            <label className="form-label">Username</label>
                            <input
                              type="text"
                              className="form-input"
                              value={cred.username || ""}
                              onChange={(e) =>
                                handleCredentialChange(
                                  index,
                                  "username",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Password</label>
                            <input
                              type="text"
                              className="form-input"
                              value={cred.password || ""}
                              onChange={(e) =>
                                handleCredentialChange(
                                  index,
                                  "password",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                        <div
                          className="form-row"
                          style={{ marginTop: "0.5rem" }}
                        >
                          <div className="form-group">
                            <label className="form-label">Login URL</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. https://admin.example.com"
                              value={cred.loginUrl || ""}
                              onChange={(e) =>
                                handleCredentialChange(
                                  index,
                                  "loginUrl",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Notes</label>
                            <input
                              type="text"
                              className="form-input"
                              value={cred.notes || ""}
                              onChange={(e) =>
                                handleCredentialChange(
                                  index,
                                  "notes",
                                  e.target.value,
                                )
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 2.5: Project Links (Edit Mode) */}
              {activeTab === "links" && (
                <div className="card animate-fade-in">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1.5rem",
                      borderBottom: "1px solid var(--border-color)",
                      paddingBottom: "0.75rem",
                    }}
                  >
                    <h3
                      style={{
                        fontSize: "1.25rem",
                        fontWeight: 700,
                        margin: 0,
                      }}
                    >
                      Project Links
                    </h3>
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{ padding: "0.35rem 0.75rem", fontSize: "0.8rem" }}
                      onClick={handleAddLink}
                    >
                      <Plus size={14} style={{ marginRight: "4px" }} /> Add Link
                    </button>
                  </div>

                  {!editForm.links || editForm.links.length === 0 ? (
                    <p
                      style={{
                        color: "var(--text-muted)",
                        fontSize: "0.85rem",
                        textAlign: "center",
                        margin: "2rem 0",
                      }}
                    >
                      No links added yet.
                    </p>
                  ) : (
                    editForm.links.map((lnk, index) => (
                      <div
                        key={index}
                        style={{
                          background: "rgba(255, 255, 255, 0.01)",
                          border: "1px solid var(--border-color)",
                          borderRadius: "12px",
                          padding: "1rem",
                          marginBottom: "1rem",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <span
                            style={{
                              fontSize: "0.8rem",
                              fontWeight: 700,
                              color: "var(--accent-primary)",
                            }}
                          >
                            LINK #{index + 1}
                          </span>
                          <button
                            type="button"
                            className="btn btn-danger"
                            style={{ padding: "0.25rem", borderRadius: "6px" }}
                            onClick={() => handleRemoveLink(index)}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                        <div className="form-row">
                          <div className="form-group">
                            <label className="form-label">
                              Name (e.g. Website, Dev Site)
                            </label>
                            <input
                              type="text"
                              className="form-input"
                              value={lnk.name || ""}
                              onChange={(e) =>
                                handleLinkChange(index, "name", e.target.value)
                              }
                              required
                            />
                          </div>
                          <div className="form-group">
                            <label className="form-label">Link (URL)</label>
                            <input
                              type="text"
                              className="form-input"
                              placeholder="e.g. https://www.example.com"
                              value={lnk.url || ""}
                              onChange={(e) =>
                                handleLinkChange(index, "url", e.target.value)
                              }
                              required
                            />
                          </div>
                        </div>
                        <div
                          className="form-row"
                          style={{ marginTop: "0.5rem" }}
                        >
                          <div className="form-group">
                            <label className="form-label">Note</label>
                            <input
                              type="text"
                              className="form-input"
                              value={lnk.notes || ""}
                              onChange={(e) =>
                                handleLinkChange(index, "notes", e.target.value)
                              }
                            />
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}

              {/* Tab 3: Pricing (Edit Mode) */}
              {activeTab === "pricing" && (
                <div
                  className="card animate-fade-in"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                  }}
                >
                  <h3
                    style={{
                      fontSize: "1.25rem",
                      fontWeight: 700,
                      borderBottom: "1px solid var(--border-color)",
                      paddingBottom: "0.75rem",
                      margin: 0,
                    }}
                  >
                    Edit Pricing
                  </h3>

                  <div className="form-row" style={{ gap: "0.75rem" }}>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Quote Price (₹)</label>
                      <input
                        type="number"
                        className="form-input"
                        value={editForm.quotePrice}
                        onChange={(e) =>
                          setEditForm({
                            ...editForm,
                            quotePrice: e.target.value,
                          })
                        }
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        Final Price (₹){" "}
                        <span
                          style={{
                            fontSize: "0.7rem",
                            color: "var(--accent-primary)",
                          }}
                        >
                          (Auto-calculated)
                        </span>
                      </label>
                      <input
                        type="number"
                        className="form-input"
                        style={{
                          background: "var(--bg-secondary)",
                          cursor: "not-allowed",
                          color: "var(--text-muted)",
                        }}
                        disabled
                        value={
                          (parseFloat(editForm.hostingPrice) || 0) +
                          (parseFloat(editForm.domainPrice) || 0) +
                          (parseFloat(editForm.devPrice) || 0) +
                          (parseFloat(editForm.marketingPrice) || 0) +
                          (parseFloat(editForm.adsPrice) || 0) +
                          (parseFloat(editForm.designPrice) || 0)
                        }
                      />
                    </div>
                  </div>

                  <div
                    style={{
                      borderTop: "1px dashed var(--border-color)",
                      paddingTop: "1rem",
                    }}
                  >
                    <h4
                      style={{
                        fontSize: "0.9rem",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        marginBottom: "1rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        margin: "0 0 1rem 0",
                      }}
                    >
                      Final Price Breakdown
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(2, 1fr)",
                        gap: "1rem",
                      }}
                    >
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Hosting Cost (₹)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={editForm.hostingPrice}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              hostingPrice: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Domain Cost (₹)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={editForm.domainPrice}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              domainPrice: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">
                          Development Cost (₹)
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          value={editForm.devPrice}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              devPrice: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">
                          360 Deg Marketing Cost (₹)
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          value={editForm.marketingPrice}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              marketingPrice: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">
                          Meta/Google Ads Cost (₹)
                        </label>
                        <input
                          type="number"
                          className="form-input"
                          value={editForm.adsPrice}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              adsPrice: e.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="form-group" style={{ marginBottom: 0 }}>
                        <label className="form-label">Design Cost (₹)</label>
                        <input
                          type="number"
                          className="form-input"
                          value={editForm.designPrice}
                          onChange={(e) =>
                            setEditForm({
                              ...editForm,
                              designPrice: e.target.value,
                            })
                          }
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "0.5rem",
                  padding: "1rem 1.5rem",
                  marginTop: "1.5rem",
                  borderTop: "1px solid var(--border-color)",
                  position: "sticky",
                  bottom: 0,
                  background: "var(--bg-secondary)",
                  zIndex: 100,
                  boxShadow: "0 -4px 12px rgba(0, 0, 0, 0.05)",
                  borderRadius: "0 0 12px 12px",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={handleCancelEdit}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updating}
                >
                  {updating ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          ) : (
            <>
              {/* Tab 1: Project Details (View Mode) */}
              {activeTab === "details" && (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1.2fr 1fr",
                    gap: "2rem",
                    alignItems: "start",
                  }}
                  className="responsive-grid"
                >
                  {/* Left Column: Project Type, Subcategory, Name, Description, Client Profile & Quotation */}
                  <div className="card">
                    <h3
                      style={{
                        fontSize: "1.1rem",
                        marginBottom: "1.25rem",
                        borderBottom: "1px solid var(--border-color)",
                        paddingBottom: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      Project Information
                    </h3>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.25rem",
                      }}
                    >
                      {project.projectType &&
                        project.projectType.length > 0 && (
                          <div>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                                display: "block",
                                textTransform: "uppercase",
                                marginBottom: "0.35rem",
                                fontWeight: 600,
                              }}
                            >
                              Project Category & Subcategory
                            </span>
                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.35rem",
                              }}
                            >
                              <div
                                style={{
                                  display: "flex",
                                  flexWrap: "wrap",
                                  gap: "0.4rem",
                                }}
                              >
                                {(Array.isArray(project.projectType)
                                  ? project.projectType
                                  : [project.projectType]
                                ).map((type) => (
                                  <strong
                                    key={type}
                                    className="badge"
                                    style={{
                                      background: "rgba(139, 92, 246, 0.08)",
                                      color: "var(--accent-secondary)",
                                      fontSize: "0.75rem",
                                      padding: "0.2rem 0.5rem",
                                      borderRadius: "4px",
                                      border: "1px solid var(--border-color)",
                                      fontWeight: 600,
                                    }}
                                  >
                                    {type}
                                  </strong>
                                ))}
                              </div>
                              {project.subcategories &&
                                project.subcategories.length > 0 && (
                                  <div
                                    style={{
                                      display: "flex",
                                      flexWrap: "wrap",
                                      gap: "0.4rem",
                                      marginTop: "0.15rem",
                                    }}
                                  >
                                    {project.subcategories.map((sub) => (
                                      <span
                                        key={sub}
                                        className="badge"
                                        style={{
                                          background: "rgba(0, 174, 239, 0.08)",
                                          color: "var(--accent-primary)",
                                          fontSize: "0.75rem",
                                          padding: "0.25rem 0.6rem",
                                          borderRadius: "6px",
                                          fontWeight: 600,
                                          textTransform: "none",
                                          border:
                                            "1px solid rgba(0, 174, 239, 0.15)",
                                          letterSpacing: "normal",
                                        }}
                                      >
                                        {sub}
                                      </span>
                                    ))}
                                  </div>
                                )}
                            </div>
                          </div>
                        )}

                      <div>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            display: "block",
                            textTransform: "uppercase",
                            marginBottom: "0.35rem",
                            fontWeight: 600,
                          }}
                        >
                          Project Name
                        </span>
                        <strong
                          style={{
                            fontSize: "1.05rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {project.name}
                        </strong>
                      </div>

                      {project.description && (
                        <div>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              display: "block",
                              textTransform: "uppercase",
                              marginBottom: "0.35rem",
                              fontWeight: 600,
                            }}
                          >
                            Description
                          </span>
                          <p
                            style={{
                              color: "var(--text-secondary)",
                              fontSize: "0.9rem",
                              margin: 0,
                              whiteSpace: "pre-wrap",
                              lineHeight: "1.5",
                            }}
                          >
                            {project.description}
                          </p>
                        </div>
                      )}

                      {project.siteUrl && (
                        <div>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              display: "block",
                              textTransform: "uppercase",
                              marginBottom: "0.35rem",
                              fontWeight: 600,
                            }}
                          >
                            Site URL
                          </span>
                          <a
                            href={project.siteUrl.startsWith('http') ? project.siteUrl : `https://${project.siteUrl}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              color: "var(--accent-primary)",
                              fontSize: "0.9rem",
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "4px",
                              fontWeight: 500
                            }}
                            className="hover-underline"
                          >
                            <ExternalLink size={14} style={{ color: 'var(--accent-primary)' }} /> {project.siteUrl}
                          </a>
                        </div>
                      )}

                      <div>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            display: "block",
                            textTransform: "uppercase",
                            marginBottom: "0.35rem",
                            fontWeight: 600,
                          }}
                        >
                          Client Details
                        </span>
                        <div
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.5rem",
                          }}
                        >
                          <User
                            size={16}
                            style={{ color: "var(--text-secondary)" }}
                          />
                          <strong style={{ fontSize: "0.95rem" }}>
                            {project.clientName}
                          </strong>
                        </div>
                        {project.clientEmail && (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              marginTop: "0.35rem",
                              color: "var(--text-secondary)",
                              fontSize: "0.9rem",
                            }}
                          >
                            <Mail size={14} />
                            <span>{project.clientEmail}</span>
                          </div>
                        )}
                      </div>

                      <div>
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            display: "block",
                            textTransform: "uppercase",
                            marginBottom: "0.35rem",
                            fontWeight: 600,
                          }}
                        >
                          Quotation Document
                        </span>
                        {project.quotation && project.quotation.filePath ? (
                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "0.5rem",
                              background: "rgba(139, 92, 246, 0.04)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "10px",
                              padding: "0.5rem 0.75rem",
                              width: "fit-content",
                            }}
                          >
                            <span>📄</span>
                            <a
                              href={project.quotation.filePath}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{
                                fontSize: "0.85rem",
                                color: "var(--accent-primary)",
                                fontWeight: 600,
                                textDecoration: "none",
                              }}
                            >
                              {project.quotation.fileName}
                            </a>
                          </div>
                        ) : (
                          <span
                            style={{
                              fontSize: "0.9rem",
                              color: "var(--text-muted)",
                            }}
                          >
                            No quotation uploaded.
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Category Timelines, Project Status, Hosting & Domain Expiry */}
                  <div className="card">
                    <h3
                      style={{
                        fontSize: "1.1rem",
                        marginBottom: "1.25rem",
                        borderBottom: "1px solid var(--border-color)",
                        paddingBottom: "0.75rem",
                        fontWeight: 600,
                      }}
                    >
                      Timelines & Resources
                    </h3>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1.25rem",
                      }}
                    >
                      {/* Show generic Project Timeline only if no category dates are set */}
                      {!(
                        (project.projectType?.includes("Development") &&
                          (project.devStartDate || project.devEndDate)) ||
                        (project.projectType?.includes(
                          "360 Deg Digital Marketing",
                        ) &&
                          (project.marketingStartDate ||
                            project.marketingEndDate)) ||
                        (project.projectType?.includes("Meta / Google Ads") &&
                          project.adsDate) ||
                        (project.projectType?.includes("Design") &&
                          (project.designStartDate || project.designEndDate))
                      ) &&
                        (project.startDate || project.endDate) && (
                          <div>
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                                display: "block",
                                textTransform: "uppercase",
                                marginBottom: "0.35rem",
                                fontWeight: 600,
                              }}
                            >
                              Project Timeline
                            </span>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.5rem",
                                fontSize: "0.9rem",
                              }}
                            >
                              <Calendar
                                size={16}
                                style={{ color: "var(--text-secondary)" }}
                              />
                              <span>
                                {project.startDate
                                  ? new Date(
                                      project.startDate,
                                    ).toLocaleDateString("en-IN")
                                  : "N/A"}{" "}
                                -{" "}
                                {project.endDate
                                  ? new Date(
                                      project.endDate,
                                    ).toLocaleDateString("en-IN")
                                  : "N/A"}
                              </span>
                            </div>
                          </div>
                        )}

                      {/* Category Specific Timelines */}
                      {project.projectType &&
                        (project.projectType.includes("Development") ||
                          project.projectType.includes(
                            "360 Deg Digital Marketing",
                          ) ||
                          project.projectType.includes("Meta / Google Ads") ||
                          project.projectType.includes("Design")) && (
                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.75rem",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                                display: "block",
                                textTransform: "uppercase",
                                fontWeight: 600,
                              }}
                            >
                              Category Timelines
                            </span>

                            {project.projectType.includes("Development") &&
                              (project.devStartDate || project.devEndDate) && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    fontSize: "0.85rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "var(--accent-primary)",
                                      minWidth: "95px",
                                    }}
                                  >
                                    Development:
                                  </span>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                    }}
                                  >
                                    <Calendar
                                      size={13}
                                      style={{ color: "var(--text-secondary)" }}
                                    />
                                    {project.devStartDate
                                      ? new Date(
                                          project.devStartDate,
                                        ).toLocaleDateString("en-IN")
                                      : "N/A"}{" "}
                                    -{" "}
                                    {project.devEndDate
                                      ? new Date(
                                          project.devEndDate,
                                        ).toLocaleDateString("en-IN")
                                      : "N/A"}
                                  </span>
                                  <span
                                    className={`badge badge-${(project.devStatus || "Planning").toLowerCase().replace(" ", "")}`}
                                    style={{
                                      padding: "0.15rem 0.5rem",
                                      fontSize: "0.65rem",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    {project.devStatus || "Planning"}
                                  </span>
                                </div>
                              )}

                            {project.projectType.includes(
                              "360 Deg Digital Marketing",
                            ) &&
                              (project.marketingStartDate ||
                                project.marketingEndDate) && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    fontSize: "0.85rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "var(--accent-secondary)",
                                      minWidth: "95px",
                                    }}
                                  >
                                    Marketing:
                                  </span>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                    }}
                                  >
                                    <Calendar
                                      size={13}
                                      style={{ color: "var(--text-secondary)" }}
                                    />
                                    {project.marketingStartDate
                                      ? new Date(
                                          project.marketingStartDate,
                                        ).toLocaleDateString("en-IN")
                                      : "N/A"}{" "}
                                    -{" "}
                                    {project.marketingEndDate
                                      ? new Date(
                                          project.marketingEndDate,
                                        ).toLocaleDateString("en-IN")
                                      : "N/A"}
                                  </span>
                                  <span
                                    className={`badge badge-${(project.marketingStatus || "Planning").toLowerCase().replace(" ", "")}`}
                                    style={{
                                      padding: "0.15rem 0.5rem",
                                      fontSize: "0.65rem",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    {project.marketingStatus || "Planning"}
                                  </span>
                                </div>
                              )}

                            {project.projectType.includes(
                              "Meta / Google Ads",
                            ) &&
                              project.adsDate && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    fontSize: "0.85rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "#a855f7",
                                      minWidth: "95px",
                                    }}
                                  >
                                    Ads Date:
                                  </span>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                    }}
                                  >
                                    <Calendar
                                      size={13}
                                      style={{ color: "var(--text-secondary)" }}
                                    />
                                    {new Date(
                                      project.adsDate,
                                    ).toLocaleDateString("en-IN")}
                                  </span>
                                  <span
                                    className={`badge badge-${(project.adsStatus || "Planning").toLowerCase().replace(" ", "")}`}
                                    style={{
                                      padding: "0.15rem 0.5rem",
                                      fontSize: "0.65rem",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    {project.adsStatus || "Planning"}
                                  </span>
                                </div>
                              )}

                            {project.projectType.includes("Design") &&
                              (project.designStartDate ||
                                project.designEndDate) && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                    fontSize: "0.85rem",
                                    flexWrap: "wrap",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: 600,
                                      color: "#f43f5e",
                                      minWidth: "95px",
                                    }}
                                  >
                                    Design:
                                  </span>
                                  <span
                                    style={{
                                      display: "inline-flex",
                                      alignItems: "center",
                                      gap: "0.25rem",
                                    }}
                                  >
                                    <Calendar
                                      size={13}
                                      style={{ color: "var(--text-secondary)" }}
                                    />
                                    {project.designStartDate
                                      ? new Date(
                                          project.designStartDate,
                                        ).toLocaleDateString("en-IN")
                                      : "N/A"}{" "}
                                    -{" "}
                                    {project.designEndDate
                                      ? new Date(
                                          project.designEndDate,
                                        ).toLocaleDateString("en-IN")
                                      : "N/A"}
                                  </span>
                                  <span
                                    className={`badge badge-${(project.designStatus || "Planning").toLowerCase().replace(" ", "")}`}
                                    style={{
                                      padding: "0.15rem 0.5rem",
                                      fontSize: "0.65rem",
                                      borderRadius: "4px",
                                    }}
                                  >
                                    {project.designStatus || "Planning"}
                                  </span>
                                </div>
                              )}
                          </div>
                        )}

                      <div
                        style={{
                          borderTop: "1px dashed var(--border-color)",
                          paddingTop: "1rem",
                          marginTop: "0.5rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.75rem",
                            color: "var(--text-muted)",
                            display: "block",
                            textTransform: "uppercase",
                            marginBottom: "0.35rem",
                            fontWeight: 600,
                          }}
                        >
                          Overall Status
                        </span>
                        <span
                          className={`badge badge-${project.status.toLowerCase().replace(" ", "")}`}
                          style={{
                            padding: "0.35rem 0.85rem",
                            borderRadius: "6px",
                            fontSize: "0.72rem",
                            fontWeight: 700,
                            letterSpacing: "0.03em",
                            lineHeight: "1",
                          }}
                        >
                          {project.status}
                        </span>
                      </div>

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "1fr 1fr",
                          gap: "1rem",
                          borderTop: "1px dashed var(--border-color)",
                          paddingTop: "1rem",
                        }}
                        className="responsive-grid"
                      >
                        <div>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              display: "block",
                              textTransform: "uppercase",
                              marginBottom: "0.35rem",
                              fontWeight: 600,
                            }}
                          >
                            Hosting Expiry
                          </span>
                          {project.hostingExpiry ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{ fontWeight: 600, fontSize: "0.9rem" }}
                              >
                                {new Date(
                                  project.hostingExpiry,
                                ).toLocaleDateString("en-IN")}
                              </span>
                              {(() => {
                                const status = getExpiryStatus(
                                  project.hostingExpiry,
                                );
                                if (status === "expired")
                                  return (
                                    <span
                                      className="badge"
                                      style={{
                                        background: "rgba(239, 68, 68, 0.15)",
                                        color: "#ef4444",
                                        fontSize: "0.65rem",
                                        padding: "0.1rem 0.35rem",
                                      }}
                                    >
                                      Expired
                                    </span>
                                  );
                                if (status === "warning")
                                  return (
                                    <span
                                      className="badge"
                                      style={{
                                        background: "rgba(245, 158, 11, 0.15)",
                                        color: "#f59e0b",
                                        fontSize: "0.65rem",
                                        padding: "0.1rem 0.35rem",
                                      }}
                                    >
                                      Soon
                                    </span>
                                  );
                                return (
                                  <span
                                    className="badge"
                                    style={{
                                      background: "rgba(16, 185, 129, 0.15)",
                                      color: "#10b981",
                                      fontSize: "0.65rem",
                                      padding: "0.1rem 0.35rem",
                                    }}
                                  >
                                    Active
                                  </span>
                                );
                              })()}
                            </div>
                          ) : (
                            <span
                              style={{
                                fontSize: "0.9rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              Not configured
                            </span>
                          )}
                          <div style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <input 
                              type="checkbox" 
                              id="hosting-discontinued-checkbox" 
                              checked={project.hostingDiscontinued || false} 
                              onChange={async (e) => {
                                 const checked = e.target.checked;
                                 const logMessage = checked 
                                   ? "Hosting service marked as Discontinued / Expired" 
                                   : "Hosting service marked as Active";
                                 
                                 const updatedStatusUpdates = [
                                   ...(project.statusUpdates || []),
                                   { message: logMessage, date: new Date() }
                                 ];

                                 try {
                                   const res = await fetch(`/api/projects/${id}`, {
                                     method: 'PUT',
                                     headers: { 'Content-Type': 'application/json' },
                                     body: JSON.stringify({ 
                                       hostingDiscontinued: checked,
                                       statusUpdates: updatedStatusUpdates
                                     })
                                   });
                                  if (res.ok) {
                                    const updated = await res.json();
                                    setProject(updated);
                                    showToast("Hosting status updated.", "success");
                                  } else {
                                    showToast("Failed to update hosting status.", "error");
                                  }
                                } catch (err) {
                                  showToast("Error updating hosting status.", "error");
                                }
                              }}
                              disabled={permissions?.project_details !== 'write'}
                              style={{ cursor: 'pointer' }}
                            />
                            <label htmlFor="hosting-discontinued-checkbox" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                              Expired / Discontinued
                            </label>
                          </div>
                        </div>

                        <div>
                          <span
                            style={{
                              fontSize: "0.75rem",
                              color: "var(--text-muted)",
                              display: "block",
                              textTransform: "uppercase",
                              marginBottom: "0.35rem",
                              fontWeight: 600,
                            }}
                          >
                            Domain Expiry
                          </span>
                          {project.domainExpiry ? (
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "0.35rem",
                                flexWrap: "wrap",
                              }}
                            >
                              <span
                                style={{ fontWeight: 600, fontSize: "0.9rem" }}
                              >
                                {new Date(
                                  project.domainExpiry,
                                ).toLocaleDateString("en-IN")}
                              </span>
                              {(() => {
                                const status = getExpiryStatus(
                                  project.domainExpiry,
                                );
                                if (status === "expired")
                                  return (
                                    <span
                                      className="badge"
                                      style={{
                                        background: "rgba(239, 68, 68, 0.15)",
                                        color: "#ef4444",
                                        fontSize: "0.65rem",
                                        padding: "0.1rem 0.35rem",
                                      }}
                                    >
                                      Expired
                                    </span>
                                  );
                                if (status === "warning")
                                  return (
                                    <span
                                      className="badge"
                                      style={{
                                        background: "rgba(245, 158, 11, 0.15)",
                                        color: "#f59e0b",
                                        fontSize: "0.65rem",
                                        padding: "0.1rem 0.35rem",
                                      }}
                                    >
                                      Soon
                                    </span>
                                  );
                                return (
                                  <span
                                    className="badge"
                                    style={{
                                      background: "rgba(16, 185, 129, 0.15)",
                                      color: "#10b981",
                                      fontSize: "0.65rem",
                                      padding: "0.1rem 0.35rem",
                                    }}
                                  >
                                    Active
                                  </span>
                                );
                              })()}
                            </div>
                          ) : (
                            <span
                              style={{
                                fontSize: "0.9rem",
                                color: "var(--text-muted)",
                              }}
                            >
                              Not configured
                            </span>
                          )}
                          <div style={{ marginTop: '0.45rem', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                            <input 
                              type="checkbox" 
                              id="domain-discontinued-checkbox" 
                              checked={project.domainDiscontinued || false} 
                              onChange={async (e) => {
                                const checked = e.target.checked;
                                const logMessage = checked 
                                  ? "Domain service marked as Discontinued / Expired" 
                                  : "Domain service marked as Active";
                                
                                const updatedStatusUpdates = [
                                  ...(project.statusUpdates || []),
                                  { message: logMessage, date: new Date() }
                                ];

                                try {
                                  const res = await fetch(`/api/projects/${id}`, {
                                    method: 'PUT',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify({ 
                                      domainDiscontinued: checked,
                                      statusUpdates: updatedStatusUpdates
                                    })
                                  });
                                  if (res.ok) {
                                    const updated = await res.json();
                                    setProject(updated);
                                    showToast("Domain status updated.", "success");
                                  } else {
                                    showToast("Failed to update domain status.", "error");
                                  }
                                } catch (err) {
                                  showToast("Error updating domain status.", "error");
                                }
                              }}
                              disabled={permissions?.project_details !== 'write'}
                              style={{ cursor: 'pointer' }}
                            />
                            <label htmlFor="domain-discontinued-checkbox" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
                              Expired / Discontinued
                            </label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 2: Project Credentials (View Mode) */}
              {activeTab === "credentials" && (
                <div className="card animate-fade-in">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1.25rem",
                      borderBottom: "1px solid var(--border-color)",
                      paddingBottom: "0.75rem",
                    }}
                  >
                    <h3
                      style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}
                    >
                      Project Credentials
                    </h3>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {project.credentials &&
                        project.credentials.length > 0 && (
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{
                              padding: "0.35rem 0.75rem",
                              fontSize: "0.75rem",
                              display: "flex",
                              alignItems: "center",
                              gap: "0.25rem",
                            }}
                            onClick={handleOpenShareModal}
                          >
                            <Share2 size={14} />
                            <span>Share</span>
                          </button>
                        )}
                      {permissions?.project_credential === "write" && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                          onClick={handleOpenAddCredModal}
                        >
                          <Plus size={14} />
                          <span>Add Credential</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {!project.credentials || project.credentials.length === 0 ? (
                    <div
                      style={{
                        padding: "2rem 1rem",
                        textAlign: "center",
                        background: "rgba(255, 255, 255, 0.01)",
                        border: "1px dashed var(--border-color)",
                        borderRadius: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-muted)",
                          display: "block",
                          marginBottom: "1rem",
                        }}
                      >
                        No credentials stored yet.
                      </span>
                      {permissions?.project_credential === "write" && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            padding: "0.45rem 1rem",
                            fontSize: "0.8rem",
                          }}
                          onClick={handleOpenAddCredModal}
                        >
                          + Add First Credential
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "1fr 1fr",
                        gap: "1rem",
                      }}
                      className="responsive-grid"
                    >
                      {project.credentials.map((cred, index) => {
                        const passwordKey = `cred_${index}`;
                        const isVisible = visiblePasswords[passwordKey];
                        return (
                          <div
                            key={index}
                            style={{
                              background: "rgba(255, 255, 255, 0.01)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "12px",
                              padding: "1rem",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.5rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.9rem",
                                  fontWeight: "bold",
                                  color: "var(--text-primary)",
                                }}
                              >
                                {cred.type} - {cred.label || "Details"}
                              </span>
                              {permissions?.project_credential === "write" && (
                                <div
                                  style={{ display: "flex", gap: "0.35rem" }}
                                >
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{
                                      padding: "0.2rem 0.4rem",
                                      borderRadius: "4px",
                                      fontSize: "0.7rem",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                    onClick={() =>
                                      handleOpenEditCredModal(index, cred)
                                    }
                                    title="Edit Credential"
                                  >
                                    <Edit size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{
                                      padding: "0.2rem 0.4rem",
                                      borderRadius: "4px",
                                      fontSize: "0.7rem",
                                      color: "#f43f5e",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                    onClick={() =>
                                      handleDeleteCredentialDirect(index)
                                    }
                                    title="Delete Credential"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div
                              className="project-cred-grid"
                              style={{ fontSize: "0.85rem" }}
                            >
                              <div>
                                <span
                                  style={{
                                    color: "var(--text-muted)",
                                    display: "block",
                                    fontSize: "0.75rem",
                                    marginBottom: "2px",
                                  }}
                                >
                                  Username
                                </span>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontWeight: 500,
                                      wordBreak: "break-all",
                                    }}
                                  >
                                    {cred.username || "N/A"}
                                  </span>
                                  {cred.username && (
                                    <button
                                      className="btn btn-secondary"
                                      style={{
                                        padding: "0.15rem 0.35rem",
                                        borderRadius: "4px",
                                        fontSize: "0.7rem",
                                      }}
                                      onClick={() =>
                                        handleCopy(
                                          cred.username,
                                          `user_${index}`,
                                        )
                                      }
                                    >
                                      {copiedKey === `user_${index}` ? (
                                        <Check
                                          size={10}
                                          style={{ color: "#10b981" }}
                                        />
                                      ) : (
                                        <Copy size={10} />
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>

                              <div>
                                <span
                                  style={{
                                    color: "var(--text-muted)",
                                    display: "block",
                                    fontSize: "0.75rem",
                                    marginBottom: "2px",
                                  }}
                                >
                                  Password
                                </span>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      fontFamily: isVisible
                                        ? "monospace"
                                        : "inherit",
                                      fontWeight: 500,
                                      wordBreak: "break-all",
                                    }}
                                  >
                                    {isVisible
                                      ? cred.password || "N/A"
                                      : "••••••••"}
                                  </span>
                                  {cred.password && (
                                    <div
                                      style={{
                                        display: "flex",
                                        gap: "0.25rem",
                                      }}
                                    >
                                      <button
                                        className="btn btn-secondary"
                                        style={{
                                          padding: "0.15rem 0.35rem",
                                          borderRadius: "4px",
                                          fontSize: "0.7rem",
                                        }}
                                        onClick={() =>
                                          togglePasswordVisibility(passwordKey)
                                        }
                                      >
                                        {isVisible ? (
                                          <EyeOff size={10} />
                                        ) : (
                                          <Eye size={10} />
                                        )}
                                      </button>
                                      <button
                                        className="btn btn-secondary"
                                        style={{
                                          padding: "0.15rem 0.35rem",
                                          borderRadius: "4px",
                                          fontSize: "0.7rem",
                                        }}
                                        onClick={() =>
                                          handleCopy(cred.password, passwordKey)
                                        }
                                      >
                                        {copiedKey === passwordKey ? (
                                          <Check
                                            size={10}
                                            style={{ color: "#10b981" }}
                                          />
                                        ) : (
                                          <Copy size={10} />
                                        )}
                                      </button>
                                    </div>
                                  )}
                                </div>
                              </div>

                              {cred.loginUrl && (
                                <div
                                  style={{
                                    gridColumn: "span 2",
                                    borderTop: "1px dashed var(--border-color)",
                                    paddingTop: "0.5rem",
                                    marginTop: "0.25rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: "var(--text-muted)",
                                      display: "block",
                                      fontSize: "0.75rem",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    Login URL
                                  </span>
                                  <div
                                    style={{
                                      display: "flex",
                                      alignItems: "center",
                                      gap: "0.5rem",
                                    }}
                                  >
                                    <a
                                      href={
                                        cred.loginUrl.startsWith("http")
                                          ? cred.loginUrl
                                          : `https://${cred.loginUrl}`
                                      }
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      style={{
                                        color: "var(--accent-primary)",
                                        textDecoration: "underline",
                                        fontWeight: 500,
                                        wordBreak: "break-all",
                                      }}
                                    >
                                      {cred.loginUrl}
                                    </a>
                                    <button
                                      className="btn btn-secondary"
                                      style={{
                                        padding: "0.15rem 0.35rem",
                                        borderRadius: "4px",
                                        fontSize: "0.7rem",
                                      }}
                                      onClick={() =>
                                        handleCopy(
                                          cred.loginUrl,
                                          `url_${index}`,
                                        )
                                      }
                                    >
                                      {copiedKey === `url_${index}` ? (
                                        <Check
                                          size={10}
                                          style={{ color: "#10b981" }}
                                        />
                                      ) : (
                                        <Copy size={10} />
                                      )}
                                    </button>
                                  </div>
                                </div>
                              )}

                              {cred.notes && (
                                <div
                                  style={{
                                    gridColumn: "span 2",
                                    borderTop: "1px dashed var(--border-color)",
                                    paddingTop: "0.5rem",
                                    marginTop: "0.25rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: "var(--text-muted)",
                                      display: "block",
                                      fontSize: "0.75rem",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    Notes
                                  </span>
                                  <span
                                    style={{
                                      color: "var(--text-secondary)",
                                      display: "block",
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-all",
                                    }}
                                  >
                                    {cred.notes}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2.5: Project Links (View Mode) */}
              {activeTab === "links" && (
                <div className="card animate-fade-in">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1.25rem",
                      borderBottom: "1px solid var(--border-color)",
                      paddingBottom: "0.75rem",
                    }}
                  >
                    <h3
                      style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}
                    >
                      Project Links
                    </h3>
                    <div style={{ display: "flex", gap: "0.5rem" }}>
                      {project.links && project.links.length > 0 && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                          onClick={handleOpenLinkShareModal}
                        >
                          <Share2 size={14} />
                          <span>Share</span>
                        </button>
                      )}
                      {permissions?.project_links === "write" && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.75rem",
                            display: "flex",
                            alignItems: "center",
                            gap: "0.25rem",
                          }}
                          onClick={handleOpenAddLinkModal}
                        >
                          <Plus size={14} />
                          <span>Add Link</span>
                        </button>
                      )}
                    </div>
                  </div>
                  {!project.links || project.links.length === 0 ? (
                    <div
                      style={{
                        padding: "2rem 1rem",
                        textAlign: "center",
                        background: "rgba(255, 255, 255, 0.01)",
                        border: "1px dashed var(--border-color)",
                        borderRadius: "12px",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--text-muted)",
                          display: "block",
                          marginBottom: "1rem",
                        }}
                      >
                        No links stored yet.
                      </span>
                      {permissions?.project_links === "write" && (
                        <button
                          type="button"
                          className="btn btn-secondary"
                          style={{
                            padding: "0.45rem 1rem",
                            fontSize: "0.8rem",
                          }}
                          onClick={handleOpenAddLinkModal}
                        >
                          + Add First Link
                        </button>
                      )}
                    </div>
                  ) : (
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(3, 1fr)",
                        gap: "1rem",
                      }}
                      className="responsive-grid"
                    >
                      {project.links.map((lnk, index) => {
                        return (
                          <div
                            key={index}
                            style={{
                              background: "rgba(255, 255, 255, 0.01)",
                              border: "1px solid var(--border-color)",
                              borderRadius: "12px",
                              padding: "1rem",
                              display: "flex",
                              flexDirection: "column",
                              gap: "0.5rem",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                justifyContent: "space-between",
                                alignItems: "center",
                              }}
                            >
                              <span
                                style={{
                                  fontSize: "0.9rem",
                                  fontWeight: "bold",
                                  color: "var(--text-primary)",
                                }}
                              >
                                {lnk.name}
                              </span>
                              {permissions?.project_links === "write" && (
                                <div
                                  style={{ display: "flex", gap: "0.35rem" }}
                                >
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{
                                      padding: "0.2rem 0.4rem",
                                      borderRadius: "4px",
                                      fontSize: "0.7rem",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                    onClick={() =>
                                      handleOpenEditLinkModal(index, lnk)
                                    }
                                    title="Edit Link"
                                  >
                                    <Edit size={11} />
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-secondary"
                                    style={{
                                      padding: "0.2rem 0.4rem",
                                      borderRadius: "4px",
                                      fontSize: "0.7rem",
                                      color: "#f43f5e",
                                      display: "inline-flex",
                                      alignItems: "center",
                                      justifyContent: "center",
                                    }}
                                    onClick={() =>
                                      handleDeleteLinkDirect(index)
                                    }
                                    title="Delete Link"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              )}
                            </div>

                            <div
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "0.5rem",
                                fontSize: "0.85rem",
                              }}
                            >
                              <div>
                                <span
                                  style={{
                                    color: "var(--text-muted)",
                                    display: "block",
                                    fontSize: "0.75rem",
                                    marginBottom: "2px",
                                  }}
                                >
                                  Link (URL)
                                </span>
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "0.5rem",
                                  }}
                                >
                                  <a
                                    href={
                                      lnk.url.startsWith("http")
                                        ? lnk.url
                                        : `https://${lnk.url}`
                                    }
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{
                                      color: "var(--accent-primary)",
                                      textDecoration: "underline",
                                      fontWeight: 500,
                                      wordBreak: "break-all",
                                    }}
                                  >
                                    {lnk.url}
                                  </a>
                                  <button
                                    className="btn btn-secondary"
                                    style={{
                                      padding: "0.15rem 0.35rem",
                                      borderRadius: "4px",
                                      fontSize: "0.7rem",
                                    }}
                                    onClick={() =>
                                      handleCopy(lnk.url, `lnk_url_${index}`)
                                    }
                                  >
                                    {copiedKey === `lnk_url_${index}` ? (
                                      <Check
                                        size={10}
                                        style={{ color: "#10b981" }}
                                      />
                                    ) : (
                                      <Copy size={10} />
                                    )}
                                  </button>
                                </div>
                              </div>

                              {lnk.notes && (
                                <div
                                  style={{
                                    borderTop: "1px dashed var(--border-color)",
                                    paddingTop: "0.5rem",
                                    marginTop: "0.25rem",
                                  }}
                                >
                                  <span
                                    style={{
                                      color: "var(--text-muted)",
                                      display: "block",
                                      fontSize: "0.75rem",
                                      marginBottom: "2px",
                                    }}
                                  >
                                    Note
                                  </span>
                                  <span
                                    style={{
                                      color: "var(--text-secondary)",
                                      display: "block",
                                      whiteSpace: "pre-wrap",
                                      wordBreak: "break-all",
                                    }}
                                  >
                                    {lnk.notes}
                                  </span>
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Tab 3: Pricing (View Mode) */}
              {activeTab === "pricing" && (
                <div
                  className="animate-fade-in"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                  }}
                >
                  {/* Summary Pricing Cards */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1.2fr 1fr",
                      gap: "1rem",
                    }}
                    className="responsive-grid"
                  >
                    <div
                      className="card"
                      style={{
                        padding: "1.25rem",
                        borderLeft: "4px solid var(--accent-secondary)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          display: "block",
                          textTransform: "uppercase",
                          marginBottom: "0.35rem",
                          fontWeight: 600,
                        }}
                      >
                        Quote Price
                      </span>
                      <strong
                        style={{
                          fontSize: "1.4rem",
                          color: "var(--text-primary)",
                        }}
                      >
                        {formatCurrency(project.quotePrice || 0)}
                      </strong>
                    </div>
                    <div
                      className="card"
                      style={{
                        padding: "1.25rem",
                        borderLeft: "4px solid #ec4899",
                        background: "rgba(236, 72, 153, 0.02)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          display: "block",
                          textTransform: "uppercase",
                          marginBottom: "0.35rem",
                          fontWeight: 600,
                        }}
                      >
                        Final Price (Grand Total)
                      </span>
                      <strong style={{ fontSize: "1.5rem", color: "#ec4899" }}>
                        {formatCurrency(project.finalPrice || 0)}
                      </strong>
                    </div>
                    <div
                      className="card"
                      style={{
                        padding: "1.25rem",
                        borderLeft: "4px solid #ef4444",
                        background: "rgba(239, 68, 68, 0.02)",
                      }}
                    >
                      <span
                        style={{
                          fontSize: "0.75rem",
                          color: "var(--text-muted)",
                          display: "block",
                          textTransform: "uppercase",
                          marginBottom: "0.35rem",
                          fontWeight: 600,
                        }}
                      >
                        Outstanding Amount
                      </span>
                      <strong style={{ fontSize: "1.5rem", color: "#ef4444" }}>
                        {formatCurrency(outstandingTotal)}
                      </strong>
                    </div>
                  </div>

                  {/* Breakdown Cards */}
                  <div>
                    <h4
                      style={{
                        fontSize: "0.85rem",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        marginBottom: "0.75rem",
                        textTransform: "uppercase",
                        letterSpacing: "0.05em",
                        margin: "0 0 0.75rem 0",
                      }}
                    >
                      Cost Breakdown
                    </h4>
                    <div
                      style={{
                        display: "grid",
                        gridTemplateColumns:
                          "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "1rem",
                      }}
                    >
                      <div
                        className="card"
                        style={{
                          padding: "1rem",
                          borderLeft: "4px solid #a855f7",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.73rem",
                            color: "var(--text-muted)",
                            display: "block",
                            textTransform: "uppercase",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Hosting Cost
                        </span>
                        <strong
                          style={{
                            fontSize: "1.15rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {formatCurrency(project.hostingPrice || 0)}
                        </strong>
                      </div>
                      <div
                        className="card"
                        style={{
                          padding: "1rem",
                          borderLeft: "4px solid #06b6d4",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.73rem",
                            color: "var(--text-muted)",
                            display: "block",
                            textTransform: "uppercase",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Domain Cost
                        </span>
                        <strong
                          style={{
                            fontSize: "1.15rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {formatCurrency(project.domainPrice || 0)}
                        </strong>
                      </div>
                      <div
                        className="card"
                        style={{
                          padding: "1rem",
                          borderLeft: "4px solid #3b82f6",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.73rem",
                            color: "var(--text-muted)",
                            display: "block",
                            textTransform: "uppercase",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Development Cost
                        </span>
                        <strong
                          style={{
                            fontSize: "1.15rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {formatCurrency(project.devPrice || 0)}
                        </strong>
                      </div>
                      <div
                        className="card"
                        style={{
                          padding: "1rem",
                          borderLeft: "4px solid #10b981",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.73rem",
                            color: "var(--text-muted)",
                            display: "block",
                            textTransform: "uppercase",
                            marginBottom: "0.25rem",
                          }}
                        >
                          360 Deg Marketing Cost
                        </span>
                        <strong
                          style={{
                            fontSize: "1.15rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {formatCurrency(project.marketingPrice || 0)}
                        </strong>
                      </div>
                      <div
                        className="card"
                        style={{
                          padding: "1rem",
                          borderLeft: "4px solid #f59e0b",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.73rem",
                            color: "var(--text-muted)",
                            display: "block",
                            textTransform: "uppercase",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Meta/Google Ads Cost
                        </span>
                        <strong
                          style={{
                            fontSize: "1.15rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {formatCurrency(project.adsPrice || 0)}
                        </strong>
                      </div>
                      <div
                        className="card"
                        style={{
                          padding: "1rem",
                          borderLeft: "4px solid #f43f5e",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.73rem",
                            color: "var(--text-muted)",
                            display: "block",
                            textTransform: "uppercase",
                            marginBottom: "0.25rem",
                          }}
                        >
                          Design Cost
                        </span>
                        <strong
                          style={{
                            fontSize: "1.15rem",
                            color: "var(--text-primary)",
                          }}
                        >
                          {formatCurrency(project.designPrice || 0)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Payment Progress and Statement stats */}
                  <div
                    className="card responsive-grid"
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1.2fr 1fr",
                      gap: "2rem",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: "1.1rem",
                          marginBottom: "1rem",
                          fontWeight: 600,
                        }}
                      >
                        Project Payment Progress Summary
                      </h3>
                      <div
                        style={{
                          background: "rgba(255, 255, 255, 0.01)",
                          padding: "1.25rem",
                          borderRadius: "12px",
                          border: "1px solid var(--border-color)",
                        }}
                      >
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.9rem",
                            marginBottom: "0.5rem",
                          }}
                        >
                          <span>Project Payment Progress</span>
                          <strong>{paymentProgress}% Paid</strong>
                        </div>
                        <div
                          style={{
                            height: "8px",
                            background: "rgba(255, 255, 255, 0.05)",
                            borderRadius: "9999px",
                            overflow: "hidden",
                            marginBottom: "0.75rem",
                          }}
                        >
                          <div
                            style={{
                              width: `${paymentProgress}%`,
                              height: "100%",
                              background: "#10b981",
                              borderRadius: "9999px",
                              transition: "width 0.3s ease",
                            }}
                          ></div>
                        </div>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: "0.78rem",
                            color: "var(--text-muted)",
                          }}
                        >
                          <span>Total Paid: {formatCurrency(paidTotal)}</span>
                          <span>
                            Outstanding Balance:{" "}
                            {formatCurrency(projectOutstanding)}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        justifyContent: "center",
                        gap: "0.75rem",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "0.65rem 1rem",
                          background: "rgba(16, 185, 129, 0.08)",
                          borderRadius: "8px",
                          border: "1px solid rgba(16, 185, 129, 0.2)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Paid Invoices Amount
                        </span>
                        <strong
                          style={{ color: "#10b981", fontSize: "0.95rem" }}
                        >
                          {formatCurrency(paidTotal)}
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "0.65rem 1rem",
                          background: "rgba(245, 158, 11, 0.08)",
                          borderRadius: "8px",
                          border: "1px solid rgba(245, 158, 11, 0.2)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Pending Invoices Amount
                        </span>
                        <strong
                          style={{ color: "#f59e0b", fontSize: "0.95rem" }}
                        >
                          {formatCurrency(pendingTotal)}
                        </strong>
                      </div>
                      <div
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "0.65rem 1rem",
                          background: "rgba(239, 68, 68, 0.08)",
                          borderRadius: "8px",
                          border: "1px solid rgba(239, 68, 68, 0.2)",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.85rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Outstanding Amount
                        </span>
                        <strong
                          style={{ color: "#ef4444", fontSize: "0.95rem" }}
                        >
                          {formatCurrency(outstandingTotal)}
                        </strong>
                      </div>
                    </div>
                  </div>

                  {/* Chronological Statement Table */}
                  <div className="card">
                    <h3
                      style={{
                        fontSize: "1.1rem",
                        marginBottom: "1rem",
                        fontWeight: 600,
                      }}
                    >
                      Financial Statement Ledger
                    </h3>
                    {invoicesList.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "2rem 1rem",
                          color: "var(--text-muted)",
                          fontSize: "0.9rem",
                        }}
                      >
                        No transactions found for this project statement.
                      </div>
                    ) : (
                      <div className="table-container">
                        <table className="custom-table">
                          <thead>
                            <tr>
                              <th>Date</th>
                              <th>Activity / Reference</th>
                              <th>Type</th>
                              <th style={{ textAlign: "right" }}>
                                Billed Amount
                              </th>
                              <th style={{ textAlign: "right" }}>
                                Paid Credit
                              </th>
                              <th style={{ textAlign: "center" }}>Status</th>
                            </tr>
                          </thead>
                          <tbody>
                            {invoicesList.map((inv) => (
                              <tr key={inv._id}>
                                <td>
                                  {new Date(inv.issueDate).toLocaleDateString(
                                    "en-IN",
                                    {
                                      day: "numeric",
                                      month: "short",
                                      year: "numeric",
                                    },
                                  )}
                                </td>
                                <td>
                                  <Link
                                    href={`/invoices/${inv._id}`}
                                    style={{
                                      fontWeight: 600,
                                      color: "var(--accent-primary)",
                                      hover: { textDecoration: "underline" },
                                    }}
                                  >
                                    Invoice #{inv.invoiceNumber}
                                  </Link>
                                </td>
                                <td
                                  style={{
                                    color: "var(--text-secondary)",
                                    fontSize: "0.82rem",
                                  }}
                                >
                                  Billing Issue
                                </td>
                                <td
                                  style={{
                                    textAlign: "right",
                                    fontWeight: 500,
                                  }}
                                >
                                  {formatCurrency(inv.total)}
                                </td>
                                <td
                                  style={{
                                    textAlign: "right",
                                    fontWeight: 600,
                                    color:
                                      inv.status === "Paid"
                                        ? "#10b981"
                                        : "var(--text-muted)",
                                  }}
                                >
                                  {inv.status === "Paid"
                                    ? formatCurrency(inv.total)
                                    : "—"}
                                </td>
                                <td style={{ textAlign: "center" }}>
                                  <span
                                    className={`badge badge-${inv.status.toLowerCase()}`}
                                  >
                                    {inv.status}
                                  </span>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 4: Associated Invoices (View Mode) */}
              {activeTab === "invoices" && (
                <div className="card animate-fade-in">
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1.5rem",
                    }}
                  >
                    <h3
                      style={{ fontSize: "1.1rem", fontWeight: 600, margin: 0 }}
                    >
                      Associated Invoices
                    </h3>
                    <Link
                      href={{
                        pathname: "/invoices",
                        query: { projectId: project._id },
                      }}
                      className="btn btn-primary"
                      style={{ padding: "0.5rem 1rem", fontSize: "0.85rem" }}
                    >
                      <Plus size={16} />
                      <span>New Invoice</span>
                    </Link>
                  </div>

                  {invoices.length === 0 ? (
                    <div
                      style={{
                        textAlign: "center",
                        padding: "2.5rem 1rem",
                        color: "var(--text-secondary)",
                        fontSize: "0.9rem",
                      }}
                    >
                      No invoices generated for this project yet.
                    </div>
                  ) : (
                    <div className="table-container">
                      <table className="custom-table">
                        <thead>
                          <tr>
                            <th>Invoice No.</th>
                            <th>Issued Date</th>
                            <th>Total Amount</th>
                            <th>Status</th>
                          </tr>
                        </thead>
                        <tbody>
                          {invoices.map((inv) => (
                            <tr key={inv._id}>
                              <td>
                                <Link
                                  href={`/invoices/${inv._id}`}
                                  style={{
                                    fontWeight: 600,
                                    color: "var(--accent-primary)",
                                    hover: { textDecoration: "underline" },
                                  }}
                                >
                                  {inv.invoiceNumber}
                                </Link>
                              </td>
                              <td>
                                {new Date(inv.issueDate).toLocaleDateString()}
                              </td>
                              <td style={{ fontWeight: 500 }}>
                                {formatCurrency(inv.total)}
                              </td>
                              <td>
                                <span
                                  className={`badge badge-${inv.status.toLowerCase()}`}
                                >
                                  {inv.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 5: Status Updates Feed (View Mode) */}
              {activeTab === "status" && (
                <div
                  className="card animate-fade-in"
                  style={{ height: "fit-content" }}
                >
                  <h3
                    style={{
                      fontSize: "1.15rem",
                      fontWeight: 600,
                      marginBottom: "0.25rem",
                    }}
                  >
                    Status Update Log
                  </h3>
                  <p
                    style={{
                      color: "var(--text-secondary)",
                      fontSize: "0.8rem",
                      marginBottom: "1rem",
                    }}
                  >
                    Log project milestones and status updates date-wise.
                  </p>

                  {/* Add Status Update Form */}
                  {permissions?.project_status === "write" && (
                    <form
                      onSubmit={handleAddStatusUpdate}
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        marginBottom: "1.25rem",
                      }}
                    >
                      <input
                        type="text"
                        placeholder="Post a new status update..."
                        className="form-input"
                        style={{
                          fontSize: "0.85rem",
                          padding: "0.5rem 0.75rem",
                        }}
                        value={newStatusUpdate}
                        onChange={(e) => setNewStatusUpdate(e.target.value)}
                      />
                      <button
                        type="submit"
                        className="btn btn-primary"
                        style={{ padding: "0.5rem 0.75rem" }}
                        disabled={addingUpdate}
                      >
                        <Plus size={16} />
                      </button>
                    </form>
                  )}

                  {/* Updates History Feed */}
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                      maxHeight: "400px",
                      overflowY: "auto",
                      paddingRight: "4px",
                    }}
                  >
                    {!project.statusUpdates ||
                    project.statusUpdates.length === 0 ? (
                      <div
                        style={{
                          textAlign: "center",
                          padding: "2rem 1rem",
                          color: "var(--text-muted)",
                          fontSize: "0.85rem",
                        }}
                      >
                        No status updates logged yet.
                      </div>
                    ) : (
                      [...project.statusUpdates].reverse().map((update) => (
                        <div
                          key={update._id}
                          style={{
                            background: "rgba(255, 255, 255, 0.01)",
                            border: "1px solid var(--border-color)",
                            borderRadius: "10px",
                            padding: "0.75rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.25rem",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.7rem",
                                color: "var(--accent-secondary)",
                                fontWeight: 600,
                              }}
                            >
                              {new Date(update.date).toLocaleString("en-IN", {
                                dateStyle: "medium",
                                timeStyle: "short",
                              })}
                            </span>
                            {permissions?.project_status === "write" && (
                              <button
                                style={{
                                  background: "none",
                                  border: "none",
                                  color: "var(--text-muted)",
                                  cursor: "pointer",
                                  padding: 0,
                                }}
                                onClick={() =>
                                  handleDeleteStatusUpdate(update._id)
                                }
                                className="delete-task-btn"
                              >
                                <Trash2 size={11} />
                              </button>
                            )}
                          </div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "0.85rem",
                              color: "var(--text-primary)",
                              lineHeight: 1.35,
                              wordBreak: "break-word",
                            }}
                          >
                            {update.message}
                          </p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* Tab 6: Task Checklist Panel (View Mode) */}
              {activeTab === "tasks" && (
                <div
                  className="card animate-fade-in"
                  style={{ height: "fit-content" }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "1.25rem",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 600,
                          margin: 0,
                        }}
                      >
                        Task Checklist
                      </h3>
                      <p
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.85rem",
                          margin: 0,
                        }}
                      >
                        Track milestones and steps to project completion.
                      </p>
                    </div>
                    <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "center" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>From:</span>
                        <input
                          type="date"
                          value={exportFromDate}
                          onChange={(e) => setExportFromDate(e.target.value)}
                          style={{
                            height: "38px",
                            padding: "0 0.5rem",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color)",
                            background: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                            fontSize: "0.82rem",
                          }}
                        />
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "0.35rem" }}>
                        <span style={{ fontSize: "0.78rem", color: "var(--text-secondary)", fontWeight: 500 }}>To:</span>
                        <input
                          type="date"
                          value={exportToDate}
                          onChange={(e) => setExportToDate(e.target.value)}
                          style={{
                            height: "38px",
                            padding: "0 0.5rem",
                            borderRadius: "8px",
                            border: "1px solid var(--border-color)",
                            background: "var(--bg-secondary)",
                            color: "var(--text-primary)",
                            fontSize: "0.82rem",
                          }}
                        />
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={handleExportTaskReport}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          height: "38px",
                          fontSize: "0.82rem",
                          background: "var(--bg-tertiary)",
                          border: "1px solid var(--border-color)",
                          color: "var(--text-primary)",
                        }}
                      >
                        <ExternalLink size={16} />
                        <span>Export Report</span>
                      </button>
                      {permissions?.project_tasks === "write" && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          onClick={() => setIsAddTaskModalOpen(true)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "0.4rem",
                            height: "38px",
                            fontSize: "0.82rem",
                          }}
                        >
                          <Plus size={16} />
                          <span>Create Task</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Progress Indicator */}
                  <div
                    style={{
                      marginBottom: "1.5rem",
                      background: "rgba(255, 255, 255, 0.02)",
                      padding: "1rem",
                      borderRadius: "12px",
                      border: "1px solid var(--border-color)",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: "0.9rem",
                        marginBottom: "0.5rem",
                      }}
                    >
                      <span>Completion Progress</span>
                      <strong>{taskProgress}%</strong>
                    </div>
                    <div
                      style={{
                        height: "8px",
                        background: "rgba(255, 255, 255, 0.05)",
                        borderRadius: "9999px",
                        overflow: "hidden",
                      }}
                    >
                      <div
                        style={{
                          width: `${taskProgress}%`,
                          height: "100%",
                          background: "var(--accent-primary)",
                          borderRadius: "9999px",
                          transition: "width 0.3s ease",
                        }}
                      ></div>
                    </div>
                    <div
                      style={{
                        marginTop: "0.5rem",
                        fontSize: "0.75rem",
                        color: "var(--text-muted)",
                      }}
                    >
                      {completedTasks} of {totalTasks} items completed
                    </div>
                    <div
                      className="table-container"
                      style={{ marginTop: "1rem", overflowX: "auto" }}
                    >
                      {employeeFilteredTasks.length === 0 ? (
                        <div
                          style={{
                            textAlign: "center",
                            padding: "2.5rem 1rem",
                            color: "var(--text-muted)",
                            fontSize: "0.9rem",
                          }}
                        >
                          {category === "Employee" ? "No tasks assigned to you yet." : "No tasks created yet."}
                        </div>
                      ) : (
                        <table
                          className="custom-table"
                          style={{ width: "100%", borderCollapse: "collapse" }}
                        >
                          <thead>
                            <tr>
                              <th
                                style={{ width: "40px", textAlign: "center" }}
                              >
                                Done
                              </th>
                              <th>Task Name</th>
                              <th>Assigned To</th>
                              <th>Assigned By</th>
                              <th>Due Date</th>
                              <th>Priority</th>
                              <th>Status</th>
                              <th
                                style={{ width: "60px", textAlign: "center" }}
                              >
                                Actions
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {[...employeeFilteredTasks]
                              .sort((a, b) => {
                                if (!a.dueDate && !b.dueDate) return 0;
                                if (!a.dueDate) return 1;
                                if (!b.dueDate) return -1;
                                return (
                                  new Date(a.dueDate) - new Date(b.dueDate)
                                );
                              })
                              .map((task) => {
                                const isOverdue =
                                  task.dueDate &&
                                  new Date(task.dueDate) < new Date() &&
                                  task.status !== "Completed";
                                const isExpanded = !!expandedTasks[task._id];

                                // Priority styling
                                const getPriorityStyles = (p) => {
                                  switch (p) {
                                    case "High":
                                      return {
                                        color: "#ef4444",
                                        bg: "rgba(239, 68, 68, 0.1)",
                                        dot: "#ef4444",
                                      };
                                    case "Low":
                                      return {
                                        color: "#10b981",
                                        bg: "rgba(16, 185, 129, 0.1)",
                                        dot: "#10b981",
                                      };
                                    default:
                                      return {
                                        color: "#f59e0b",
                                        bg: "rgba(245, 158, 11, 0.1)",
                                        dot: "#f59e0b",
                                      };
                                  }
                                };
                                const prioStyles = getPriorityStyles(
                                  task.priority || "Medium",
                                );

                                return (
                                  <React.Fragment key={task._id}>
                                    <tr
                                      style={
                                        category === "Employee" && !task.isRead
                                          ? {
                                              borderLeft: "3px solid #3b82f6",
                                              background:
                                                "rgba(59, 130, 246, 0.04)",
                                            }
                                          : {}
                                      }
                                    >
                                      <td
                                        style={{
                                          textAlign: "center",
                                          verticalAlign: "middle",
                                        }}
                                      >
                                        <div
                                          style={{
                                            cursor:
                                              permissions?.project_tasks ===
                                              "write"
                                                ? "pointer"
                                                : "default",
                                            display: "inline-flex",
                                            alignItems: "center",
                                          }}
                                          onClick={() =>
                                            permissions?.project_tasks ===
                                              "write" &&
                                            handleToggleTask(
                                              task._id,
                                              task.completed,
                                              task.status,
                                            )
                                          }
                                        >
                                          {task.completed ||
                                          task.status === "Completed" ? (
                                            <CheckSquare
                                              size={18}
                                              style={{
                                                color: "var(--accent-primary)",
                                              }}
                                            />
                                          ) : (
                                            <Square
                                              size={18}
                                              style={{
                                                color: "var(--text-secondary)",
                                              }}
                                            />
                                          )}
                                        </div>
                                      </td>
                                      <td style={{ verticalAlign: "middle" }}>
                                        <div
                                          style={{
                                            display: "flex",
                                            flexDirection: "column",
                                            gap: "4px",
                                          }}
                                        >
                                          <div
                                            style={{
                                              display: "flex",
                                              alignItems: "center",
                                              gap: "8px",
                                            }}
                                          >
                                            <span
                                              className={`task-name ${task.completed || task.status === "Completed" ? "completed" : ""}`}
                                              style={{
                                                fontWeight: 600,
                                                color: "var(--text-primary)",
                                                fontSize: "0.92rem",
                                              }}
                                            >
                                              {task.name}
                                            </span>
                                            <span
                                              style={{
                                                display: "inline-flex",
                                                alignItems: "center",
                                                gap: "4px",
                                                fontSize: "0.65rem",
                                                fontWeight: 600,
                                                padding: "0.1rem 0.4rem",
                                                borderRadius: "9999px",
                                                background: prioStyles.bg,
                                                color: prioStyles.color,
                                              }}
                                            >
                                              <span
                                                style={{
                                                  width: "4px",
                                                  height: "4px",
                                                  borderRadius: "50%",
                                                  background: prioStyles.dot,
                                                }}
                                              ></span>
                                              {task.priority || "Medium"}
                                            </span>
                                            {category === "Employee" &&
                                              !task.isRead && (
                                                <span
                                                  style={{
                                                    display: "inline-flex",
                                                    alignItems: "center",
                                                    gap: "3px",
                                                    fontSize: "0.6rem",
                                                    fontWeight: 700,
                                                    padding: "0.1rem 0.45rem",
                                                    borderRadius: "9999px",
                                                    background:
                                                      "rgba(59, 130, 246, 0.15)",
                                                    color: "#3b82f6",
                                                    border:
                                                      "1px solid rgba(59, 130, 246, 0.3)",
                                                    letterSpacing: "0.04em",
                                                  }}
                                                >
                                                  <Eye size={9} />
                                                  NEW
                                                </span>
                                              )}
                                          </div>
                                          {task.notes && (
                                            <button
                                              type="button"
                                              onClick={() =>
                                                setExpandedTasks((prev) => ({
                                                  ...prev,
                                                  [task._id]: !prev[task._id],
                                                }))
                                              }
                                              style={{
                                                background: "none",
                                                border: "none",
                                                padding: 0,
                                                color: "var(--accent-primary)",
                                                fontSize: "0.72rem",
                                                cursor: "pointer",
                                                textAlign: "left",
                                                display: "inline-flex",
                                                width: "fit-content",
                                              }}
                                            >
                                              {isExpanded
                                                ? "Hide Notes"
                                                : "Show Notes"}
                                            </button>
                                          )}
                                        </div>
                                      </td>
                                      <td style={{ verticalAlign: "middle" }}>
                                        <select
                                          value={task.assignedTo || ""}
                                          onChange={(e) =>
                                            handleUpdateTaskMeta(
                                              task._id,
                                              "assignedTo",
                                              e.target.value,
                                            )
                                          }
                                          className="form-select"
                                          style={{
                                            fontSize: "0.78rem",
                                            padding: "0.2rem 0.4rem",
                                            borderRadius: "6px",
                                            height: "28px",
                                            background: "var(--bg-secondary)",
                                            border:
                                              "1px solid var(--border-color)",
                                            width: "130px",
                                          }}
                                          disabled={
                                            permissions?.project_tasks !==
                                              "write" || category === "Employee"
                                          }
                                        >
                                          <option value="">Unassigned</option>
                                          {assignableUsers.map((u) => (
                                            <option
                                              key={u.id}
                                              value={u.username}
                                            >
                                              {u.username}
                                            </option>
                                          ))}
                                        </select>
                                      </td>
                                      <td
                                        style={{
                                          verticalAlign: "middle",
                                          fontSize: "0.85rem",
                                          color: "var(--text-secondary)",
                                        }}
                                      >
                                        {task.assignedBy || "Admin"}
                                      </td>
                                      <td style={{ verticalAlign: "middle" }}>
                                        <input
                                          type="date"
                                          value={
                                            task.dueDate
                                              ? new Date(task.dueDate)
                                                  .toISOString()
                                                  .substring(0, 10)
                                              : ""
                                          }
                                          onChange={(e) =>
                                            handleUpdateTaskMeta(
                                              task._id,
                                              "dueDate",
                                              e.target.value,
                                            )
                                          }
                                          className="form-input"
                                          style={{
                                            fontSize: "0.78rem",
                                            padding: "0.2rem 0.4rem",
                                            borderRadius: "6px",
                                            height: "28px",
                                            width: "130px",
                                            color: isOverdue
                                              ? "#ef4444"
                                              : "var(--text-primary)",
                                            borderColor: isOverdue
                                              ? "rgba(239, 68, 68, 0.4)"
                                              : "var(--border-color)",
                                            background: "var(--bg-secondary)",
                                          }}
                                          disabled={
                                            permissions?.project_tasks !==
                                              "write" || category === "Employee"
                                          }
                                        />
                                      </td>
                                      <td style={{ verticalAlign: "middle" }}>
                                        <select
                                          value={task.priority || "Medium"}
                                          onChange={(e) =>
                                            handleUpdateTaskMeta(
                                              task._id,
                                              "priority",
                                              e.target.value,
                                            )
                                          }
                                          className="form-select"
                                          style={{
                                            fontSize: "0.78rem",
                                            padding: "0.2rem 0.4rem",
                                            borderRadius: "6px",
                                            height: "28px",
                                            background: "var(--bg-secondary)",
                                            border:
                                              "1px solid var(--border-color)",
                                            width: "95px",
                                          }}
                                          disabled={
                                            permissions?.project_tasks !==
                                              "write" || category === "Employee"
                                          }
                                        >
                                          <option value="Low">Low</option>
                                          <option value="Medium">Medium</option>
                                          <option value="High">High</option>
                                        </select>
                                      </td>
                                      <td style={{ verticalAlign: "middle" }}>
                                        <select
                                          value={
                                            task.status ||
                                            (task.completed
                                              ? "Completed"
                                              : "Todo")
                                          }
                                          onChange={(e) =>
                                            handleUpdateTaskMeta(
                                              task._id,
                                              "status",
                                              e.target.value,
                                            )
                                          }
                                          className="form-select"
                                          style={{
                                            fontSize: "0.78rem",
                                            padding: "0.2rem 0.4rem",
                                            borderRadius: "6px",
                                            height: "28px",
                                            background: "var(--bg-secondary)",
                                            border:
                                              "1px solid var(--border-color)",
                                            width: "110px",
                                          }}
                                          disabled={
                                            permissions?.project_tasks !==
                                              "write" ||
                                            (category === "Employee" &&
                                              !task.isRead)
                                          }
                                        >
                                          <option value="Todo">Todo</option>
                                          <option value="In Progress">
                                            In Progress
                                          </option>
                                          <option value="Completed">
                                            Completed
                                          </option>
                                        </select>
                                      </td>
                                      <td
                                        style={{
                                          textAlign: "center",
                                          verticalAlign: "middle",
                                        }}
                                      >
                                        {permissions?.project_tasks ===
                                          "write" &&
                                        category === "Employee" &&
                                        !task.isRead ? (
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleMarkTaskRead(task._id)
                                            }
                                            title="Acknowledge task to unlock status editing"
                                            style={{
                                              display: "inline-flex",
                                              alignItems: "center",
                                              gap: "4px",
                                              background:
                                                "linear-gradient(135deg, #3b82f6 0%, #6366f1 100%)",
                                              color: "#fff",
                                              border: "none",
                                              borderRadius: "6px",
                                              padding: "0.25rem 0.6rem",
                                              fontSize: "0.7rem",
                                              fontWeight: 600,
                                              cursor: "pointer",
                                              whiteSpace: "nowrap",
                                              boxShadow:
                                                "0 2px 8px rgba(99, 102, 241, 0.35)",
                                            }}
                                          >
                                            <Eye size={11} />
                                            Read
                                          </button>
                                        ) : permissions?.project_tasks ===
                                            "write" &&
                                          category !== "Employee" ? (
                                          <button
                                            style={{
                                              background: "none",
                                              border: "none",
                                              color: "var(--text-muted)",
                                              cursor: "pointer",
                                              padding: "4px",
                                            }}
                                            onClick={() =>
                                              handleDeleteTask(task._id)
                                            }
                                            className="delete-task-btn"
                                            title="Delete Task"
                                          >
                                            <Trash2 size={15} />
                                          </button>
                                        ) : null}
                                      </td>
                                    </tr>
                                    {isExpanded && task.notes && (
                                      <tr key={`${task._id}-notes`}>
                                        <td
                                          colSpan={8}
                                          style={{
                                            background:
                                              "rgba(255, 255, 255, 0.01)",
                                            padding: "0.75rem 1.25rem",
                                          }}
                                        >
                                          <div
                                            style={{
                                              padding: "0.75rem 1rem",
                                              background:
                                                "rgba(255, 255, 255, 0.02)",
                                              borderLeft:
                                                "3px solid var(--accent-primary)",
                                              borderRadius: "0 8px 8px 0",
                                              fontSize: "0.82rem",
                                              color: "var(--text-secondary)",
                                              whiteSpace: "pre-wrap",
                                            }}
                                          >
                                            <strong
                                              style={{
                                                color: "var(--text-primary)",
                                                display: "block",
                                                marginBottom: "0.25rem",
                                              }}
                                            >
                                              Notes / Description:
                                            </strong>
                                            <div>{task.notes}</div>
                                          </div>
                                        </td>
                                      </tr>
                                    )}
                                  </React.Fragment>
                                );
                              })}
                          </tbody>
                        </table>
                      )}
                    </div>{" "}
                  </div>
                </div>
              )}

              {/* Tab 7: Content Calendar Panel */}
              {activeTab === "calendar" && (
                <div
                  className="card animate-fade-in"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      borderBottom: "1px solid var(--border-color)",
                      paddingBottom: "0.75rem",
                      flexWrap: "wrap",
                      gap: "0.75rem",
                    }}
                  >
                    <div>
                      <h3
                        style={{
                          fontSize: "1.2rem",
                          fontWeight: 700,
                          margin: 0,
                        }}
                      >
                        Content Calendar
                      </h3>
                      <p
                        style={{
                          color: "var(--text-secondary)",
                          fontSize: "0.825rem",
                          margin: 0,
                          marginTop: "2px",
                        }}
                      >
                        Plan visual designs, copy, hashtags and schedule posts.
                      </p>
                    </div>
                    <div
                      style={{
                        display: "flex",
                        gap: "0.5rem",
                        alignItems: "center",
                        flexWrap: "wrap",
                      }}
                    >
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.35rem",
                          marginRight: "0.25rem",
                        }}
                      >
                        <span
                          style={{
                            fontSize: "0.8rem",
                            color: "var(--text-secondary)",
                          }}
                        >
                          Month:
                        </span>
                        <select
                          className="form-select"
                          value={calendarMonthFilter}
                          onChange={(e) =>
                            setCalendarMonthFilter(e.target.value)
                          }
                          style={{
                            width: "auto",
                            minWidth: "130px",
                            padding: "0.35rem 1.75rem 0.35rem 0.6rem",
                            fontSize: "0.8rem",
                            height: "32px",
                          }}
                        >
                          {getMonthsOptions().map((m) => (
                            <option key={m} value={m}>
                              {formatMonthDisplay(m)}
                            </option>
                          ))}
                        </select>
                      </div>
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          padding: "0.35rem 0.75rem",
                          fontSize: "0.8rem",
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "0.25rem",
                          height: "32px",
                        }}
                        onClick={openExportModal}
                      >
                        Export CSV
                      </button>
                      {permissions?.project_calendar === "write" && (
                        <>
                          <button
                            type="button"
                            className="btn btn-secondary"
                            style={{
                              padding: "0.35rem 0.75rem",
                              fontSize: "0.8rem",
                              display: "inline-flex",
                              alignItems: "center",
                              gap: "0.25rem",
                              height: "32px",
                            }}
                            onClick={() =>
                              document
                                .getElementById("csv-import-file-input")
                                .click()
                            }
                          >
                            Import CSV
                          </button>
                          <input
                            type="file"
                            id="csv-import-file-input"
                            accept=".csv"
                            style={{ display: "none" }}
                            onChange={handleImportCalendar}
                          />
                        </>
                      )}
                      <button
                        type="button"
                        className="btn btn-secondary"
                        style={{
                          padding: "0.35rem 0.75rem",
                          fontSize: "0.8rem",
                          height: "32px",
                        }}
                        onClick={() => {
                          setIsViewCalendarOpen(true);
                        }}
                      >
                        View Calendar
                      </button>
                      {permissions?.project_calendar === "write" && (
                        <button
                          type="button"
                          className="btn btn-primary"
                          style={{
                            padding: "0.35rem 0.75rem",
                            fontSize: "0.8rem",
                            display: "inline-flex",
                            alignItems: "center",
                            gap: "0.25rem",
                            height: "32px",
                          }}
                          onClick={() => {
                            setCurrentPost(null);
                            setPostForm({
                              scheduledDate: "",
                              postType: "Static",
                              topic: "",
                              content: "",
                              hashtags: "",
                              visual: "",
                              platforms: [],
                              status: "Pending",
                            });
                            setIsAddPostModalOpen(true);
                          }}
                        >
                          <Plus size={14} />
                          <span>Add Post</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Upcoming and Completed Posts Summary Rows */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 1fr",
                      gap: "1.5rem",
                    }}
                    className="responsive-grid"
                  >
                    {/* Left Column: Upcoming Posts (Next 4 Days / Min 4) */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "0.925rem",
                          fontWeight: 600,
                          color: "var(--accent-primary)",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          borderBottom: "1px dashed var(--border-color)",
                          paddingBottom: "0.5rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Upcoming Posts (Next 4 Days)
                      </h4>
                      {(() => {
                        const upcomingAll = (project.contentCalendar || [])
                          .filter((post) => post.status !== "Posted")
                          .sort(
                            (a, b) =>
                              new Date(a.scheduledDate) -
                              new Date(b.scheduledDate),
                          );

                        const within4Days = upcomingAll.filter(
                          (post) =>
                            new Date(post.scheduledDate) <= fourDaysThreshold,
                        );

                        const upcoming =
                          within4Days.length < 4
                            ? upcomingAll.slice(0, 4)
                            : within4Days;

                        if (upcoming.length === 0) {
                          return (
                            <div
                              style={{
                                background: "rgba(255, 255, 255, 0.01)",
                                border: "1px dashed var(--border-color)",
                                borderRadius: "10px",
                                padding: "1.5rem",
                                textAlign: "center",
                                color: "var(--text-muted)",
                                fontSize: "0.85rem",
                              }}
                            >
                              No upcoming posts scheduled.
                            </div>
                          );
                        }

                        return upcoming.map((post) =>
                          renderPostSummaryCard(post),
                        );
                      })()}
                    </div>

                    {/* Right Column: 4 Completed Posts */}
                    <div
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        gap: "1rem",
                      }}
                    >
                      <h4
                        style={{
                          fontSize: "0.925rem",
                          fontWeight: 600,
                          color: "#10b981",
                          textTransform: "uppercase",
                          letterSpacing: "0.05em",
                          borderBottom: "1px dashed var(--border-color)",
                          paddingBottom: "0.5rem",
                          marginBottom: "0.25rem",
                        }}
                      >
                        Completed Posts (Max 4)
                      </h4>
                      {(() => {
                        const completed = (project.contentCalendar || [])
                          .filter((post) => post.status === "Posted")
                          .sort(
                            (a, b) =>
                              new Date(b.scheduledDate) -
                              new Date(a.scheduledDate),
                          )
                          .slice(0, 4);

                        if (completed.length === 0) {
                          return (
                            <div
                              style={{
                                background: "rgba(255, 255, 255, 0.01)",
                                border: "1px dashed var(--border-color)",
                                borderRadius: "10px",
                                padding: "1.5rem",
                                textAlign: "center",
                                color: "var(--text-muted)",
                                fontSize: "0.85rem",
                              }}
                            >
                              No completed posts yet.
                            </div>
                          );
                        }

                        return completed.map((post) =>
                          renderPostSummaryCard(post),
                        );
                      })()}
                    </div>
                  </div>
                </div>
              )}

              {/* Tab 8: Work History Panel */}
              {activeTab === "history" && (
                <div
                  className="card animate-fade-in"
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "1.5rem",
                  }}
                >
                  {(() => {
                    const list = project.statusUpdates || [];
                    const filtered = list.filter(u => 
                      u.message?.toLowerCase().includes(historySearchQuery.toLowerCase())
                    );
                    const isAllSelected = filtered.length > 0 && filtered.every(u => selectedHistoryIds.includes(u._id));
                    
                    const handleToggleSelectAll = () => {
                      if (isAllSelected) {
                        setSelectedHistoryIds(prev => prev.filter(id => !filtered.some(f => f._id === id)));
                      } else {
                        const idsToSelect = filtered.map(u => u._id);
                        setSelectedHistoryIds(prev => [...new Set([...prev, ...idsToSelect])]);
                      }
                    };

                    const handleToggleSelectItem = (id) => {
                      setSelectedHistoryIds(prev => 
                        prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
                      );
                    };

                    return (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            borderBottom: "1px solid var(--border-color)",
                            paddingBottom: "0.75rem",
                            flexWrap: "wrap",
                            gap: "0.75rem",
                          }}
                        >
                          <div>
                            <h3
                              style={{
                                fontSize: "1.2rem",
                                fontWeight: 700,
                                margin: 0,
                              }}
                            >
                              Work History
                            </h3>
                            <p
                              style={{
                                color: "var(--text-secondary)",
                                fontSize: "0.825rem",
                                margin: 0,
                                marginTop: "2px",
                              }}
                            >
                              A historical audit trail of updates and actions for this project.
                            </p>
                          </div>

                          {/* Search input inside panel */}
                          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                            <input 
                              type="text" 
                              placeholder="Search work history..." 
                              className="form-input" 
                              value={historySearchQuery}
                              onChange={(e) => setHistorySearchQuery(e.target.value)}
                              style={{ padding: '0.45rem 1rem 0.45rem 2.2rem', fontSize: '0.85rem', width: '220px', borderRadius: '8px' }}
                            />
                            <Search size={14} style={{ position: 'absolute', left: '10px', color: 'var(--text-secondary)' }} />
                          </div>
                        </div>

                        {/* Bulk Operations Bar */}
                        {list.length > 0 && (
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.01)', padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }} onClick={handleToggleSelectAll}>
                              <input 
                                type="checkbox" 
                                checked={isAllSelected}
                                onChange={() => {}} 
                                style={{ cursor: 'pointer' }}
                              />
                              <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>Select All</span>
                            </div>

                            {selectedHistoryIds.length > 0 && permissions?.project_status === "write" && (
                              <button
                                onClick={handleBulkDeleteHistory}
                                className="btn btn-danger"
                                style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '4px', background: '#ef4444', color: '#ffffff', border: 'none', borderRadius: '6px', cursor: 'pointer' }}
                              >
                                <Trash2 size={13} />
                                <span>Delete Selected ({selectedHistoryIds.length})</span>
                              </button>
                            )}
                          </div>
                        )}

                        {/* List of updates */}
                        <div
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "0.75rem",
                            maxHeight: "550px",
                            overflowY: "auto",
                            paddingRight: "4px",
                          }}
                        >
                          {filtered.length === 0 ? (
                            <div
                              style={{
                                textAlign: "center",
                                padding: "3rem 1rem",
                                color: "var(--text-muted)",
                                fontSize: "0.85rem",
                              }}
                            >
                              {historySearchQuery ? "No matching work history logs found." : "No work history logged yet."}
                            </div>
                          ) : (
                            [...filtered].reverse().map((update) => {
                              const isSelected = selectedHistoryIds.includes(update._id);
                              return (
                                <div
                                  key={update._id}
                                  style={{
                                    background: isSelected ? "rgba(139, 92, 246, 0.04)" : "rgba(255, 255, 255, 0.01)",
                                    border: isSelected ? "1px solid var(--accent-primary)" : "1px solid var(--border-color)",
                                    borderRadius: "10px",
                                    padding: "0.85rem 1rem",
                                    display: "flex",
                                    gap: "1rem",
                                    alignItems: "flex-start",
                                    transition: "all 0.15s ease"
                                  }}
                                >
                                  {/* Selection Checkbox */}
                                  <div style={{ display: 'flex', alignItems: 'center', height: '20px' }}>
                                    <input 
                                      type="checkbox" 
                                      checked={isSelected}
                                      onChange={() => handleToggleSelectItem(update._id)}
                                      style={{ cursor: 'pointer' }}
                                    />
                                  </div>

                                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.35rem', flex: 1 }}>
                                    <div
                                      style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                      }}
                                    >
                                      <span
                                        style={{
                                          fontSize: "0.725rem",
                                          color: "var(--accent-secondary)",
                                          fontWeight: 700,
                                        }}
                                      >
                                        📅 {new Date(update.date).toLocaleString("en-IN", {
                                          dateStyle: "medium",
                                          timeStyle: "short",
                                        })}
                                      </span>
                                      {permissions?.project_status === "write" && (
                                        <button
                                          style={{
                                            background: "none",
                                            border: "none",
                                            color: "var(--text-muted)",
                                            cursor: "pointer",
                                            padding: '4px',
                                            borderRadius: '4px',
                                            display: 'inline-flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            transition: 'all 0.15s ease'
                                          }}
                                          onClick={() =>
                                            handleDeleteStatusUpdate(update._id)
                                          }
                                          className="delete-task-btn"
                                          title="Delete Log Entry"
                                        >
                                          <Trash2 size={13} />
                                        </button>
                                      )}
                                    </div>
                                    <p
                                      style={{
                                        margin: 0,
                                        fontSize: "0.875rem",
                                        color: "var(--text-primary)",
                                        lineHeight: 1.4,
                                        wordBreak: "break-word",
                                      }}
                                    >
                                      {update.message}
                                    </p>
                                  </div>
                                </div>
                              );
                            })
                          )}
                        </div>
                      </>
                    );
                  })()}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <style jsx global>{`
        .delete-task-btn:hover {
          color: #ef4444 !important;
        }
        .icon-btn-edit {
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }
        .icon-btn-edit:hover {
          color: var(--accent-primary) !important;
          background: rgba(0, 174, 239, 0.08) !important;
        }
        .icon-btn-delete {
          color: var(--text-secondary);
          transition: all 0.15s ease;
        }
        .icon-btn-delete:hover {
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.08) !important;
        }
        .post-summary-strip {
          background: rgba(255, 255, 255, 0.01);
          border: 1px solid var(--border-color);
          transition: all 0.2s ease;
        }
        .post-summary-strip:hover {
          background: rgba(255, 255, 255, 0.025) !important;
          border-color: var(--accent-primary-glow) !important;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
        }
        .tabs-nav-container {
          display: flex;
          gap: 0.25rem;
          border-bottom: 1px solid var(--border-color);
          margin-bottom: 1.75rem;
          overflow-x: auto;
          scrollbar-width: none;
          -ms-overflow-style: none;
          padding-bottom: 2px;
        }
        .tabs-nav-container::-webkit-scrollbar {
          display: none;
        }
        .tab-nav-btn {
          padding: 0.7rem 1.15rem;
          background: transparent;
          border: none;
          border-bottom: 2px solid transparent;
          color: var(--text-secondary);
          font-weight: 600;
          font-size: 0.925rem;
          cursor: pointer;
          white-space: nowrap;
          transition: all 0.18s ease;
          border-radius: 6px 6px 0 0;
        }
        .tab-nav-btn:hover {
          color: var(--text-primary);
          background: rgba(255, 255, 255, 0.02);
        }
        .tab-nav-btn.active {
          color: var(--accent-primary);
          border-bottom-color: var(--accent-primary);
          background: rgba(139, 92, 246, 0.05);
        }
        .credential-form-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 0.75rem 1rem;
        }
        @media (max-width: 768px) {
          .responsive-grid {
            grid-template-columns: 1fr !important;
            gap: 1.25rem !important;
          }
          .tab-nav-btn {
            padding: 0.55rem 0.9rem;
            font-size: 0.85rem;
          }
        }
        @media (max-width: 576px) {
          .credential-form-grid {
            grid-template-columns: 1fr;
            gap: 0.75rem;
          }
          .credential-form-grid > .form-group {
            grid-column: span 1 !important;
          }
        }
      `}</style>
      {/* Add / Edit Post Modal */}
      {isAddPostModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "650px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.75rem",
              }}
            >
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                {currentPost ? "Edit Post" : "Schedule Content Post"}
              </h3>
              <button
                onClick={() => {
                  setIsAddPostModalOpen(false);
                  setCurrentPost(null);
                }}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSavePost}
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1.2fr 0.9fr 0.9fr",
                  gap: "0.75rem",
                }}
              >
                <div className="form-group">
                  <label className="form-label">Scheduled Date & Time *</label>
                  <input
                    type="datetime-local"
                    className="form-input"
                    required
                    value={postForm.scheduledDate}
                    onChange={(e) =>
                      setPostForm({
                        ...postForm,
                        scheduledDate: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Post Type</label>
                  <select
                    className="form-select"
                    value={postForm.postType || "Static"}
                    onChange={(e) =>
                      setPostForm({ ...postForm, postType: e.target.value })
                    }
                  >
                    <option value="Static">Static</option>
                    <option value="Motion">Motion</option>
                    <option value="Reel">Reel</option>
                    <option value="Carousel">Carousel</option>
                    <option value="Motion Graphic Wish Post">
                      Motion Graphic Wish Post
                    </option>
                    <option value="Wish post">Wish post</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Publishing Status</label>
                  <select
                    className="form-select"
                    value={postForm.status}
                    onChange={(e) =>
                      setPostForm({ ...postForm, status: e.target.value })
                    }
                  >
                    <option value="Pending">Pending</option>
                    <option value="Design Done">Design Done</option>
                    <option value="Design Approved">Design Approved</option>
                    <option value="Posted">Posted</option>
                  </select>
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Topic *</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: "60px" }}
                  placeholder="Describe the graphic direction or topic for the designer..."
                  required
                  value={postForm.topic}
                  onChange={(e) =>
                    setPostForm({ ...postForm, topic: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Content</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: "80px" }}
                  placeholder="Write post content / caption..."
                  value={postForm.content}
                  onChange={(e) =>
                    setPostForm({ ...postForm, content: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Hashtags</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. #marketing #business #growth"
                  value={postForm.hashtags}
                  onChange={(e) =>
                    setPostForm({ ...postForm, hashtags: e.target.value })
                  }
                />
              </div>

              <div className="form-group">
                <label className="form-label">Visual / Reference link</label>
                <textarea
                  className="form-textarea"
                  style={{ minHeight: "60px" }}
                  placeholder="Provide reference links, target audience, or design notes..."
                  value={postForm.visual}
                  onChange={(e) =>
                    setPostForm({ ...postForm, visual: e.target.value })
                  }
                />
              </div>

              <div className="form-group" style={{ marginBottom: 0 }}>
                <label
                  className="form-label"
                  style={{ marginBottom: "0.5rem", display: "block" }}
                >
                  Target Channels
                </label>
                <div
                  style={{ display: "flex", flexWrap: "wrap", gap: "1.25rem" }}
                >
                  {[
                    "Instagram",
                    "Facebook",
                    "Youtube",
                    "LinkedIn",
                    "Twitter",
                  ].map((plat) => {
                    const isChecked = postForm.platforms.includes(plat);
                    return (
                      <label
                        key={plat}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.4rem",
                          cursor: "pointer",
                          fontSize: "0.85rem",
                          color: "var(--text-secondary)",
                          margin: 0,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            const updated = isChecked
                              ? postForm.platforms.filter((p) => p !== plat)
                              : [...postForm.platforms, plat];
                            setPostForm({ ...postForm, platforms: updated });
                          }}
                          style={{
                            cursor: "pointer",
                            width: "14px",
                            height: "14px",
                          }}
                        />
                        <span style={{ userSelect: "none" }}>{plat}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                  marginTop: "1rem",
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "1rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setIsAddPostModalOpen(false);
                    setCurrentPost(null);
                  }}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  {currentPost ? "Save Changes" : "Schedule Post"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Full Calendar Modal */}
      {isViewCalendarOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "1100px", width: "95%" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.75rem",
              }}
            >
              <h3 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                Monthly Calendar Planner
              </h3>
              <button
                onClick={() => setIsViewCalendarOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                flexWrap: "wrap",
                gap: "0.75rem",
                marginBottom: "1.5rem",
              }}
            >
              <div
                style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}
              >
                <span
                  style={{
                    fontSize: "0.85rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Filter Month:
                </span>
                <select
                  className="form-select"
                  value={calendarMonthFilter}
                  onChange={(e) => setCalendarMonthFilter(e.target.value)}
                  style={{
                    width: "auto",
                    minWidth: "180px",
                    padding: "0.4rem 0.75rem",
                  }}
                >
                  {getMonthsOptions().map((m) => (
                    <option key={m} value={m}>
                      {formatMonthDisplay(m)}
                    </option>
                  ))}
                </select>
              </div>
              <div style={{ display: "flex", gap: "0.5rem" }}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem" }}
                  onClick={openExportModal}
                >
                  Export CSV
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ padding: "0.45rem 0.85rem", fontSize: "0.8rem" }}
                  onClick={() => {
                    setCurrentPost(null);
                    const now = new Date();
                    const year = calendarMonthFilter
                      ? parseInt(calendarMonthFilter.split("-")[0])
                      : now.getFullYear();
                    const month = calendarMonthFilter
                      ? parseInt(calendarMonthFilter.split("-")[1])
                      : now.getMonth() + 1;
                    const defaultDate = new Date(
                      year,
                      month - 1,
                      now.getDate(),
                      12,
                      0,
                    );
                    const formattedDate = new Date(
                      defaultDate.getTime() -
                        defaultDate.getTimezoneOffset() * 60 * 1000,
                    )
                      .toISOString()
                      .substring(0, 16);
                    setPostForm({
                      scheduledDate: formattedDate,
                      postType: "Static",
                      topic: "",
                      content: "",
                      hashtags: "",
                      visual: "",
                      platforms: [],
                      status: "Pending",
                    });
                    setIsAddPostModalOpen(true);
                  }}
                >
                  <Plus size={14} style={{ marginRight: "3px" }} /> Schedule
                  Post
                </button>
              </div>
            </div>

            {(() => {
              if (!calendarMonthFilter) return null;
              const [yearStr, monthStr] = calendarMonthFilter.split("-");
              const year = parseInt(yearStr, 10);
              const month = parseInt(monthStr, 10) - 1;

              const numDays = new Date(year, month + 1, 0).getDate();
              const firstDayIndex = new Date(year, month, 1).getDay();

              const cells = [];
              for (let i = 0; i < firstDayIndex; i++) {
                cells.push({ day: null, date: null });
              }
              for (let day = 1; day <= numDays; day++) {
                const dateObj = new Date(year, month, day);
                cells.push({ day, date: dateObj });
              }
              while (cells.length % 7 !== 0) {
                cells.push({ day: null, date: null });
              }

              return (
                <div
                  style={{
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  {/* Weekday headers */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      gap: "1px",
                      background: "var(--border-color)",
                    }}
                  >
                    {["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"].map(
                      (d) => (
                        <div
                          key={d}
                          style={{
                            textAlign: "center",
                            padding: "0.5rem 0.25rem",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "var(--text-secondary)",
                            background: "var(--bg-secondary)",
                          }}
                        >
                          {d}
                        </div>
                      ),
                    )}
                  </div>

                  {/* Days grid */}
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(7, 1fr)",
                      gap: "1px",
                      background: "var(--border-color)",
                      maxHeight: "60vh",
                      overflowY: "auto",
                    }}
                  >
                    {cells.map((cell, idx) => {
                      if (!cell.day) {
                        return (
                          <div
                            key={`empty-${idx}`}
                            style={{
                              background: "rgba(255, 255, 255, 0.01)",
                              minHeight: "90px",
                            }}
                          />
                        );
                      }

                      const dayPosts = (project.contentCalendar || [])
                        .filter((post) => {
                          const postDate = new Date(post.scheduledDate);
                          return (
                            postDate.getFullYear() === year &&
                            postDate.getMonth() === month &&
                            postDate.getDate() === cell.day
                          );
                        })
                        .sort(
                          (a, b) =>
                            new Date(a.scheduledDate) -
                            new Date(b.scheduledDate),
                        );

                      return (
                        <div
                          key={`day-${cell.day}`}
                          style={{
                            background: "var(--bg-primary)",
                            minHeight: "90px",
                            padding: "0.35rem",
                            display: "flex",
                            flexDirection: "column",
                            gap: "4px",
                            position: "relative",
                            border: "1px solid rgba(255,255,255,0.01)",
                          }}
                        >
                          <div
                            style={{
                              display: "flex",
                              justifyContent: "space-between",
                              alignItems: "center",
                              marginBottom: "2px",
                            }}
                          >
                            <span
                              style={{
                                fontSize: "0.75rem",
                                fontWeight: 700,
                                color:
                                  dayPosts.length > 0
                                    ? "var(--accent-primary)"
                                    : "var(--text-secondary)",
                              }}
                            >
                              {cell.day}
                            </span>
                            <button
                              type="button"
                              style={{
                                background: "transparent",
                                border: "none",
                                cursor: "pointer",
                                color: "var(--text-muted)",
                                padding: "2px",
                                display: "inline-flex",
                                alignItems: "center",
                                justifyContent: "center",
                                opacity: 0.6,
                              }}
                              onClick={() => {
                                setCurrentPost(null);
                                const defaultDate = new Date(
                                  year,
                                  month,
                                  cell.day,
                                  12,
                                  0,
                                );
                                const formattedDate = new Date(
                                  defaultDate.getTime() -
                                    defaultDate.getTimezoneOffset() * 60 * 1000,
                                )
                                  .toISOString()
                                  .substring(0, 16);
                                setPostForm({
                                  scheduledDate: formattedDate,
                                  postType: "Static",
                                  topic: "",
                                  content: "",
                                  hashtags: "",
                                  visual: "",
                                  platforms: [],
                                  status: "Pending",
                                });
                                setIsAddPostModalOpen(true);
                              }}
                              title="Schedule Post"
                            >
                              <Plus size={11} />
                            </button>
                          </div>

                          <div
                            style={{
                              display: "flex",
                              flexDirection: "column",
                              gap: "4px",
                              flex: 1,
                              overflowY: "auto",
                            }}
                            className="custom-scrollbar"
                          >
                            {dayPosts.map((post) => {
                              const statusStyle = getStatusStyle(post.status);
                              const timeStr = new Date(post.scheduledDate)
                                .toLocaleTimeString("en-IN", {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                  hour12: true,
                                })
                                .toLowerCase();
                              return (
                                <div
                                  key={post._id}
                                  style={{
                                    fontSize: "0.65rem",
                                    fontWeight: 600,
                                    padding: "4px 6px",
                                    borderRadius: "4px",
                                    background: statusStyle.bg,
                                    color: statusStyle.color,
                                    border: `1px solid ${statusStyle.border}`,
                                    cursor: "pointer",
                                    whiteSpace: "normal",
                                    wordBreak: "break-word",
                                    display: "block",
                                    lineHeight: "1.2",
                                  }}
                                  onClick={() => {
                                    setCurrentPost(post);
                                    const localDate = new Date(
                                      post.scheduledDate,
                                    );
                                    const offset =
                                      localDate.getTimezoneOffset();
                                    const adjustedDate = new Date(
                                      localDate.getTime() - offset * 60 * 1000,
                                    );
                                    const formattedDate = adjustedDate
                                      .toISOString()
                                      .substring(0, 16);
                                    setPostForm({
                                      scheduledDate: formattedDate,
                                      postType: post.postType || "Static",
                                      topic: post.topic || post.ideation || "",
                                      content:
                                        post.content || post.caption || "",
                                      hashtags: post.hashtags || "",
                                      visual:
                                        post.visual || post.description || "",
                                      platforms: post.platforms || [],
                                      status: post.status || "Pending",
                                    });
                                    setIsAddPostModalOpen(true);
                                  }}
                                  title={`${timeStr} | ${post.postType || "Static"} | Topic: ${post.topic || post.ideation || "N/A"}`}
                                >
                                  {/* Small label for time and post type */}
                                  <div
                                    style={{
                                      display: "flex",
                                      justifyContent: "space-between",
                                      alignItems: "center",
                                      fontSize: "0.55rem",
                                      opacity: 0.85,
                                      marginBottom: "2px",
                                      borderBottom:
                                        "1px dashed rgba(0,0,0,0.05)",
                                      paddingBottom: "2px",
                                    }}
                                  >
                                    <span>{post.postType || "Static"}</span>
                                    <span>{timeStr}</span>
                                  </div>
                                  {/* Full wrapping text */}
                                  <div style={{ fontWeight: 600 }}>
                                    {post.topic || post.ideation || "Untitled"}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}
      {/* Export Date Range Modal */}
      {isExportModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "400px" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.75rem",
              }}
            >
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                Export Content Calendar
              </h3>
              <button
                onClick={() => setIsExportModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{ display: "flex", flexDirection: "column", gap: "1rem" }}
            >
              <div className="form-group">
                <label className="form-label">From Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={exportFromDate}
                  onChange={(e) => setExportFromDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label className="form-label">To Date</label>
                <input
                  type="date"
                  className="form-input"
                  value={exportToDate}
                  onChange={(e) => setExportToDate(e.target.value)}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                  marginTop: "1rem",
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "1rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsExportModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    handleExportCalendar(exportFromDate, exportToDate);
                    setIsExportModalOpen(false);
                  }}
                >
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Credential Modal */}
      {credModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "850px", width: "95%", padding: "1.5rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1rem",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.5rem",
              }}
            >
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, margin: 0 }}>
                {editingCredIndex !== null
                  ? "Edit Project Credential"
                  : "Add Project Credential"}
              </h3>
              <button
                onClick={() => setCredModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form
              onSubmit={handleSaveCredentialDirect}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
              }}
            >
              <div className="credential-form-grid">
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Credential Type *</label>
                  <select
                    className="form-input"
                    value={credForm.type}
                    onChange={(e) =>
                      setCredForm({ ...credForm, type: e.target.value })
                    }
                    required
                  >
                    <option value="Other">Other</option>
                    <option value="Hosting">Hosting</option>
                    <option value="Domain">Domain</option>
                    <option value="Development">Development</option>
                    <option value="SEO">SEO</option>
                    <option value="SMO">SMO</option>
                    <option value="Design">Design</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Label / Name *</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., CPanel, Registrar Account"
                    value={credForm.label}
                    onChange={(e) =>
                      setCredForm({ ...credForm, label: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Username</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Username or email"
                    value={credForm.username}
                    onChange={(e) =>
                      setCredForm({ ...credForm, username: e.target.value })
                    }
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Password</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Password"
                    value={credForm.password}
                    onChange={(e) =>
                      setCredForm({ ...credForm, password: e.target.value })
                    }
                  />
                </div>

                <div
                  className="form-group"
                  style={{ marginBottom: 0, gridColumn: "span 2" }}
                >
                  <label className="form-label">Login URL</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g., https://cpanel.domain.com"
                    value={credForm.loginUrl}
                    onChange={(e) =>
                      setCredForm({ ...credForm, loginUrl: e.target.value })
                    }
                  />
                </div>

                <div
                  className="form-group"
                  style={{ marginBottom: 0, gridColumn: "span 2" }}
                >
                  <label className="form-label">Notes</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: "70px", resize: "vertical" }}
                    placeholder="Any access notes or extra details..."
                    value={credForm.notes}
                    onChange={(e) =>
                      setCredForm({ ...credForm, notes: e.target.value })
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                  marginTop: "0.25rem",
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "0.75rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setCredModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updating}
                >
                  {updating ? "Saving..." : "Save Credential"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Share Credential Modal */}
      {shareModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "650px", width: "90%", padding: "1.5rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.75rem",
              }}
            >
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Share2 size={18} style={{ color: "var(--accent-primary)" }} />
                <span>Share Credentials</span>
              </h3>
              <button
                onClick={() => setShareModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {/* 1. Selection Header & List */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    SELECT CREDENTIALS TO SHARE ({selectedCreds.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAllCreds}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-primary)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {selectedCreds.length === (project.credentials || []).length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    maxHeight: "150px",
                    overflowY: "auto",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "0.75rem",
                    background: "rgba(255, 255, 255, 0.01)",
                  }}
                >
                  {(project.credentials || []).map((cred, index) => {
                    const isChecked = selectedCreds.includes(index);
                    return (
                      <label
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectCred(index)}
                          style={{ cursor: "pointer" }}
                        />
                        <span
                          style={{
                            fontWeight: 500,
                            color: "var(--text-primary)",
                          }}
                        >
                          {cred.type} - {cred.label || "Credentials"}
                        </span>
                        {cred.username && (
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.75rem",
                            }}
                          >
                            ({cred.username})
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 2. Recipient Selector */}
              <div>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  RECIPIENT TYPE
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    className={`btn ${shareRecipientType === "client" ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "0.5rem", fontSize: "0.8rem" }}
                    onClick={() => {
                      setShareRecipientType("client");
                      if (project.client) {
                        setSelectedRecipientId(project.client);
                      } else if (clients && clients.length > 0) {
                        setSelectedRecipientId(clients[0]._id);
                      } else {
                        setSelectedRecipientId("");
                      }
                    }}
                  >
                    Client
                  </button>
                  <button
                    type="button"
                    className={`btn ${shareRecipientType === "employee" ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "0.5rem", fontSize: "0.8rem" }}
                    onClick={() => {
                      setShareRecipientType("employee");
                      if (companyUsers && companyUsers.length > 0) {
                        setSelectedRecipientId(companyUsers[0].id);
                      } else {
                        setSelectedRecipientId("");
                      }
                    }}
                  >
                    Employee
                  </button>
                  <button
                    type="button"
                    className={`btn ${shareRecipientType === "custom" ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "0.5rem", fontSize: "0.8rem" }}
                    onClick={() => {
                      setShareRecipientType("custom");
                      setSelectedRecipientId("");
                    }}
                  >
                    Custom contact
                  </button>
                </div>
              </div>

              {/* 3. Recipient Fields */}
              <div
                style={{
                  borderTop: "1px dashed var(--border-color)",
                  paddingTop: "1rem",
                }}
              >
                {shareRecipientType === "client" && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Select Client</label>
                    <SearchableSelect
                      options={clients.map((c) => ({
                        value: c._id,
                        label: c.status === "Inactive" ? `${c.name} (Inactive)` : c.name,
                        sublabel: `${c.company ? `${c.company} • ` : ""}${c.email}${c.status === "Inactive" ? " (Inactive)" : ""}`,
                        searchText: `${c.name} ${c.company || ""} ${c.email} ${c.status || ""}`,
                      }))}
                      placeholder="Search and select client..."
                      value={selectedRecipientId}
                      onChange={(clientId) => setSelectedRecipientId(clientId)}
                    />
                    {selectedRecipientId && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {(() => {
                          const client = clients.find(
                            (c) => c._id === selectedRecipientId,
                          );
                          if (client) {
                            return (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.15rem",
                                }}
                              >
                                <span>📧 Email: {client.email}</span>
                                <span>
                                  📞 WhatsApp/Phone:{" "}
                                  {client.phone || client.whatsapp || "N/A"}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {shareRecipientType === "employee" && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Select Employee</label>
                    <SearchableSelect
                      options={companyUsers.map((u) => ({
                        value: u.id,
                        label: u.username || u.name,
                        sublabel: `${u.role || "Member"} • ${u.email || ""}`,
                        searchText: `${u.username || u.name || ""} ${u.email || ""} ${u.role || ""}`,
                      }))}
                      placeholder="Search and select employee..."
                      value={selectedRecipientId}
                      onChange={(empId) => setSelectedRecipientId(empId)}
                    />
                    {selectedRecipientId && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {(() => {
                          const emp = companyUsers.find(
                            (u) => u.id === selectedRecipientId,
                          );
                          if (emp) {
                            return (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.15rem",
                                }}
                              >
                                <span>📧 Email: {emp.email}</span>
                                <span>
                                  📞 WhatsApp/Phone:{" "}
                                  {emp.whatsapp || emp.phone || "N/A"}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {shareRecipientType === "custom" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        Phone Number / WhatsApp (with country code, e.g.
                        +919876543210)
                      </label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="e.g. +919876543210"
                        value={customPhone}
                        onChange={(e) => setCustomPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="recipient@example.com"
                        value={customEmail}
                        onChange={(e) => setCustomEmail(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "1rem",
                  marginTop: "0.5rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShareModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    background: "#25D366",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                  onClick={handleShareWhatsApp}
                >
                  <WhatsAppIcon size={14} />
                  <span>Send via WhatsApp</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                  onClick={handleShareEmail}
                >
                  <Mail size={14} />
                  <span>Send via Email</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Link Modal */}
      {linkModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "600px", width: "90%", padding: "1.5rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.75rem",
              }}
            >
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <span>
                  {editingLinkIndex !== null ? "Edit Link" : "Add Link"}
                </span>
              </h3>
              <button
                onClick={() => setLinkModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveLinkDirect}>
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                }}
              >
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">
                    Name (e.g. Website, Dev Site) *
                  </label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="e.g. Website, Dev Site"
                    value={linkForm.name}
                    onChange={(e) =>
                      setLinkForm({ ...linkForm, name: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Link (URL) *</label>
                  <div style={{ display: "flex", gap: "0.75rem" }}>
                    <input
                      type="text"
                      className="form-input"
                      style={{ flex: 1 }}
                      placeholder="e.g. https://www.example.com"
                      value={linkForm.url}
                      onChange={(e) =>
                        setLinkForm({ ...linkForm, url: e.target.value })
                      }
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-secondary"
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "0.35rem",
                        whiteSpace: "nowrap",
                        padding: "0 1rem",
                      }}
                      onClick={() => setIsUploadModalOpen(true)}
                    >
                      <ExternalLink size={14} />
                      <span>Get URL</span>
                    </button>
                  </div>
                </div>

                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label className="form-label">Note</label>
                  <textarea
                    className="form-input"
                    style={{ minHeight: "70px", resize: "vertical" }}
                    placeholder="Any description or extra details..."
                    value={linkForm.notes}
                    onChange={(e) =>
                      setLinkForm({ ...linkForm, notes: e.target.value })
                    }
                  />
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                  marginTop: "1.25rem",
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "0.75rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setLinkModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={updating}
                >
                  {updating ? "Saving..." : "Save Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Upload Platform Access Modal */}
      {isUploadModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsUploadModalOpen(false)}
        >
          <div
            className="modal-content animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: "440px",
              width: "90%",
              padding: "2rem",
              borderRadius: "16px",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.3)",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.5rem",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.85rem",
              }}
            >
              <h2
                style={{
                  fontSize: "1.2rem",
                  fontWeight: 700,
                  margin: 0,
                  color: "var(--text-primary)",
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                Access Uploading Platform
              </h2>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.5rem",
              }}
            >
              <div>
                <label
                  className="form-label"
                  style={{
                    fontWeight: 600,
                    marginBottom: "0.5rem",
                    color: "var(--text-secondary)",
                  }}
                >
                  Access Code
                </label>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: "var(--bg-secondary)",
                    border: "1.5px dashed var(--accent-primary)",
                    borderRadius: "12px",
                    padding: "0.75rem 1.25rem",
                    boxShadow: "inset 0 2px 4px rgba(0,0,0,0.02)",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "monospace",
                      fontWeight: 700,
                      fontSize: "1.25rem",
                      letterSpacing: "0.08em",
                      color: "var(--text-primary)",
                    }}
                  >
                    {uploadCode}
                  </span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{
                      padding: "0.4rem 0.85rem",
                      display: "flex",
                      alignItems: "center",
                      gap: "0.35rem",
                      fontSize: "0.78rem",
                      fontWeight: 600,
                      borderRadius: "8px",
                      border: "1px solid var(--border-color)",
                    }}
                    onClick={() => {
                      navigator.clipboard.writeText(uploadCode);
                      showToast("Access code copied to clipboard", "success");
                    }}
                  >
                    <Copy size={13} />
                    <span>Copy</span>
                  </button>
                </div>
              </div>

              <div
                style={{
                  fontSize: "0.82rem",
                  color: "var(--text-secondary)",
                  background: "var(--accent-primary-glow)",
                  padding: "0.85rem 1.15rem",
                  borderRadius: "10px",
                  borderLeft: "4px solid var(--accent-primary)",
                  lineHeight: "1.5",
                }}
              >
                <strong>Note:</strong> To access the site, copy the access code
                above.
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                  marginTop: "0.5rem",
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "1.25rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  style={{
                    borderRadius: "8px",
                    padding: "0.55rem 1.25rem",
                    fontWeight: 600,
                  }}
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  Cancel
                </button>
                <a
                  href="https://uploads.worklanceai.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-primary"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "0.35rem",
                    textDecoration: "none",
                    borderRadius: "8px",
                    padding: "0.55rem 1.25rem",
                    fontWeight: 600,
                  }}
                  onClick={() => setIsUploadModalOpen(false)}
                >
                  <span>Go to Site</span>
                  <ExternalLink size={14} />
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Links Modal */}
      {linkShareModalOpen && (
        <div className="modal-overlay">
          <div
            className="modal-content animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "650px", width: "90%", padding: "1.5rem" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.75rem",
              }}
            >
              <h3
                style={{
                  fontSize: "1.15rem",
                  fontWeight: 700,
                  margin: 0,
                  display: "flex",
                  alignItems: "center",
                  gap: "0.5rem",
                }}
              >
                <Share2 size={18} style={{ color: "var(--accent-primary)" }} />
                <span>Share Links</span>
              </h3>
              <button
                onClick={() => setLinkShareModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              {/* 1. Selection Header & List */}
              <div>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "0.5rem",
                  }}
                >
                  <span
                    style={{
                      fontSize: "0.8rem",
                      fontWeight: 600,
                      color: "var(--text-secondary)",
                    }}
                  >
                    SELECT LINKS TO SHARE ({selectedLinks.length})
                  </span>
                  <button
                    type="button"
                    onClick={handleToggleSelectAllLinks}
                    style={{
                      background: "none",
                      border: "none",
                      color: "var(--accent-primary)",
                      fontSize: "0.75rem",
                      fontWeight: 600,
                      cursor: "pointer",
                      padding: 0,
                    }}
                  >
                    {selectedLinks.length === (project.links || []).length
                      ? "Deselect All"
                      : "Select All"}
                  </button>
                </div>
                <div
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    gap: "0.5rem",
                    maxHeight: "150px",
                    overflowY: "auto",
                    border: "1px solid var(--border-color)",
                    borderRadius: "8px",
                    padding: "0.75rem",
                    background: "rgba(255, 255, 255, 0.01)",
                  }}
                >
                  {(project.links || []).map((lnk, index) => {
                    const isChecked = selectedLinks.includes(index);
                    return (
                      <label
                        key={index}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.5rem",
                          fontSize: "0.85rem",
                          cursor: "pointer",
                          userSelect: "none",
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelectLink(index)}
                          style={{ cursor: "pointer" }}
                        />
                        <span
                          style={{
                            fontWeight: 500,
                            color: "var(--text-primary)",
                          }}
                        >
                          {lnk.name}
                        </span>
                        {lnk.url && (
                          <span
                            style={{
                              color: "var(--text-muted)",
                              fontSize: "0.75rem",
                            }}
                          >
                            ({lnk.url})
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* 2. Recipient Selector */}
              <div>
                <span
                  style={{
                    fontSize: "0.8rem",
                    fontWeight: 600,
                    color: "var(--text-secondary)",
                    display: "block",
                    marginBottom: "0.5rem",
                  }}
                >
                  RECIPIENT TYPE
                </span>
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr 1fr",
                    gap: "0.5rem",
                  }}
                >
                  <button
                    type="button"
                    className={`btn ${linkShareRecipientType === "client" ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "0.5rem", fontSize: "0.8rem" }}
                    onClick={() => {
                      setLinkShareRecipientType("client");
                      if (project.client) {
                        setSelectedLinkRecipientId(project.client);
                      } else if (clients && clients.length > 0) {
                        setSelectedLinkRecipientId(clients[0]._id);
                      } else {
                        setSelectedLinkRecipientId("");
                      }
                    }}
                  >
                    Client
                  </button>
                  <button
                    type="button"
                    className={`btn ${linkShareRecipientType === "employee" ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "0.5rem", fontSize: "0.8rem" }}
                    onClick={() => {
                      setLinkShareRecipientType("employee");
                      if (companyUsers && companyUsers.length > 0) {
                        setSelectedLinkRecipientId(companyUsers[0].id);
                      } else {
                        setSelectedLinkRecipientId("");
                      }
                    }}
                  >
                    Employee
                  </button>
                  <button
                    type="button"
                    className={`btn ${linkShareRecipientType === "custom" ? "btn-primary" : "btn-secondary"}`}
                    style={{ padding: "0.5rem", fontSize: "0.8rem" }}
                    onClick={() => {
                      setLinkShareRecipientType("custom");
                      setSelectedLinkRecipientId("");
                    }}
                  >
                    Custom contact
                  </button>
                </div>
              </div>

              {/* 3. Recipient Fields */}
              <div
                style={{
                  borderTop: "1px dashed var(--border-color)",
                  paddingTop: "1rem",
                }}
              >
                {linkShareRecipientType === "client" && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Select Client</label>
                    <SearchableSelect
                      options={clients.map((c) => ({
                        value: c._id,
                        label: c.status === "Inactive" ? `${c.name} (Inactive)` : c.name,
                        sublabel: `${c.company ? `${c.company} • ` : ""}${c.email}${c.status === "Inactive" ? " (Inactive)" : ""}`,
                        searchText: `${c.name} ${c.company || ""} ${c.email} ${c.status || ""}`,
                      }))}
                      placeholder="Search and select client..."
                      value={selectedLinkRecipientId}
                      onChange={(clientId) =>
                        setSelectedLinkRecipientId(clientId)
                      }
                    />
                    {selectedLinkRecipientId && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {(() => {
                          const client = clients.find(
                            (c) => c._id === selectedLinkRecipientId,
                          );
                          if (client) {
                            return (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.15rem",
                                }}
                              >
                                <span>📧 Email: {client.email}</span>
                                <span>
                                  📞 WhatsApp/Phone:{" "}
                                  {client.phone || client.whatsapp || "N/A"}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {linkShareRecipientType === "employee" && (
                  <div className="form-group" style={{ marginBottom: 0 }}>
                    <label className="form-label">Select Employee</label>
                    <SearchableSelect
                      options={companyUsers.map((u) => ({
                        value: u.id,
                        label: u.username || u.name,
                        sublabel: `${u.role || "Member"} • ${u.email || ""}`,
                        searchText: `${u.username || u.name || ""} ${u.email || ""} ${u.role || ""}`,
                      }))}
                      placeholder="Search and select employee..."
                      value={selectedLinkRecipientId}
                      onChange={(empId) => setSelectedLinkRecipientId(empId)}
                    />
                    {selectedLinkRecipientId && (
                      <div
                        style={{
                          marginTop: "0.5rem",
                          fontSize: "0.8rem",
                          color: "var(--text-muted)",
                        }}
                      >
                        {(() => {
                          const emp = companyUsers.find(
                            (u) => u.id === selectedLinkRecipientId,
                          );
                          if (emp) {
                            return (
                              <div
                                style={{
                                  display: "flex",
                                  flexDirection: "column",
                                  gap: "0.15rem",
                                }}
                              >
                                <span>📧 Email: {emp.email}</span>
                                <span>
                                  📞 WhatsApp/Phone:{" "}
                                  {emp.whatsapp || emp.phone || "N/A"}
                                </span>
                              </div>
                            );
                          }
                          return null;
                        })()}
                      </div>
                    )}
                  </div>
                )}

                {linkShareRecipientType === "custom" && (
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "0.75rem",
                    }}
                  >
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">
                        Phone Number / WhatsApp (with country code, e.g.
                        +919876543210)
                      </label>
                      <input
                        type="tel"
                        className="form-input"
                        placeholder="e.g. +919876543210"
                        value={customLinkPhone}
                        onChange={(e) => setCustomLinkPhone(e.target.value)}
                      />
                    </div>
                    <div className="form-group" style={{ marginBottom: 0 }}>
                      <label className="form-label">Email Address</label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="recipient@example.com"
                        value={customLinkEmail}
                        onChange={(e) => setCustomLinkEmail(e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* 4. Action Buttons */}
              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "1rem",
                  marginTop: "0.5rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setLinkShareModalOpen(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{
                    background: "#25D366",
                    color: "#fff",
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                  onClick={handleShareLinksWhatsApp}
                >
                  <WhatsAppIcon size={14} />
                  <span>Send via WhatsApp</span>
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "0.35rem",
                  }}
                  onClick={handleShareLinksEmail}
                >
                  <Mail size={14} />
                  <span>Send via Email</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Assign Members Modal */}
      {isAssignModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsAssignModalOpen(false)}
        >
          <div
            className="modal-content animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "480px", width: "90%" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.75rem",
              }}
            >
              <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0 }}>
                Assign Team Members
              </h2>
              <button
                onClick={() => setIsAssignModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "1rem",
              }}
            >
              Select one or more team members to assign to this project.
              Employees will see this project in their dashboard.
            </p>

            <div
              style={{
                maxHeight: "320px",
                overflowY: "auto",
                display: "flex",
                flexDirection: "column",
                gap: "0.4rem",
                marginBottom: "1.25rem",
              }}
            >
              {companyUsers.filter((u) => u.role !== "company_admin").length ===
              0 ? (
                <p
                  style={{
                    textAlign: "center",
                    color: "var(--text-muted)",
                    fontSize: "0.85rem",
                    padding: "2rem 0",
                  }}
                >
                  No team members found
                </p>
              ) : (
                companyUsers
                  .filter((u) => u.role !== "company_admin")
                  .map((user) => {
                    const isChecked = selectedEmployeeIds.includes(user.id);
                    const name = user.username;
                    const initials = name.substring(0, 2).toUpperCase();
                    let hash = 0;
                    for (let i = 0; i < name.length; i++) {
                      hash = name.charCodeAt(i) + ((hash << 5) - hash);
                    }
                    const hue = Math.abs(hash % 360);
                    return (
                      <label
                        key={user.id}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "0.75rem",
                          padding: "0.65rem 0.85rem",
                          borderRadius: "8px",
                          cursor: "pointer",
                          background: isChecked
                            ? "rgba(0, 174, 239, 0.08)"
                            : "var(--bg-primary)",
                          border: `1px solid ${isChecked ? "var(--accent-primary)" : "var(--border-color)"}`,
                          transition: "all 0.15s ease",
                          margin: 0,
                        }}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            setSelectedEmployeeIds((prev) =>
                              prev.includes(user.id)
                                ? prev.filter((id) => id !== user.id)
                                : [...prev, user.id],
                            );
                          }}
                          style={{
                            width: "16px",
                            height: "16px",
                            cursor: "pointer",
                          }}
                        />
                        <div
                          style={{
                            width: "32px",
                            height: "32px",
                            borderRadius: "50%",
                            background: `hsl(${hue}, 65%, 45%)`,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            fontSize: "0.75rem",
                            fontWeight: 700,
                            color: "#fff",
                            flexShrink: 0,
                          }}
                        >
                          {initials}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              fontSize: "0.88rem",
                              color: "var(--text-primary)",
                            }}
                          >
                            {user.username}
                          </div>
                          {user.email && (
                            <div
                              style={{
                                fontSize: "0.75rem",
                                color: "var(--text-muted)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {user.email}
                            </div>
                          )}
                        </div>
                        {isChecked && (
                          <Check
                            size={16}
                            style={{
                              color: "var(--accent-primary)",
                              flexShrink: 0,
                            }}
                          />
                        )}
                      </label>
                    );
                  })
              )}
            </div>

            <div
              style={{
                display: "flex",
                gap: "0.75rem",
                justifyContent: "flex-end",
              }}
            >
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsAssignModalOpen(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveAssignment}
                disabled={savingAssignment}
              >
                {savingAssignment
                  ? "Saving..."
                  : `Save (${selectedEmployeeIds.length} selected)`}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Create Task Modal */}
      {isAddTaskModalOpen && (
        <div
          className="modal-overlay"
          onClick={() => setIsAddTaskModalOpen(false)}
        >
          <div
            className="modal-content animate-fade-in"
            onClick={(e) => e.stopPropagation()}
            style={{ maxWidth: "520px", width: "90%" }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: "1.25rem",
                borderBottom: "1px solid var(--border-color)",
                paddingBottom: "0.75rem",
              }}
            >
              <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
                Create Task
              </h2>
              <button
                onClick={() => setIsAddTaskModalOpen(false)}
                style={{
                  background: "none",
                  border: "none",
                  color: "var(--text-secondary)",
                  cursor: "pointer",
                  padding: 0,
                }}
              >
                <X size={20} />
              </button>
            </div>

            <p
              style={{
                fontSize: "0.85rem",
                color: "var(--text-secondary)",
                marginBottom: "1.25rem",
              }}
            >
              Add a personal task or assign it to a teammate.
            </p>

            <form
              onSubmit={handleAddTask}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "1.25rem",
              }}
            >
              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Title *
                </label>
                <input
                  type="text"
                  className="form-input"
                  required
                  placeholder="What needs to be done?"
                  value={taskForm.name}
                  onChange={(e) =>
                    setTaskForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                />
              </div>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1.2fr",
                  gap: "1rem",
                }}
              >
                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Priority
                  </label>
                  <select
                    className="form-select"
                    value={taskForm.priority}
                    onChange={(e) =>
                      setTaskForm((prev) => ({
                        ...prev,
                        priority: e.target.value,
                      }))
                    }
                  >
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label" style={{ fontWeight: 600 }}>
                    Due Date / Reminder
                  </label>
                  <input
                    type="date"
                    className="form-input"
                    value={taskForm.dueDate}
                    onChange={(e) =>
                      setTaskForm((prev) => ({
                        ...prev,
                        dueDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Assign To (optional)
                </label>
                <select
                  className="form-select"
                  value={taskForm.assignedTo}
                  onChange={(e) =>
                    setTaskForm((prev) => ({
                      ...prev,
                      assignedTo: e.target.value,
                    }))
                  }
                >
                  <option value="">Add assignees...</option>
                  {assignableUsers.map((u) => (
                    <option key={u.id} value={u.username}>
                      {u.username}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label" style={{ fontWeight: 600 }}>
                  Notes (optional)
                </label>
                <textarea
                  className="form-textarea"
                  placeholder="Add details... type @ to mention a teammate"
                  rows={4}
                  value={taskForm.notes}
                  onChange={(e) =>
                    setTaskForm((prev) => ({ ...prev, notes: e.target.value }))
                  }
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "0.75rem",
                  justifyContent: "flex-end",
                  marginTop: "1rem",
                  borderTop: "1px solid var(--border-color)",
                  paddingTop: "1rem",
                }}
              >
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setIsAddTaskModalOpen(false)}
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
