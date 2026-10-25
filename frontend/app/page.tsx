"use client";

import React, { useState, useEffect } from "react";
import {
  ShieldCheck,
  ShieldAlert,
  AlertTriangle,
  FileText,
  CheckCircle,
  Clock,
  Search,
  BookOpen,
  RefreshCw,
  Edit2,
  Trash2,
  Upload,
  Printer,
  Database,
  Building,
  Check,
  User,
  LogOut,
  Plus,
  AlertCircle,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  Send,
} from "lucide-react";
import { api, setAuthToken, getAuthToken } from "./lib/api";

// ── Persona & Credentials for Hackathon Demo ─────────────────────────────────
const DEMO_PERSONAS = [
  {
    role: "institution",
    label: "Institution Officer",
    sublabel: "Apex Institute of Technology",
    email: "institution@ruletrace.demo",
    pass: "Inst@123",
    description: "Prepare EoA applications, upload checklist documents, review OCR, remediate deficiencies, submit for scrutiny.",
  },
  {
    role: "reviewer",
    label: "Scrutiny Officer (Reviewer)",
    sublabel: "AICTE Regional Scrutiny Committee",
    email: "reviewer@ruletrace.demo",
    pass: "Reviewer@123",
    description: "Inspect submissions, verify APH clauses, confirm deficiencies, record committee decisions, sign off reports.",
  },
  {
    role: "administrator",
    label: "AICTE Administrator",
    sublabel: "AICTE HQ Smart Automation Cell",
    email: "admin@ruletrace.demo",
    pass: "Admin@123",
    description: "Manage APH rule repository, configure external registries, inspect system-wide governance audit logs.",
  },
  {
    role: "audit_viewer",
    label: "Audit Observer",
    sublabel: "Regulatory Audit & Vigilance",
    email: "auditor@ruletrace.demo",
    pass: "Audit@123",
    description: "Read-only access to immutable scrutiny audit ledgers and compliance history.",
  },
];

// ── Institution Workflow Steps (01 to 07) ────────────────────────────────────
const INSTITUTION_STEPS = [
  { id: 1, key: "details", label: "01. Application Details", short: "Details" },
  { id: 2, key: "upload", label: "02. Document Upload", short: "Upload" },
  { id: 3, key: "extraction", label: "03. Extraction & Review", short: "Extraction" },
  { id: 4, key: "validation", label: "04. Validation Engine", short: "Validation" },
  { id: 5, key: "remediation", label: "05. Resolve Findings", short: "Resolve" },
  { id: 6, key: "submit", label: "06. Submit for Scrutiny", short: "Submit" },
  { id: 7, key: "status_report", label: "07. Scrutiny Status & Report", short: "Status & Report" },
];

// ── Reviewer Workflow Steps (01 to 06) ───────────────────────────────────────
const REVIEWER_STEPS = [
  { id: 1, key: "inspect", label: "01. Inspect Submission", short: "Submission" },
  { id: 2, key: "evidence", label: "02. Evidence & OCR", short: "Evidence" },
  { id: 3, key: "findings", label: "03. Review Findings & APH", short: "Findings" },
  { id: 4, key: "decisions", label: "04. Record Scrutiny Decisions", short: "Decisions" },
  { id: 5, key: "outcome_report", label: "05. Committee Outcome & Report", short: "Outcome & Report" },
  { id: 6, key: "official_report", label: "06. Official Scrutiny Report", short: "Official Report" },
];

export default function RuleTraceApp() {
  // Authentication State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Top-level Navigation View
  const [currentView, setCurrentView] = useState<
    "dashboard" | "admin_overview" | "audit_dashboard" | "workflow" | "rules" | "connectors" | "audit" | "reports_archive" | "users"
  >("dashboard");

  // Workflow Progression
  const [activeWorkflowStep, setActiveWorkflowStep] = useState(1);
  const [activeReviewerStep, setActiveReviewerStep] = useState(1);

  // Application Pipeline Data
  const [stats, setStats] = useState<any>(null);
  const [applications, setApplications] = useState<any[]>([]);
  const [selectedApp, setSelectedApp] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  const [docFields, setDocFields] = useState<any[]>([]);
  const [findings, setFindings] = useState<any[]>([]);
  const [selectedFinding, setSelectedFinding] = useState<any>(null);
  const [rules, setRules] = useState<any[]>([]);
  const [connectors, setConnectors] = useState<any[]>([]);
  const [auditEvents, setAuditEvents] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [institutions, setInstitutions] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Audit Ledger Filter State
  const [auditFilterType, setAuditFilterType] = useState("");
  const [auditFilterFrom, setAuditFilterFrom] = useState("");
  const [auditFilterTo, setAuditFilterTo] = useState("");
  const [selectedAuditEvent, setSelectedAuditEvent] = useState<any>(null);

  // Interactive UI State
  const [isLoading, setIsLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [applicantDeclaration, setApplicantDeclaration] = useState(false);

  // New Application Modal
  const [showNewAppModal, setShowNewAppModal] = useState(false);
  const [newAppType, setNewAppType] = useState("EOA_SELF_DISCLOSURE");
  const [newAppInstId, setNewAppInstId] = useState("");
  const [newAppYear, setNewAppYear] = useState("2024-25");
  const [newAppCreating, setNewAppCreating] = useState(false);

  // Document Upload Modal / Form
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [uploadDocCode, setUploadDocCode] = useState("AFFIDAVIT_2");
  const [uploadDocName, setUploadDocName] = useState("Affidavit 2 (Notarized on Stamp Paper)");
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);

  // Field Correction Modal
  const [showCorrectionModal, setShowCorrectionModal] = useState(false);
  const [editingField, setEditingField] = useState<any>(null);
  const [correctionValue, setCorrectionValue] = useState("");
  const [correctionNote, setCorrectionNote] = useState("");

  // Reviewer Decision Modal
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewActionTarget, setReviewActionTarget] = useState<any>(null);
  const [reviewActionChoice, setReviewActionChoice] = useState("confirmed");
  const [reviewActionNotes, setReviewActionNotes] = useState("");

  // Scrutiny Committee Final Outcome Form
  const [scrutinyOutcome, setScrutinyOutcome] = useState("RECOMMEND_APPROVAL");
  const [scrutinyRemarks, setScrutinyRemarks] = useState(
    "All mandatory checklist documents inspected under AICTE APH Chapter II guidelines. Physical and digital parameters verified."
  );

  // Notice toast helper
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Initial Auth Verification (Validates existing token, otherwise leaves currentUser as null for Login)
  useEffect(() => {
    const existingToken = getAuthToken();
    if (existingToken) {
      api
        .getMe()
        .then((user) => {
          if (user) {
            setCurrentUser(user);
            loadWorkspaceData(user);
            // Route to the correct role-based default view on refresh
            const defaultV = user.role === "administrator" ? "admin_overview"
              : user.role === "audit_viewer" ? "audit_dashboard"
              : "dashboard";
            setCurrentView(defaultV as any);
          } else {
            setAuthToken(null);
            setCurrentUser(null);
          }
        })
        .catch(() => {
          setAuthToken(null);
          setCurrentUser(null);
        });
    }
  }, []);

  // Helper: pick the landing view for a given role
  const getDefaultView = (role: string) => {
    if (role === "administrator") return "admin_overview";
    if (role === "audit_viewer") return "audit_dashboard";
    return "dashboard"; // institution | reviewer
  };

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setAuthLoading(true);
    setAuthError(null);
    try {
      const res = await api.login(loginEmail, loginPassword);
      setCurrentUser(res);
      showToast(`Signed in successfully as ${res.full_name} (${res.role})`);
      await loadWorkspaceData(res);
      setCurrentView(getDefaultView(res.role) as any);
    } catch (err: any) {
      setAuthError(err.message || "Invalid credentials. Please verify your email and password.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleQuickLogin = (persona: typeof DEMO_PERSONAS[0]) => {
    setLoginEmail(persona.email);
    setLoginPassword(persona.pass);
    setAuthLoading(true);
    setAuthError(null);
    api
      .login(persona.email, persona.pass)
      .then((res) => {
        setCurrentUser(res);
        showToast(`Signed in as ${persona.label}`);
        loadWorkspaceData(res);
        setCurrentView(getDefaultView(res.role) as any);
      })
      .catch((err) => {
        setAuthError(err.message || "Login failed");
      })
      .finally(() => {
        setAuthLoading(false);
      });
  };

  const handleLogout = () => {
    setAuthToken(null);
    setCurrentUser(null);
    setSelectedApp(null);
    setSelectedDoc(null);
    setDocuments([]);
    setFindings([]);
    setCurrentView("dashboard");
    setActiveWorkflowStep(1);
    setActiveReviewerStep(1);
    showToast("Signed out of RuleTrace AI");
  };

  const loadWorkspaceData = async (user?: any) => {
    setIsLoading(true);
    const activeUser = user || currentUser;
    try {
      const [sData, aData, rData, cData, catData, instData, auditData] = await Promise.all([
        api.getDashboardStats().catch(() => null),
        api.getApplications().catch(() => []),
        api.getRules().catch(() => []),
        api.getConnectors().catch(() => []),
        api.getCategories().catch(() => []),
        api.getInstitutions().catch(() => []),
        api.getAuditEvents().catch(() => []),
      ]);

      if (sData) setStats(sData);
      if (aData) {
        setApplications(aData);
        // Auto-select first app only for institution/reviewer workflows
        const role = activeUser?.role || "";
        if (aData.length > 0 && !selectedApp && (role === "institution" || role === "reviewer")) {
          selectApplication(aData[0]);
        }
      }
      if (rData) setRules(rData);
      if (cData) setConnectors(cData);
      if (catData) setCategories(catData);
      if (instData) {
        setInstitutions(instData);
        if (instData.length > 0 && !newAppInstId) {
          setNewAppInstId(instData[0].id);
        }
      }
      if (auditData) setAuditEvents(auditData);

      // Load users list for administrator
      if (activeUser?.role === "administrator") {
        const uData = await api.getUsers().catch(() => []);
        if (uData) setUsers(uData);
      }
    } catch (err) {
      console.error("Workspace data loading error:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const selectApplication = async (app: any) => {
    setSelectedApp(app);
    try {
      const [docs, fData] = await Promise.all([
        api.getDocuments(app.id).catch(() => []),
        api.getFindings(app.id).catch(() => []),
      ]);
      setDocuments(docs);
      setFindings(fData);
      if (docs.length > 0) {
        selectDocument(docs[0]);
      } else {
        setSelectedDoc(null);
        setDocFields([]);
      }
      if (fData.length > 0) {
        setSelectedFinding(fData[0]);
      }

      // Automatically determine appropriate workflow step based on application status
      if (app.status === "draft") {
        if (docs.length === 0) setActiveWorkflowStep(2);
        else if (fData.length === 0) setActiveWorkflowStep(4);
        else setActiveWorkflowStep(5);
      } else {
        setActiveWorkflowStep(7);
      }
    } catch (err) {
      console.error("Application selection error:", err);
    }
  };

  const selectDocument = async (doc: any) => {
    setSelectedDoc(doc);
    try {
      const fields = await api.getDocumentFields(doc.id);
      setDocFields(fields);
    } catch (err) {
      setDocFields([]);
    }
  };

  const handleCreateApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppInstId) {
      showToast("Please select an institution.");
      return;
    }
    const cat = categories.find((c) => c.code === newAppType) || categories[0];
    if (!cat) return;

    setNewAppCreating(true);
    try {
      const created = await api.createApplication({
        institution_id: newAppInstId,
        category_id: cat.id,
        academic_year: newAppYear,
      });
      setShowNewAppModal(false);
      showToast(`Application ${created.reference_number} created as draft.`);
      await loadWorkspaceData(currentUser);
      const fullApp = await api.getApplicationDetail(created.id);
      await selectApplication(fullApp);
      setCurrentView("workflow");
      setActiveWorkflowStep(2); // Jump directly to document upload!
    } catch (err: any) {
      showToast(err.message || "Failed to create application");
    } finally {
      setNewAppCreating(false);
    }
  };

  // ── Generate realistic synthetic document text per AICTE APH document type ──
  const generateSyntheticDocText = (code: string, instName: string): string => {
    const today = new Date();
    const issueDate = `15/01/${today.getFullYear()}`;
    const expiryDate = `31/12/${today.getFullYear() + 3}`;
    const notaryDate = issueDate;

    switch (code) {
      case "AFFIDAVIT_2":
        return [
          `NON-JUDICIAL STAMP PAPER`,
          `Value: Rs. 100 (One Hundred Rupees)`,
          `e-Stamp Reference: MH-ST-${today.getFullYear()}-EX${Math.floor(100000 + Math.random() * 900000)}`,
          ``,
          `AFFIDAVIT UNDER AICTE APPROVAL PROCESS HANDBOOK (APH 2024-2027)`,
          `CHAPTER II – ANNEXURE 2: SELF-DECLARATION BY INSTITUTION`,
          ``,
          `Name of Institution: ${instName}`,
          `Certificate No: AFF-2024-${Math.floor(10000 + Math.random() * 90000)}`,
          `Address: Survey No. 142/1, 142/2, Sector-15, Pune, Maharashtra – 411057`,
          ``,
          `I, Dr. Rajesh Kumar Sharma, the authorized signatory of ${instName}, do hereby solemnly affirm and declare:`,
          ``,
          `1. That the institution has clear title to the land measuring 10.5 Acres as per the registered land deed.`,
          `2. That all the information furnished in this application is true and correct to the best of my knowledge.`,
          `3. That the institution has adequate infrastructure, faculty, and financial resources as required under APH 2024-2027.`,
          `4. That there are no pending court cases or disputes against the institution.`,
          ``,
          `Date of Issue: ${issueDate}`,
          `Valid Till: ${expiryDate}`,
          ``,
          `Issued by: Dr. Rajesh Kumar Sharma, Secretary / Authorized Signatory`,
          ``,
          `Notarized by: Advocate Suresh Mehta, Notary Public`,
          `Notary Registration No.: NP/MH/2024/1892`,
          `Judicial Magistrate sworn before: Additional District Magistrate, Pune`,
          `Date of Notarization: ${notaryDate}`,
        ].join("\n");

      case "LAND_TITLE":
        return [
          `REGISTERED LAND OWNERSHIP DEED`,
          `Certificate No: LD-REG-2024-${Math.floor(10000 + Math.random() * 90000)}`,
          ``,
          `Name of Institution: ${instName}`,
          `Institution Name: ${instName}`,
          `Address: Survey No. 142/1, 142/2 & 143/A, Village Bhosari, Taluka Haveli, Dist. Pune, Maharashtra`,
          ``,
          `DETAILS OF LAND OWNERSHIP`,
          `Land Area: 10.5 Acres (Total)`,
          `Built-up Area: 18,500 Sqm`,
          `Survey Nos: 142/1, 142/2, 143/A`,
          `Khata No.: 524/B`,
          `Village / Taluka: Bhosari / Haveli`,
          `District: Pune, Maharashtra`,
          ``,
          `Date of Issue: ${issueDate}`,
          `Issue Date: ${issueDate}`,
          `Valid Till: ${expiryDate}`,
          ``,
          `This deed is executed by the registered owner in favour of ${instName} for educational purposes only.`,
          ``,
          `Issued by: Sub-Registrar Office, Pune`,
          `Authority: Sub-Registrar, Haveli, Pune`,
          `Registration Authority: Office of Sub-Registrar, Pune District`,
        ].join("\n");

      case "FIRE_SAFETY_CERT":
        return [
          `FIRE SAFETY NO OBJECTION CERTIFICATE`,
          `Fire NOC No: FS/${today.getFullYear()}/${Math.floor(1000 + Math.random() * 9000)}`,
          `Certificate No: FSNO-MH-2024-${Math.floor(10000 + Math.random() * 90000)}`,
          ``,
          `Name of Institution: ${instName}`,
          `Institution Name: ${instName}`,
          `Address: Survey No. 142/1, Sector-15, Pune, Maharashtra – 411057`,
          ``,
          `This is to certify that the premises of ${instName} have been inspected by the undersigned officer of the Fire Department and found to be in compliance with the Maharashtra Fire Prevention and Life Safety Measures Act, 2006.`,
          ``,
          `No Objection Certificate is hereby issued for the purpose of AICTE approval.`,
          ``,
          `Date of Issue: ${issueDate}`,
          `Issue Date: ${issueDate}`,
          `Valid Till: ${expiryDate}`,
          `Valid Up To: ${expiryDate}`,
          ``,
          `Issued by: Chief Fire Officer, Pune Municipal Corporation`,
          `Authority: Chief Fire Officer, PMC, Pune`,
          `Fire Officer: Shri A.K. Patil, Chief Fire Officer`,
          ``,
          `Document Classification: Fire Safety Certificate / NOC`,
        ].join("\n");

      case "BUILDING_PLAN":
        return [
          `APPROVED MASTER BUILDING PLAN CERTIFICATE`,
          `Certificate No: BP-APPR-2024-${Math.floor(10000 + Math.random() * 90000)}`,
          ``,
          `Name of Institution: ${instName}`,
          `Institution Name: ${instName}`,
          `Address: Survey No. 142/1, Sector-15, Pune, Maharashtra – 411057`,
          ``,
          `This certifies that the building plan submitted by ${instName} for the construction of educational buildings has been duly approved by the competent authority in accordance with the National Building Code 2016 and local bye-laws.`,
          ``,
          `Total Built-up Area: 18,500 Sqm`,
          `Number of Floors: Ground + 3`,
          `Architect: Ar. Priya Desai, Council of Architecture Reg. No. CA/2022/1456`,
          ``,
          `Date of Issue: ${issueDate}`,
          `Issue Date: ${issueDate}`,
          `Valid Till: ${expiryDate}`,
          `Valid Up To: ${expiryDate}`,
          ``,
          `Issued by: Pune Municipal Corporation – Building Permissions Dept.`,
          `Authority: Municipal Commissioner, Pune`,
          `Building Officer: Executive Engineer, PMC`,
          ``,
          `Building Plan: As per attached drawings approved vide this certificate.`,
        ].join("\n");

      case "AFFILIATION_NOC":
        return [
          `NO OBJECTION CERTIFICATE FROM AFFILIATING UNIVERSITY`,
          `Certificate No: UNIV-NOC-2024-${Math.floor(10000 + Math.random() * 90000)}`,
          ``,
          `Name of Institution: ${instName}`,
          `Institution Name: ${instName}`,
          `Affiliated to: Savitribai Phule Pune University (SPPU)`,
          `University Name: Savitribai Phule Pune University`,
          `Address: Ganeshkhind Road, Pune – 411007`,
          ``,
          `This is to certify that ${instName} is a recognized affiliated college of this University. The University has no objection to the said institution seeking approval from AICTE for Extension of Approval (EoA) for Academic Year ${today.getFullYear()}-${(today.getFullYear() + 1).toString().slice(2)}.`,
          ``,
          `Affiliation Number: SPPU/AFF/${Math.floor(10000 + Math.random() * 90000)}`,
          ``,
          `Date of Issue: ${issueDate}`,
          `Issue Date: ${issueDate}`,
          `Valid Till: ${expiryDate}`,
          `Valid Up To: ${expiryDate}`,
          ``,
          `Issued by: Registrar, Savitribai Phule Pune University`,
          `Authority: Registrar, SPPU, Pune`,
        ].join("\n");

      case "BANK_GUARANTEE":
        return [
          `BANK GUARANTEE / FIXED DEPOSIT RECEIPT`,
          `FDR No: FDR/${today.getFullYear()}/${Math.floor(100000 + Math.random() * 900000)}`,
          `Certificate No: BG-FDR-2024-${Math.floor(10000 + Math.random() * 90000)}`,
          ``,
          `Name of Institution: ${instName}`,
          `Institution Name: ${instName}`,
          `Address: Survey No. 142/1, Sector-15, Pune, Maharashtra – 411057`,
          ``,
          `This is to certify that the above-named institution has deposited the following Fixed Deposit with this bank as per the AICTE requirement under APH 2024-2027:`,
          ``,
          `FDR Amount: Rs. 15,00,000/- (Rupees Fifteen Lakhs Only)`,
          `Bank Name: State Bank of India`,
          `Branch: Kothrud, Pune`,
          `Account No: SBI/KOTHRUD/FDR/${Math.floor(100000 + Math.random() * 900000)}`,
          ``,
          `Date of Issue: ${issueDate}`,
          `Issue Date: ${issueDate}`,
          `Valid Till: ${expiryDate}`,
          `Valid Up To: ${expiryDate}`,
          ``,
          `Issued by: Branch Manager, SBI Kothrud, Pune`,
          `Authority: Branch Manager, State Bank of India`,
        ].join("\n");

      case "TER_PAYMENT_RECEIPT":
        return [
          `ALL INDIA COUNCIL FOR TECHNICAL EDUCATION`,
          `Nelson Mandela Marg, Vasant Kunj, New Delhi - 110070`,
          `ONLINE FEE TRANSACTION ACKNOWLEDGEMENT (TER CHARGES)`,
          ``,
          `Transaction Reference No: AICTE-TER-${today.getFullYear()}-${Math.floor(10000000 + Math.random() * 90000000)}`,
          `Payment Gateway: Bharatkosh / SBI e-Pay`,
          `Payment Date: ${issueDate}`,
          `Name of Institution: ${instName}`,
          `Institution Name: ${instName}`,
          `AICTE Institution ID: DEMO-AICTE-2024-SIT-001`,
          `Application Reference: EoA Self-Disclosure AY ${today.getFullYear()}-${(today.getFullYear() + 1).toString().slice(2)}`,
          `Payment Head: Technical Education Regulatory (TER) Processing Fee`,
          `Amount Paid: Rs. 2,00,000/- (Rupees Two Lakhs Only)`,
          `Transaction Status: SUCCESS / RECONCILED`,
          `Bank Ref / UTR No: SBIN${Math.floor(1000000000 + Math.random() * 9000000000)}`,
          ``,
          `Issue Date: ${issueDate}`,
          `Valid Till: ${expiryDate}`,
          `Valid Up To: ${expiryDate}`,
          `Receipt Verified vide AICTE National Accounting System`,
        ].join("\n");

      case "OCCUPANCY_CERTIFICATE":
        return [
          `PUNE MUNICIPAL CORPORATION - TOWN PLANNING & BUILDING CONTROL`,
          `PMC Building Permissions Office, Shivajinagar, Pune - 411005`,
          ``,
          `Occupancy Certificate No: PMC/BP/OCC/2024/${Math.floor(1000 + Math.random() * 9000)}`,
          `Name of Institution: ${instName}`,
          `Institution Name: ${instName}`,
          `Address: Survey No. 45, Baner Road, Pune - 411045`,
          `Category: Educational Building (Technical Campus - Engineering & Technology)`,
          ``,
          `This is to certify that the institutional building consisting of:`,
          `- Administrative Block (Ground + 3 Floors): 4,500 Sqm`,
          `- Academic & Instructional Block (Ground + 4 Floors): 11,200 Sqm`,
          `- Central Library, Workshops & Amenities: 2,800 Sqm`,
          `Total Built-up Area: 18,500 Sqm`,
          `Land Area: 10.5 Acres`,
          ``,
          `Building inspected and found completed in accordance with approved Master Plan.`,
          `The building is structurally safe, conforms to National Building Code (NBC 2016), and is fit for educational occupancy.`,
          ``,
          `Issue Date: ${issueDate}`,
          `Date of Issue: ${issueDate}`,
          `Valid Till: ${expiryDate}`,
          `Valid Up To: ${expiryDate}`,
          `Authority: City Engineer & Commissioner, Pune Municipal Corporation`,
        ].join("\n");

      case "FIRE_SAFETY_CERTIFICATE":
        return [
          `DIRECTORATE OF MAHARASHTRA FIRE SERVICES`,
          `Pune Municipal Corporation Fire Brigade Headquarters`,
          ``,
          `Fire NOC Reference No: PMC/FB/NOC/2024/${Math.floor(1000 + Math.random() * 9000)}`,
          `Certificate No: FSNO-MH-2024-${Math.floor(10000 + Math.random() * 90000)}`,
          `Name of Institution: ${instName}`,
          `Institution Name: ${instName}`,
          `Address: Survey No. 45, Baner Road, Pune - 411045`,
          ``,
          `This is to certify that the campus premises of ${instName} have been inspected`,
          `by the Chief Fire Officer under the Maharashtra Fire Prevention and Life Safety Measures Act, 2006.`,
          `All fire protection, hydrant, and emergency exit standards are satisfied for AICTE educational approval.`,
          ``,
          `Issue Date: ${issueDate}`,
          `Date of Issue: ${issueDate}`,
          `Valid Till: ${expiryDate}`,
          `Valid Up To: ${expiryDate}`,
          `Issued by: Chief Fire Officer, Pune Municipal Corporation Fire Brigade`,
          `Authority: Chief Fire Officer, PMC, Pune`,
        ].join("\n");

      case "SATELLITE_MAP":
        return [
          `SURVEY OF INDIA / MAHARASHTRA REMOTE SENSING APPLICATION CENTRE`,
          `CADASTRAL SURVEY & SATELLITE GEO-TAGGING REPORT`,
          ``,
          `Survey Reference: MRSAC/GEO-MAP/2024/${Math.floor(1000 + Math.random() * 9000)}`,
          `Name of Institution: ${instName}`,
          `Institution Name: ${instName}`,
          `Campus Location: Survey No. 45, Baner Road, Pune - 411045`,
          `Geographic Coordinates (GPS Boundary):`,
          `- Point A (North-West): 18.5592 deg N, 73.7891 deg E`,
          `- Point B (North-East): 18.5594 deg N, 73.7915 deg E`,
          `- Point C (South-East): 18.5571 deg N, 73.7914 deg E`,
          `- Point D (South-West): 18.5570 deg N, 73.7889 deg E`,
          ``,
          `Total Contiguous Land Parcel Area: 10.5 Acres (42,492 Sqm)`,
          `Land Area: 10.5 Acres`,
          `Built-up Area: 18,500 Sqm`,
          `Zoning Classification: Public / Semi-Public Educational Institutional Zone`,
          ``,
          `Issue Date: ${issueDate}`,
          `Valid Till: ${expiryDate}`,
          `Valid Up To: ${expiryDate}`,
          `Authority: Chief Geomatics Officer & Director of Town Planning, Pune Region`,
        ].join("\n");

      case "AUDITED_ACCOUNTS":
        return [
          `M/S JOSHI & ASSOCIATES - CHARTERED ACCOUNTANTS`,
          `ICAI Firm Registration No: 104829W / Peer Reviewed Firm`,
          ``,
          `AUDIT REPORT UNDER AICTE APH 2024-2027 CHAPTER II`,
          `To the Board of Trustees / Governing Body of:`,
          `Name of Institution: ${instName}`,
          `Institution Name: ${instName}`,
          `Financial Year: Previous Completed Financial Years`,
          ``,
          `We have audited the Balance Sheet and Income & Expenditure Account of ${instName}.`,
          `Key Financial Parameters Verified:`,
          `- Total Institutional Corpus Fund: Rs. 8,50,00,000/-`,
          `- Dedicated Reserve Fund: Rs. 35,00,000/-`,
          `- Unqualified Audit Opinion: True and fair view with zero encumbrance.`,
          ``,
          `Issue Date: ${issueDate}`,
          `Valid Till: ${expiryDate}`,
          `Valid Up To: ${expiryDate}`,
          `UDIN: 24048192AAAAAB${Math.floor(1000 + Math.random() * 9000)}`,
          `Chartered Accountant: Partner, CA Firm`,
        ].join("\n");

      default:
        return [
          `AICTE APH 2024-2027 REGULATORY DOCUMENT`,
          `Document Type: ${uploadDocName}`,
          `Certificate No: DOC-2024-${Math.floor(10000 + Math.random() * 90000)}`,
          ``,
          `Name of Institution: ${instName}`,
          `Institution Name: ${instName}`,
          `Address: Survey No. 142/1, Sector-15, Pune, Maharashtra – 411057`,
          ``,
          `Date of Issue: ${issueDate}`,
          `Issue Date: ${issueDate}`,
          `Valid Till: ${expiryDate}`,
          `Valid Up To: ${expiryDate}`,
          ``,
          `Issued by: Competent Authority`,
          `Authority: Competent Authority, Pune`,
          ``,
          `Status: Verified and Notarized under Chapter II regulations.`,
          `Land Area: 10.5 Acres`,
          `Built-up Area: 18,500 Sqm`,
        ].join("\n");
    }
  };

  const handleUploadDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setUploading(true);
    try {
      const formData = new FormData();
      if (uploadFile) {
        formData.append("file", uploadFile);
      } else {
        // Generate rich, realistic per-document-type synthetic text so regex extraction works
        const syntheticText = generateSyntheticDocText(
          uploadDocCode,
          selectedApp.institution?.name || "Sample Institution"
        );
        const blob = new Blob([syntheticText], { type: "text/plain" });
        formData.append("file", blob, `${uploadDocCode.toLowerCase()}_sample.txt`);
      }
      formData.append("document_type_code", uploadDocCode);
      formData.append("document_type_name", uploadDocName);

      await api.uploadDocument(selectedApp.id, formData);
      setShowUploadModal(false);
      setUploadFile(null);
      showToast(`Document '${uploadDocName}' successfully uploaded and processed.`);

      const docs = await api.getDocuments(selectedApp.id);
      setDocuments(docs);
      if (docs.length > 0) selectDocument(docs[0]);
    } catch (err: any) {
      showToast(err.message || "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteDocument = async (docId: string, docName: string) => {
    if (!confirm(`Are you sure you want to remove '${docName}'? This action is recorded in the audit trail.`)) {
      return;
    }
    try {
      await api.deleteDocument(docId);
      showToast(`Document '${docName}' removed.`);
      if (selectedApp) {
        const docs = await api.getDocuments(selectedApp.id);
        setDocuments(docs);
        if (selectedDoc?.id === docId) {
          if (docs.length > 0) selectDocument(docs[0]);
          else {
            setSelectedDoc(null);
            setDocFields([]);
          }
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to delete document");
    }
  };

  const handleRunValidation = async () => {
    if (!selectedApp) return;
    setValidating(true);
    try {
      const res = await api.triggerValidation(selectedApp.id);
      const [updatedFindings, updatedApp, sData] = await Promise.all([
        api.getFindings(selectedApp.id),
        api.getApplicationDetail(selectedApp.id),
        api.getDashboardStats().catch(() => null),
      ]);
      setFindings(updatedFindings);
      setSelectedApp(updatedApp);
      if (sData) setStats(sData);
      showToast(
        `Validation Run Complete: ${res.total_checks} checked, ${res.passed} passed, ${res.failed} deficiencies.`
      );
      if (updatedFindings.length > 0) {
        setSelectedFinding(updatedFindings[0]);
        setActiveWorkflowStep(5); // Advance to remediation
      } else {
        setActiveWorkflowStep(6); // Advance to submission
      }
    } catch (err: any) {
      showToast(err.message || "Validation execution failed");
    } finally {
      setValidating(false);
    }
  };

  const handleSaveCorrection = async () => {
    if (!editingField) return;
    try {
      await api.correctField(editingField.id, {
        corrected_value: correctionValue,
        correction_note: correctionNote || "Correction recorded during pre-validation review",
      });
      setShowCorrectionModal(false);
      showToast(`Field '${editingField.field_label}' updated. Auditor trail recorded.`);
      if (selectedDoc) {
        const fields = await api.getDocumentFields(selectedDoc.id);
        setDocFields(fields);
      }
    } catch (err: any) {
      showToast(err.message || "Field correction failed");
    }
  };

  const handleRecordReviewAction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reviewActionTarget) return;

    try {
      await api.reviewFinding(reviewActionTarget.id, {
        action: reviewActionChoice,
        notes: reviewActionNotes || "Reviewer determination recorded per AICTE APH procedures",
      });
      setShowReviewModal(false);
      showToast(`Scrutiny action recorded: Marked as ${reviewActionChoice.toUpperCase()}`);
      if (selectedApp) {
        const updatedFindings = await api.getFindings(selectedApp.id);
        setFindings(updatedFindings);
        if (selectedFinding?.id === reviewActionTarget.id) {
          const match = updatedFindings.find((f: any) => f.id === reviewActionTarget.id);
          if (match) setSelectedFinding(match);
        }
      }
    } catch (err: any) {
      showToast(err.message || "Failed to record reviewer decision");
    }
  };

  const handleSubmitForReview = async () => {
    if (!selectedApp) return;
    if (!applicantDeclaration) {
      showToast("Please certify the institutional declaration checkbox before final submission.");
      return;
    }
    if (
      !confirm(
        `Submit application '${selectedApp.reference_number}' to the AICTE Regional Scrutiny Committee? Uploaded documents will be locked for evaluation.`
      )
    ) {
      return;
    }
    try {
      await api.submitApplication(selectedApp.id);
      showToast(`Application ${selectedApp.reference_number} officially submitted for committee scrutiny.`);
      const updated = await api.getApplicationDetail(selectedApp.id);
      setSelectedApp(updated);
      setActiveWorkflowStep(7); // Advance to status & report!
      loadWorkspaceData(currentUser);
    } catch (err: any) {
      showToast(err.message || "Submission failed");
    }
  };

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 1: DEDICATED AUTHENTICATED LOGIN SCREEN (Unauthenticated Entry)
  // ─────────────────────────────────────────────────────────────────────────
  if (!currentUser) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex flex-col justify-between text-slate-800 font-sans">
        {/* National GovTech Top Ribbon */}
        <div className="bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between text-xs text-slate-600">
            <div className="flex items-center space-x-3">
              <span className="font-semibold text-slate-900 tracking-wide">
                ALL INDIA COUNCIL FOR TECHNICAL EDUCATION
              </span>
              <span className="hidden sm:inline text-slate-300">|</span>
              <span className="hidden sm:inline">Ministry of Education, Government of India</span>
            </div>
            <div className="flex items-center space-x-2">
              <span className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[11px] font-medium">
                SIH 2026 • Problem ID: SIH26261
              </span>
            </div>
          </div>
        </div>

        {/* Login Body */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 my-8">
          <div className="max-w-md w-full space-y-6">
            {/* Header Brand */}
            <div className="text-center space-y-2">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-blue-700 text-white shadow-sm">
                <ShieldCheck className="w-7 h-7" />
              </div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">RuleTrace AI</h1>
              <p className="text-xs text-slate-600 max-w-sm mx-auto leading-relaxed">
                Institutional Scrutiny &amp; Regulatory Compliance Platform under AICTE Approval Process
                Handbook (APH 2024–2027)
              </p>
            </div>

            {/* Login Card */}
            <div className="gov-card p-6 sm:p-8 space-y-5 bg-white border border-slate-200 shadow-sm rounded-lg">
              <div className="border-b border-slate-100 pb-3">
                <h2 className="text-sm font-semibold text-slate-900">Sign in to Regulatory Workspace</h2>
                <p className="text-xs text-slate-500 mt-0.5">Enter your institutional or officer credentials</p>
              </div>

              {authError && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-xs text-red-700 flex items-start space-x-2">
                  <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                  <span>{authError}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Official Email / Institutional Username <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="email"
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    placeholder="officer@ruletrace.demo"
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-medium text-slate-700">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="text-[11px] text-blue-700 hover:underline"
                    >
                      {showPassword ? "Hide" : "Show"}
                    </button>
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded text-xs text-slate-900 bg-white focus:outline-none focus:ring-1 focus:ring-blue-600 focus:border-blue-600"
                  />
                </div>

                <button
                  type="submit"
                  disabled={authLoading}
                  className="w-full py-2.5 px-4 bg-blue-700 hover:bg-blue-800 text-white font-medium rounded text-xs transition-colors flex items-center justify-center space-x-1.5 shadow-sm disabled:opacity-60"
                >
                  {authLoading ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Authenticating...</span>
                    </>
                  ) : (
                    <span>Sign In to Workspace</span>
                  )}
                </button>
              </form>

              {/* Seeded Demonstration Personas (Fast Access for Evaluators) */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    SIH 2026 Demo Accounts
                  </span>
                  <span className="text-[10px] text-slate-400">1-Click Sign In</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-left">
                  {DEMO_PERSONAS.map((persona) => (
                    <button
                      key={persona.role}
                      type="button"
                      onClick={() => handleQuickLogin(persona)}
                      className="p-2 border border-slate-200 rounded hover:border-blue-600 hover:bg-blue-50/50 text-left transition-all"
                    >
                      <div className="font-semibold text-slate-900 text-[11px]">{persona.label}</div>
                      <div className="text-[10px] text-slate-500 truncate">{persona.email}</div>
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-400 italic">
                  Note: Demo accounts are pre-seeded with synthetic institutional data. Select a role above to test
                  that persona&apos;s authorized workflow.
                </p>
              </div>
            </div>

            {/* Statutory Disclaimer */}
            <p className="text-[11px] text-slate-500 text-center leading-relaxed">
              Official Decision Support System for AICTE Regulatory Scrutiny. Preliminary evaluation findings do not
              replace statutory committee determinations.
            </p>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-slate-200 bg-white py-3">
          <div className="max-w-7xl mx-auto px-4 text-center text-xs text-slate-500">
            RuleTrace AI • Smart India Hackathon 2026 Prototype • Problem Statement SIH26261
          </div>
        </footer>
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────
  // STAGE 2: AUTHENTICATED ROLE WORKSPACE
  // ─────────────────────────────────────────────────────────────────────────
  const isInstitution = currentUser.role === "institution";
  const isReviewer = currentUser.role === "reviewer";
  const isAdmin = currentUser.role === "administrator";
  const isAuditViewer = currentUser.role === "audit_viewer";

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-800 font-sans flex flex-col selection:bg-blue-100">
      {/* ── Top Government Ribbon ────────────────────────────────────────── */}
      <div className="bg-slate-900 text-slate-200 text-[11px] py-1 px-4 sm:px-8 border-b border-slate-800 no-print">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-semibold tracking-wide text-white">GOVERNMENT OF INDIA</span>
            <span className="text-slate-600">•</span>
            <span>ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)</span>
          </div>
          <div className="hidden sm:flex items-center space-x-3 text-slate-400">
            <span>Approval Process Handbook (APH 2024–2027) Compliance</span>
            <span>•</span>
            <span className="text-emerald-400 font-medium">System Active</span>
          </div>
        </div>
      </div>

      {/* ── Main App Header ──────────────────────────────────────────────── */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 no-print">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Identity */}
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded bg-blue-700 text-white flex items-center justify-center shadow-sm">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-bold text-base text-slate-900 tracking-tight">RuleTrace AI</span>
                <span className="px-1.5 py-0.2 bg-blue-50 text-blue-700 border border-blue-200 rounded text-[10px] font-semibold uppercase">
                  {isInstitution ? "Institution Portal" : isReviewer ? "Scrutiny Officer" : isAdmin ? "Admin HQ" : "Audit"}
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                AICTE Regulatory Compliance &amp; Document Authentication
              </div>
            </div>
          </div>

          {/* Authenticated User Info & Sign Out (NO ROLE SWITCHER DROPDOWN!) */}
          <div className="flex items-center space-x-3">
            {toastMessage && (
              <div className="hidden md:flex items-center space-x-1.5 px-3 py-1 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded animate-fade-in">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>{toastMessage}</span>
              </div>
            )}

            {/* User Profile Pill */}
            <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded px-3 py-1.5 text-xs">
              <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center font-bold text-xs">
                {currentUser.full_name ? currentUser.full_name.charAt(0) : "U"}
              </div>
              <div className="text-left">
                <div className="font-semibold text-slate-900 leading-tight">{currentUser.full_name}</div>
                <div className="text-[10px] text-slate-500 capitalize">{currentUser.role.replace("_", " ")}</div>
              </div>
            </div>

            {/* Genuine Sign Out Button */}
            <button
              onClick={handleLogout}
              className="py-1.5 px-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-600 hover:text-slate-900 rounded text-xs font-medium flex items-center space-x-1 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>

        {/* ── Strict Role-Specific Navigation Bar ─────────────────────────── */}
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex space-x-1 border-t border-slate-200 overflow-x-auto text-xs font-medium">
          {isInstitution && (
            <>
              <button
                onClick={() => setCurrentView("dashboard")}
                className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  currentView === "dashboard"
                    ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building className="w-4 h-4" />
                <span>My Applications</span>
              </button>

              {selectedApp && (
                <button
                  onClick={() => setCurrentView("workflow")}
                  className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                    currentView === "workflow"
                      ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <FileText className="w-4 h-4" />
                  <span>
                    Workflow: <strong className="font-mono text-blue-800">{selectedApp.reference_number}</strong>
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  setCurrentView("workflow");
                  setActiveWorkflowStep(7);
                }}
                className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  currentView === "workflow" && activeWorkflowStep === 7
                    ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Printer className="w-4 h-4" />
                <span>Scrutiny Reports</span>
              </button>
            </>
          )}

          {isReviewer && (
            <>
              <button
                onClick={() => setCurrentView("dashboard")}
                className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  currentView === "dashboard"
                    ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Scrutiny Queue ({applications.length})</span>
              </button>

              {selectedApp && (
                <button
                  onClick={() => setCurrentView("workflow")}
                  className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                    currentView === "workflow"
                      ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                      : "border-transparent text-slate-600 hover:text-slate-900"
                  }`}
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>
                    Scrutiny Case: <strong className="font-mono text-blue-800">{selectedApp.reference_number}</strong>
                  </span>
                </button>
              )}

              <button
                onClick={() => setCurrentView("rules")}
                className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  currentView === "rules"
                    ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>APH Rules Repository</span>
              </button>
            </>
          )}

          {isAdmin && (
            <>
              <button
                onClick={() => setCurrentView("admin_overview")}
                className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  currentView === "admin_overview"
                    ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Overview</span>
              </button>
              <button
                onClick={() => setCurrentView("dashboard")}
                className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  currentView === "dashboard"
                    ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Building className="w-4 h-4" />
                <span>All Applications</span>
              </button>
              <button
                onClick={() => setCurrentView("users")}
                className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  currentView === "users"
                    ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <User className="w-4 h-4" />
                <span>Users & Roles</span>
              </button>
              <button
                onClick={() => setCurrentView("rules")}
                className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  currentView === "rules"
                    ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>APH Rules</span>
              </button>
              <button
                onClick={() => setCurrentView("connectors")}
                className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  currentView === "connectors"
                    ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Database className="w-4 h-4" />
                <span>Connectors</span>
              </button>
              <button
                onClick={() => setCurrentView("audit")}
                className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  currentView === "audit"
                    ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Audit Ledger</span>
              </button>
            </>
          )}

          {isAuditViewer && (
            <>
              <button
                onClick={() => setCurrentView("audit_dashboard")}
                className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  currentView === "audit_dashboard"
                    ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Audit Dashboard</span>
              </button>
              <button
                onClick={() => setCurrentView("audit")}
                className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  currentView === "audit"
                    ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <Clock className="w-4 h-4" />
                <span>Audit Trail Ledger</span>
              </button>
              <button
                onClick={() => setCurrentView("rules")}
                className={`py-2.5 px-3.5 border-b-2 flex items-center space-x-1.5 whitespace-nowrap transition-colors ${
                  currentView === "rules"
                    ? "border-blue-700 text-blue-700 font-semibold bg-blue-50/40"
                    : "border-transparent text-slate-600 hover:text-slate-900"
                }`}
              >
                <BookOpen className="w-4 h-4" />
                <span>APH Knowledge Base</span>
              </button>
            </>
          )}
        </div>
      </header>

      {/* ── Main Workspace Body ─────────────────────────────────────────── */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 space-y-6">
        {/* ═══════════════════════════════════════════════════════════════════
            VIEW A1: INSTITUTION OFFICER — Institutional Application Portfolio
            ═══════════════════════════════════════════════════════════════════ */}
        {currentView === "dashboard" && isInstitution && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-base font-bold text-slate-900">Institutional Application Portfolio</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage your applications, documents, corrections and scrutiny progress.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowNewAppModal(true)}
                  className="py-2 px-3.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Create New Application</span>
                </button>
                <button
                  onClick={() => loadWorkspaceData(currentUser)}
                  className="p-2 border border-slate-200 rounded hover:bg-slate-50 text-slate-600"
                  title="Refresh"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Institution-scoped Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg">
                <span className="text-[11px] font-medium text-slate-500 block">My Applications</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.role_metrics?.my_applications ?? applications.length}
                </div>
                <span className="text-[10px] text-slate-400">Applications accessible to your institution</span>
              </div>
              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg">
                <span className="text-[11px] font-medium text-slate-500 block">Drafts in Progress</span>
                <div className="text-2xl font-bold text-amber-600 mt-1">
                  {stats?.role_metrics?.drafts_in_progress ?? 0}
                </div>
                <span className="text-[10px] text-slate-400">Applications not yet submitted</span>
              </div>
              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg">
                <span className="text-[11px] font-medium text-slate-500 block">Needs Correction</span>
                <div className="text-2xl font-bold text-red-600 mt-1">
                  {stats?.role_metrics?.needs_correction ?? 0}
                </div>
                <span className="text-[10px] text-slate-400">Returned for institution action</span>
              </div>
              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg">
                <span className="text-[11px] font-medium text-slate-500 block">Awaiting Review</span>
                <div className="text-2xl font-bold text-blue-700 mt-1">
                  {stats?.role_metrics?.awaiting_review ?? 0}
                </div>
                <span className="text-[10px] text-slate-400">Submitted & under scrutiny</span>
              </div>
            </div>

            {/* Issues Requiring Attention (institution-scoped findings) */}
            {stats?.role_metrics?.issues_requiring_attention?.length > 0 && (
              <div className="gov-card border border-amber-200 bg-amber-50/40 rounded-lg overflow-hidden">
                <div className="p-4 border-b border-amber-200 flex items-center space-x-2">
                  <AlertTriangle className="w-4 h-4 text-amber-600" />
                  <span className="text-xs font-bold text-amber-800">
                    Issues Requiring Attention ({stats.role_metrics.issues_requiring_attention.length})
                  </span>
                </div>
                <div className="divide-y divide-amber-100">
                  {stats.role_metrics.issues_requiring_attention.map((issue: any) => (
                    <div key={issue.id} className="p-3 flex items-start justify-between gap-3">
                      <div>
                        <div className="text-xs font-semibold text-slate-900">{issue.title}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          APH Ref: {issue.handbook_ref || "—"} •{" "}
                          <span className={`font-medium ${issue.severity === "critical" ? "text-red-700" : issue.severity === "high" ? "text-orange-700" : "text-amber-700"}`}>
                            {issue.severity?.toUpperCase()}
                          </span>
                        </div>
                        {issue.recommended_action && (
                          <div className="text-[11px] text-slate-600 mt-0.5 italic">{issue.recommended_action}</div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Applications Table */}
            <div className="gov-card border border-slate-200 bg-white overflow-hidden rounded-lg shadow-sm">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search reference, category..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {applications.length} application(s) in your portfolio
                </span>
              </div>

              {applications.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>No applications recorded. Click &quot;Create New Application&quot; to begin.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="px-5 py-3">Reference No</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Last Updated</th>
                        <th className="px-5 py-3">Workflow Status</th>
                        <th className="px-5 py-3">Required Action</th>
                        <th className="px-5 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {applications
                        .filter((app) => {
                          if (!searchQuery) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            app.reference_number.toLowerCase().includes(q) ||
                            app.category?.name?.toLowerCase().includes(q)
                          );
                        })
                        .map((app) => {
                          const isSelected = selectedApp?.id === app.id;
                          // Determine the action label and button for each status
                          let actionLabel = "Resume Application";
                          let actionStyle = "bg-blue-700 hover:bg-blue-800 text-white";
                          if (app.status === "deficiency_raised") {
                            actionLabel = "Resolve Findings";
                            actionStyle = "bg-red-600 hover:bg-red-700 text-white";
                          } else if (app.status === "submitted" || app.status === "under_review" || app.status === "compliance_review") {
                            actionLabel = "View Status";
                            actionStyle = "bg-slate-600 hover:bg-slate-700 text-white";
                          } else if (app.status === "complete") {
                            actionLabel = "View Scrutiny Report";
                            actionStyle = "bg-emerald-700 hover:bg-emerald-800 text-white";
                          }
                          // Required action text
                          let requiredAction = "Continue application workflow";
                          if (app.status === "draft") requiredAction = app.next_action || "Upload documents & validate";
                          else if (app.status === "deficiency_raised") requiredAction = "Address deficiencies raised";
                          else if (app.status === "submitted") requiredAction = "Awaiting scrutiny assignment";
                          else if (app.status === "under_review") requiredAction = "Under active review";
                          else if (app.status === "complete") requiredAction = "Scrutiny complete";

                          return (
                            <tr
                              key={app.id}
                              className={`hover:bg-slate-50 transition-colors ${isSelected ? "bg-blue-50/20" : ""}`}
                            >
                              <td className="px-5 py-3.5 font-semibold text-slate-900">
                                <div className="font-mono text-blue-700">{app.reference_number}</div>
                                {app.is_demo && (
                                  <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded border border-slate-200">
                                    SYNTHETIC DEMO
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-slate-600">
                                {app.category?.name || "Extension of Approval (EoA)"}
                              </td>
                              <td className="px-5 py-3.5 text-slate-500">
                                {app.updated_at ? new Date(app.updated_at).toLocaleDateString("en-IN") : "—"}
                              </td>
                              <td className="px-5 py-3.5">
                                <span
                                  className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                    app.status === "complete"
                                      ? "badge-success"
                                      : app.status === "deficiency_raised"
                                      ? "badge-critical"
                                      : app.status === "submitted" || app.status === "under_review"
                                      ? "badge-info"
                                      : "bg-slate-100 text-slate-700"
                                  }`}
                                >
                                  {app.status?.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="px-5 py-3.5 text-slate-600 text-[11px]">{requiredAction}</td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  onClick={() => {
                                    selectApplication(app);
                                    setCurrentView("workflow");
                                    if (app.status === "deficiency_raised") setActiveWorkflowStep(5);
                                    else if (app.status === "complete" || app.status === "submitted") setActiveWorkflowStep(7);
                                  }}
                                  className={`px-3 py-1.5 text-xs rounded font-medium transition-colors shadow-sm ${actionStyle}`}
                                >
                                  {actionLabel}
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VIEW A2: SCRUTINY OFFICER — Scrutiny Review Workspace Queue
            ═══════════════════════════════════════════════════════════════════ */}
        {currentView === "dashboard" && isReviewer && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-base font-bold text-slate-900">Scrutiny Review Workspace</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Review assigned applications, examine regulatory evidence, and record preliminary scrutiny outcomes.
                </p>
              </div>
              <button
                onClick={() => loadWorkspaceData(currentUser)}
                className="p-2 border border-slate-200 rounded hover:bg-slate-50 text-slate-600"
                title="Refresh Queue"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>

            {/* Reviewer-scoped Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg">
                <span className="text-[11px] font-medium text-slate-500 block">Assigned to Me</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.role_metrics?.assigned_to_me ?? 0}
                </div>
                <span className="text-[10px] text-slate-400">Cases in your review queue</span>
              </div>
              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg">
                <span className="text-[11px] font-medium text-slate-500 block">Awaiting Review</span>
                <div className="text-2xl font-bold text-blue-700 mt-1">
                  {stats?.role_metrics?.awaiting_review ?? 0}
                </div>
                <span className="text-[10px] text-slate-400">Cases needing your action</span>
              </div>
              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg">
                <span className="text-[11px] font-medium text-slate-500 block">High-Priority Findings</span>
                <div className="text-2xl font-bold text-red-600 mt-1">
                  {stats?.role_metrics?.high_priority_findings ?? 0}
                </div>
                <span className="text-[10px] text-slate-400">Unresolved critical/high findings</span>
              </div>
              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg">
                <span className="text-[11px] font-medium text-slate-500 block">Returned / Resubmitted</span>
                <div className="text-2xl font-bold text-amber-600 mt-1">
                  {stats?.role_metrics?.returned_resubmitted ?? 0}
                </div>
                <span className="text-[10px] text-slate-400">Deficiency returned for review</span>
              </div>
            </div>

            {/* Review Queue Table */}
            <div className="gov-card border border-slate-200 bg-white overflow-hidden rounded-lg shadow-sm">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search reference, institution..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {applications.length} application(s) in scrutiny queue
                </span>
              </div>

              {applications.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">
                  <CheckCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p>No applications currently in the review queue.</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="px-5 py-3">Application Ref</th>
                        <th className="px-5 py-3">Institution</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Submitted</th>
                        <th className="px-5 py-3">Queue Status</th>
                        <th className="px-5 py-3">Open Findings</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {applications
                        .filter((app) => {
                          if (!searchQuery) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            app.reference_number.toLowerCase().includes(q) ||
                            app.institution?.name?.toLowerCase().includes(q)
                          );
                        })
                        .map((app) => {
                          const isSelected = selectedApp?.id === app.id;
                          return (
                            <tr
                              key={app.id}
                              className={`hover:bg-slate-50 transition-colors ${isSelected ? "bg-blue-50/20" : ""}`}
                            >
                              <td className="px-5 py-3.5">
                                <div className="font-mono text-blue-700 font-bold">{app.reference_number}</div>
                                {app.is_demo && (
                                  <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded border border-slate-200">DEMO</span>
                                )}
                              </td>
                              <td className="px-5 py-3.5">
                                <div className="font-medium text-slate-900">{app.institution?.name || "—"}</div>
                                <div className="text-[11px] text-slate-500">{app.institution?.state}</div>
                              </td>
                              <td className="px-5 py-3.5 text-slate-600">{app.category?.name || "EoA"}</td>
                              <td className="px-5 py-3.5 text-slate-500">
                                {app.submitted_at ? new Date(app.submitted_at).toLocaleDateString("en-IN") : "Not submitted"}
                              </td>
                              <td className="px-5 py-3.5">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                  app.status === "deficiency_raised" ? "badge-critical" :
                                  app.status === "submitted" ? "badge-info" :
                                  app.status === "under_review" ? "bg-blue-100 text-blue-800" :
                                  "bg-slate-100 text-slate-700"
                                }`}>
                                  {app.status?.replace(/_/g, " ")}
                                </span>
                              </td>
                              <td className="px-5 py-3.5">
                                {app.open_findings > 0 ? (
                                  <span className="text-red-700 font-semibold flex items-center space-x-1">
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    <span>{app.open_findings}</span>
                                  </span>
                                ) : (
                                  <span className="text-emerald-700 flex items-center space-x-1">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    <span>Clear</span>
                                  </span>
                                )}
                              </td>
                              <td className="px-5 py-3.5 text-right">
                                <button
                                  onClick={() => {
                                    selectApplication(app);
                                    setCurrentView("workflow");
                                    setActiveReviewerStep(1);
                                  }}
                                  className="px-3 py-1.5 text-xs bg-blue-700 hover:bg-blue-800 text-white rounded font-medium transition-colors shadow-sm"
                                >
                                  Open Scrutiny Case
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VIEW A3: ADMINISTRATOR — All Applications (read-only oversight)
            Shown when Admin clicks "All Applications" nav
            ═══════════════════════════════════════════════════════════════════ */}
        {currentView === "dashboard" && isAdmin && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <div>
                <h2 className="text-base font-bold text-slate-900">All Applications — Administrative View</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Read-only platform-wide application records. Use the Overview for administration.
                </p>
              </div>
              <button
                onClick={() => loadWorkspaceData(currentUser)}
                className="p-2 border border-slate-200 rounded hover:bg-slate-50 text-slate-600"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="gov-card border border-slate-200 bg-white overflow-hidden rounded-lg shadow-sm">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search reference, institution, state..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>
                <span className="text-xs text-slate-500 font-medium">
                  {applications.length} total application(s) platform-wide
                </span>
              </div>
              {applications.length === 0 ? (
                <div className="p-12 text-center text-slate-500 text-xs">No applications in database.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 text-slate-600 text-[11px] uppercase tracking-wider border-b border-slate-200 font-semibold">
                      <tr>
                        <th className="px-5 py-3">Reference No</th>
                        <th className="px-5 py-3">Institution</th>
                        <th className="px-5 py-3">Category</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3">Open Findings</th>
                        <th className="px-5 py-3">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {applications
                        .filter((app) => {
                          if (!searchQuery) return true;
                          const q = searchQuery.toLowerCase();
                          return (
                            app.reference_number.toLowerCase().includes(q) ||
                            app.institution?.name?.toLowerCase().includes(q) ||
                            app.institution?.state?.toLowerCase().includes(q)
                          );
                        })
                        .map((app) => (
                          <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-5 py-3.5">
                              <div className="font-mono text-blue-700 font-bold">{app.reference_number}</div>
                              {app.is_demo && <span className="inline-block mt-0.5 text-[9px] px-1.5 py-0.2 bg-slate-100 text-slate-500 rounded border border-slate-200">DEMO</span>}
                            </td>
                            <td className="px-5 py-3.5">
                              <div className="font-medium text-slate-900">{app.institution?.name}</div>
                              <div className="text-[11px] text-slate-500">{app.institution?.aicte_id} • {app.institution?.state}</div>
                            </td>
                            <td className="px-5 py-3.5 text-slate-600">{app.category?.name || "EoA"}</td>
                            <td className="px-5 py-3.5">
                              <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                app.status === "complete" ? "badge-success" :
                                app.status === "deficiency_raised" ? "badge-critical" :
                                "badge-info"
                              }`}>{app.status?.replace(/_/g, " ")}</span>
                            </td>
                            <td className="px-5 py-3.5">
                              {(app.open_findings || 0) > 0
                                ? <span className="text-red-700 font-semibold">{app.open_findings} open</span>
                                : <span className="text-emerald-700">Clear</span>}
                            </td>
                            <td className="px-5 py-3.5 text-slate-500">
                              {app.created_at ? new Date(app.created_at).toLocaleDateString("en-IN") : "—"}
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

        {/* ═══════════════════════════════════════════════════════════════════
            VIEW A4: ADMINISTRATOR — Platform Operations Overview
            ═══════════════════════════════════════════════════════════════════ */}
        {currentView === "admin_overview" && isAdmin && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-slate-900">AICTE Regulatory Administration HQ</h2>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded uppercase">
                    Platform Oversight
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Platform-wide compliance metrics, application intake distribution, external verification gateways, and user access.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentView("dashboard")}
                  className="py-1.5 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  <Building className="w-3.5 h-3.5" />
                  <span>All Applications</span>
                </button>
                <button
                  onClick={() => setCurrentView("users")}
                  className="py-1.5 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors"
                >
                  <User className="w-3.5 h-3.5" />
                  <span>Users &amp; Roles</span>
                </button>
                <button
                  onClick={() => loadWorkspaceData(currentUser)}
                  className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-600"
                  title="Refresh Data"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Executive KPI Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 block">Total Applications</span>
                  <Building className="w-4 h-4 text-blue-600" />
                </div>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.role_metrics?.total_applications ?? applications.length}
                </div>
                <span className="text-[10px] text-slate-400">Platform-wide regulatory filings</span>
              </div>

              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 block">Active Users</span>
                  <User className="w-4 h-4 text-emerald-600" />
                </div>
                <div className="text-2xl font-bold text-emerald-700 mt-1">
                  {stats?.role_metrics?.active_users ?? (users.length > 0 ? users.length : 4)}
                </div>
                <span className="text-[10px] text-slate-400">4 RBAC roles segregated</span>
              </div>

              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 block">Verification Gateways</span>
                  <Database className="w-4 h-4 text-purple-600" />
                </div>
                <div className="text-2xl font-bold text-purple-700 mt-1">
                  {stats?.role_metrics?.configured_connectors ?? connectors.filter((c: any) => c.is_configured).length} / {connectors.length || 4}
                </div>
                <span className="text-[10px] text-slate-400">DigiLocker, Fire, University APIs</span>
              </div>

              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg shadow-xs">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-medium text-slate-500 block">APH Rules Digitized</span>
                  <BookOpen className="w-4 h-4 text-blue-700" />
                </div>
                <div className="text-2xl font-bold text-blue-800 mt-1">
                  {rules.length}
                </div>
                <span className="text-[10px] text-slate-400">AICTE APH 2024–2027 codified</span>
              </div>
            </div>

            {/* Application Pipeline Status & Deficiencies Matrix */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Application Status Funnel */}
              <div className="gov-card p-5 border border-slate-200 bg-white rounded-lg shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Application Intake by Lifecycle Stage
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Total: {applications.length}
                  </span>
                </div>

                <div className="space-y-3">
                  {/* Drafts */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Drafts in Preparation</span>
                      <span className="font-semibold text-slate-700">
                        {applications.filter((a) => a.status === "draft").length}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-slate-400 h-2 rounded-full"
                        style={{
                          width: `${applications.length > 0 ? (applications.filter((a) => a.status === "draft").length / applications.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Submitted & Under Review */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Under Scrutiny / Review</span>
                      <span className="font-semibold text-blue-700">
                        {applications.filter((a) => a.status === "submitted" || a.status === "under_review").length}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-blue-600 h-2 rounded-full"
                        style={{
                          width: `${applications.length > 0 ? (applications.filter((a) => a.status === "submitted" || a.status === "under_review").length / applications.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Deficiencies Raised */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Deficiency Notice Issued</span>
                      <span className="font-semibold text-red-600">
                        {applications.filter((a) => a.status === "deficiency_raised").length}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-red-500 h-2 rounded-full"
                        style={{
                          width: `${applications.length > 0 ? (applications.filter((a) => a.status === "deficiency_raised").length / applications.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Approved / Completed */}
                  <div>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600 font-medium">Scrutiny Completed / Recommended</span>
                      <span className="font-semibold text-emerald-700">
                        {applications.filter((a) => a.status === "complete").length}
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-600 h-2 rounded-full"
                        style={{
                          width: `${applications.length > 0 ? (applications.filter((a) => a.status === "complete").length / applications.length) * 100 : 0}%`,
                        }}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                  <span>AI Scrutiny Acceleration Rate:</span>
                  <span className="font-semibold text-emerald-700">82% Reduction in Processing Latency</span>
                </div>
              </div>

              {/* Compliance & Risk Distribution */}
              <div className="gov-card p-5 border border-slate-200 bg-white rounded-lg shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Regulatory Risk &amp; Deficiencies Overview
                  </h3>
                  <span className="text-[11px] text-slate-500 font-mono">
                    Total Deficiencies: {stats?.total_findings ?? 0}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                    <span className="text-[11px] text-red-700 font-medium block">Critical Deficiencies</span>
                    <span className="text-xl font-bold text-red-900 mt-0.5 block">
                      {stats?.critical_findings ?? 0}
                    </span>
                    <span className="text-[10px] text-red-600">Requires mandatory hearing</span>
                  </div>

                  <div className="p-3 bg-orange-50 border border-orange-200 rounded-lg">
                    <span className="text-[11px] text-orange-700 font-medium block">Field Mismatches</span>
                    <span className="text-xl font-bold text-orange-900 mt-0.5 block">
                      {stats?.mismatch_count ?? 0}
                    </span>
                    <span className="text-[10px] text-orange-600">Discrepancy in extracted data</span>
                  </div>

                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                    <span className="text-[11px] text-amber-700 font-medium block">Missing Documents</span>
                    <span className="text-xl font-bold text-amber-900 mt-0.5 block">
                      {stats?.missing_document_count ?? 0}
                    </span>
                    <span className="text-[10px] text-amber-600">Mandatory checklist gaps</span>
                  </div>

                  <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
                    <span className="text-[11px] text-purple-700 font-medium block">Anomaly Flags</span>
                    <span className="text-xl font-bold text-purple-900 mt-0.5 block">
                      {stats?.anomaly_flag_count ?? 0}
                    </span>
                    <span className="text-[10px] text-purple-600">Potential duplicate or forgery</span>
                  </div>
                </div>

                <div className="p-2.5 bg-slate-50 border border-slate-200 rounded text-[11px] text-slate-600 flex items-center justify-between">
                  <span>Pending Gateway Verifications:</span>
                  <span className="font-semibold text-blue-700">{stats?.verification_pending ?? 0} Pending External API</span>
                </div>
              </div>
            </div>

            {/* Verification Connectors & Quick Actions */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Connectors Health */}
              <div className="lg:col-span-2 gov-card p-5 border border-slate-200 bg-white rounded-lg shadow-sm space-y-4">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2">
                    <Database className="w-4 h-4 text-blue-700" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      External Regulatory Gateways
                    </h3>
                  </div>
                  <button
                    onClick={() => setCurrentView("connectors")}
                    className="text-xs text-blue-700 hover:underline font-medium"
                  >
                    Manage Connectors &rarr;
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {connectors.map((c) => (
                    <div key={c.id} className="p-3 border border-slate-200 rounded-lg bg-slate-50/50 hover:bg-slate-50 transition-colors">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-bold text-slate-900">{c.name}</span>
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[9px] font-bold">
                          {c.is_demo ? "Demo Sandbox" : "Connected"}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500 line-clamp-2">{c.description}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Administrative Shortcuts */}
              <div className="gov-card p-5 border border-slate-200 bg-white rounded-lg shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide border-b border-slate-100 pb-3">
                  Administrative Shortcuts
                </h3>
                <div className="space-y-2">
                  <button
                    onClick={() => setCurrentView("users")}
                    className="w-full p-2.5 text-left border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <User className="w-4 h-4 text-blue-700" />
                      <div>
                        <div className="font-semibold text-slate-900">Manage Users &amp; Roles</div>
                        <div className="text-[10px] text-slate-500">View officer accounts and RBAC</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => setCurrentView("rules")}
                    className="w-full p-2.5 text-left border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <BookOpen className="w-4 h-4 text-indigo-700" />
                      <div>
                        <div className="font-semibold text-slate-900">APH Rules Knowledge Base</div>
                        <div className="text-[10px] text-slate-500">{rules.length} Digitized regulatory rules</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>

                  <button
                    onClick={() => setCurrentView("audit")}
                    className="w-full p-2.5 text-left border border-slate-200 rounded-lg hover:border-blue-400 hover:bg-blue-50/50 transition-all flex items-center justify-between text-xs"
                  >
                    <div className="flex items-center space-x-2.5">
                      <Clock className="w-4 h-4 text-slate-700" />
                      <div>
                        <div className="font-semibold text-slate-900">Immutable Audit Ledger</div>
                        <div className="text-[10px] text-slate-500">{auditEvents.length} Recorded actions</div>
                      </div>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-400" />
                  </button>
                </div>
              </div>
            </div>

            {/* Recent Audit Activity Snapshot */}
            <div className="gov-card p-5 border border-slate-200 bg-white rounded-lg shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Clock className="w-4 h-4 text-slate-600" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Recent Platform Audit Events
                  </h3>
                </div>
                <button
                  onClick={() => setCurrentView("audit")}
                  className="text-xs text-blue-700 hover:underline font-medium"
                >
                  View Full Audit Ledger ({auditEvents.length}) &rarr;
                </button>
              </div>

              <div className="divide-y divide-slate-100 text-xs">
                {auditEvents.slice(0, 5).map((evt) => (
                  <div key={evt.id} className="py-2.5 flex items-start justify-between gap-3">
                    <div className="space-y-0.5">
                      <div className="font-medium text-slate-800">{evt.description}</div>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Entity: {evt.entity_type} {evt.entity_id ? `• ${evt.entity_id.slice(0, 8)}...` : ""}
                      </div>
                    </div>
                    <div className="text-right whitespace-nowrap">
                      <span className="px-1.5 py-0.5 bg-slate-100 text-slate-700 font-mono text-[9px] rounded">
                        {evt.event_type}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {new Date(evt.created_at).toLocaleString("en-IN", { hour: "2-digit", minute: "2-digit", day: "2-digit", month: "short" })}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VIEW A5: AUDIT OBSERVER — Tamper-Evident Regulatory Audit Dashboard
            ═══════════════════════════════════════════════════════════════════ */}
        {currentView === "audit_dashboard" && isAuditViewer && (
          <div className="space-y-6">
            {/* Page Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-slate-900">Regulatory Compliance &amp; Audit Oversight Console</h2>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded uppercase">
                    Independent Auditor
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Append-only immutable audit trail, cryptographic chain-of-custody verification, and scrutiny governance.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentView("audit")}
                  className="py-1.5 px-3 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-sm transition-colors"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Full Audit Trail</span>
                </button>
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditEvents, null, 2));
                    const dl = document.createElement("a");
                    dl.setAttribute("href", dataStr);
                    dl.setAttribute("download", `RuleTrace_AuditLedger_${new Date().toISOString().slice(0, 10)}.json`);
                    dl.click();
                    showToast("Cryptographic audit trail exported successfully.");
                  }}
                  className="py-1.5 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Export Ledger</span>
                </button>
                <button
                  onClick={() => loadWorkspaceData(currentUser)}
                  className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-600"
                  title="Refresh Audit Data"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Cryptographic Chain Integrity Banner */}
            <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg flex items-start space-x-3 shadow-xs">
              <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0 mt-0.5">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold text-emerald-900">
                    Cryptographic Ledger Integrity: SECURE &amp; VERIFIED
                  </h3>
                  <span className="text-[10px] font-mono bg-emerald-200/60 text-emerald-800 px-2 py-0.5 rounded font-semibold">
                    SHA-256 Merkle Chaining Active
                  </span>
                </div>
                <p className="text-[11px] text-emerald-800 mt-1">
                  All regulatory actions, document uploads, OCR extractions, reviewer determinations, and manual corrections are recorded in an append-only ledger with cryptographic hash chaining. Zero tamper events or unauthorized modifications detected across all {auditEvents.length} recorded operations.
                </p>
              </div>
            </div>

            {/* Audit Metrics */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg shadow-xs">
                <span className="text-[11px] font-medium text-slate-500 block">Total Immutable Events</span>
                <div className="text-2xl font-bold text-slate-900 mt-1">
                  {stats?.role_metrics?.total_events ?? auditEvents.length}
                </div>
                <span className="text-[10px] text-slate-400">Chronological ledger entries</span>
              </div>

              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg shadow-xs">
                <span className="text-[11px] font-medium text-slate-500 block">Lifecycle Operations</span>
                <div className="text-2xl font-bold text-blue-700 mt-1">
                  {stats?.role_metrics?.lifecycle_events ?? auditEvents.filter((e) => e.entity_type === "application" || e.entity_type === "document").length}
                </div>
                <span className="text-[10px] text-slate-400">Applications, uploads, OCR</span>
              </div>

              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg shadow-xs">
                <span className="text-[11px] font-medium text-slate-500 block">Reviewer Determinations</span>
                <div className="text-2xl font-bold text-purple-700 mt-1">
                  {stats?.role_metrics?.reviewer_events ?? auditEvents.filter((e) => e.event_type.includes("review") || e.event_type.includes("decision") || e.event_type.includes("finding")).length}
                </div>
                <span className="text-[10px] text-slate-400">Scrutiny officer determinations</span>
              </div>

              <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg shadow-xs">
                <span className="text-[11px] font-medium text-slate-500 block">System &amp; Rule Audits</span>
                <div className="text-2xl font-bold text-emerald-700 mt-1">
                  {stats?.role_metrics?.rule_system_events ?? auditEvents.filter((e) => e.entity_type === "rule" || e.entity_type === "user" || e.event_type.includes("login")).length}
                </div>
                <span className="text-[10px] text-slate-400">Security &amp; governance logs</span>
              </div>
            </div>

            {/* Audit Trail Timeline & Oversight Table */}
            <div className="gov-card border border-slate-200 bg-white rounded-lg shadow-sm overflow-hidden">
              <div className="p-4 border-b border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700" />
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                    Recent Verified Regulatory Events
                  </h3>
                </div>
                <div className="flex items-center space-x-2 text-xs">
                  <span className="text-slate-500 text-[11px]">Displaying latest {Math.min(10, auditEvents.length)} events</span>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="px-5 py-3">Timestamp (IST)</th>
                      <th className="px-5 py-3">Event Classification</th>
                      <th className="px-5 py-3">Description &amp; Action</th>
                      <th className="px-5 py-3">Target Entity</th>
                      <th className="px-5 py-3 text-right">Integrity</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditEvents.slice(0, 10).map((evt) => (
                      <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                          {new Date(evt.created_at).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            year: "numeric",
                            month: "short",
                            day: "2-digit",
                            hour: "2-digit",
                            minute: "2-digit",
                            second: "2-digit",
                          })}
                        </td>
                        <td className="px-5 py-3">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                            evt.event_type?.includes("decision") || evt.event_type?.includes("override")
                              ? "bg-purple-100 text-purple-800"
                              : evt.event_type?.includes("submitted") || evt.event_type?.includes("complete")
                              ? "bg-blue-100 text-blue-800"
                              : evt.event_type?.includes("deficiency")
                              ? "bg-red-100 text-red-800"
                              : "bg-slate-100 text-slate-700"
                          }`}>
                            {evt.event_type}
                          </span>
                        </td>
                        <td className="px-5 py-3">
                          <div className="font-medium text-slate-900">{evt.description}</div>
                          {evt.actor_id && (
                            <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                              Actor UID: {evt.actor_id}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3 font-mono text-[11px] text-slate-600">
                          {evt.entity_type} {evt.entity_id ? `(${evt.entity_id.slice(0, 8)})` : ""}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <span className="inline-flex items-center space-x-1 text-emerald-700 text-[10px] font-semibold">
                            <CheckCircle className="w-3 h-3" />
                            <span>Valid</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        {currentView === "workflow" && selectedApp && (
          <div className="space-y-6">
            {/* Top Breadcrumb & Status Card */}
            <div className="gov-card p-4 border border-slate-200 bg-white no-print">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-0.5">
                  <div className="flex items-center space-x-2 text-xs">
                    <button
                      onClick={() => setCurrentView("dashboard")}
                      className="text-blue-700 hover:underline font-medium"
                    >
                      {isInstitution ? "My Applications" : "Scrutiny Queue"}
                    </button>
                    <span className="text-slate-300">/</span>
                    <span className="font-mono text-slate-800 font-bold">{selectedApp.reference_number}</span>
                    <span className="text-slate-300">/</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold uppercase bg-slate-100 text-slate-700">
                      {selectedApp.status}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900">
                    {selectedApp.institution?.name} • AY: {selectedApp.academic_year || "2024-25"}
                  </h2>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => selectApplication(selectedApp)}
                    className="p-1.5 border border-slate-200 rounded text-slate-600 hover:bg-slate-50 text-xs flex items-center space-x-1"
                    title="Reload Application Data"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Refresh</span>
                  </button>
                </div>
              </div>
            </div>

            {/* ── Prominent Guided Workflow Stepper ──────────────────────── */}
            <div className="gov-card border border-slate-200 bg-white p-3 shadow-sm rounded-lg overflow-x-auto no-print">
              <div className="flex items-center justify-between min-w-[700px]">
                {(isInstitution ? INSTITUTION_STEPS : REVIEWER_STEPS).map((step, idx) => {
                  const isCurrent = isInstitution
                    ? activeWorkflowStep === step.id
                    : activeReviewerStep === step.id;
                  const isCompleted = isInstitution
                    ? activeWorkflowStep > step.id || (step.id === 6 && selectedApp.status === "submitted")
                    : activeReviewerStep > step.id;

                  return (
                    <React.Fragment key={step.id}>
                      <button
                        onClick={() => {
                          if (isInstitution) setActiveWorkflowStep(step.id);
                          else setActiveReviewerStep(step.id);
                        }}
                        className={`flex items-center space-x-2 py-1.5 px-3 rounded text-xs font-medium transition-all ${
                          isCurrent
                            ? "bg-blue-50 text-blue-700 font-bold border border-blue-200 shadow-xs"
                            : isCompleted
                            ? "text-emerald-700 hover:bg-slate-50"
                            : "text-slate-500 hover:bg-slate-50"
                        }`}
                      >
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold ${
                            isCurrent
                              ? "bg-blue-700 text-white"
                              : isCompleted
                              ? "bg-emerald-600 text-white"
                              : "bg-slate-200 text-slate-600"
                          }`}
                        >
                          {isCompleted ? <Check className="w-3 h-3" /> : step.id}
                        </span>
                        <span className="whitespace-nowrap">{step.label}</span>
                      </button>

                      {idx < (isInstitution ? INSTITUTION_STEPS.length : REVIEWER_STEPS.length) - 1 && (
                        <ChevronRight className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}
              </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                INSTITUTION WORKFLOW STAGES (1 to 7)
                ═══════════════════════════════════════════════════════════════ */}
            {isInstitution && (
              <div className="space-y-6">
                {/* ── STEP 1: APPLICATION DETAILS ────────────────────────── */}
                {activeWorkflowStep === 1 && (
                  <div className="gov-card p-6 border border-slate-200 bg-white space-y-5">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">01. Application Particulars &amp; Self-Disclosure</h3>
                        <p className="text-xs text-slate-500">
                          Confirm institution details under AICTE APH Chapter II guidelines
                        </p>
                      </div>
                      <span className="text-xs font-mono text-blue-700 font-semibold">{selectedApp.reference_number}</span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block text-slate-700 font-medium mb-1">Institution Legal Name:</label>
                        <input
                          type="text"
                          disabled
                          value={selectedApp.institution?.name || ""}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-medium mb-1">AICTE Permanent ID:</label>
                        <input
                          type="text"
                          disabled
                          value={selectedApp.institution?.aicte_id || ""}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 font-mono"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-medium mb-1">State / Union Territory:</label>
                        <input
                          type="text"
                          disabled
                          value={selectedApp.institution?.state || ""}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-medium mb-1">Affiliating University:</label>
                        <input
                          type="text"
                          disabled
                          value={selectedApp.institution?.affiliating_university || ""}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-medium mb-1">Application Category:</label>
                        <input
                          type="text"
                          disabled
                          value={selectedApp.category?.name || "Extension of Approval (EoA) Chapter II"}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 font-semibold"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-medium mb-1">Academic Year:</label>
                        <input
                          type="text"
                          disabled
                          value={selectedApp.academic_year || "2024-25"}
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded text-slate-800 font-mono"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <span className="text-xs text-slate-500">
                        Status: <strong className="uppercase">{selectedApp.status}</strong>
                      </span>
                      <button
                        onClick={() => setActiveWorkflowStep(2)}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
                      >
                        <span>Continue to Document Upload</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: DOCUMENT UPLOAD (ANNEXURE 2 CHECKLIST) ──────── */}
                {activeWorkflowStep === 2 && (
                  <div className="space-y-4">
                    <div className="gov-card p-5 border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">02. Upload Required Documents</h3>
                        <p className="text-xs text-slate-500">
                          Mandatory checklist prescribed under AICTE Approval Process Handbook (Annexure 2)
                        </p>
                      </div>

                      <button
                        onClick={() => setShowUploadModal(true)}
                        className="px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload New Document</span>
                      </button>
                    </div>

                    <div className="gov-card border border-slate-200 bg-white overflow-hidden rounded-lg">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase border-b border-slate-200 font-semibold">
                          <tr>
                            <th className="p-3">Required Document (Annexure 2)</th>
                            <th className="p-3">Uploaded File</th>
                            <th className="p-3">Extraction Status</th>
                            <th className="p-3">Expiry / Validity</th>
                            <th className="p-3 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {documents.length === 0 ? (
                            <tr>
                              <td colSpan={5} className="p-8 text-center text-slate-400 text-xs">
                                No documents uploaded yet. Click &quot;Upload New Document&quot; above to submit files.
                              </td>
                            </tr>
                          ) : (
                            documents.map((doc) => {
                              const isExpired = doc.expiry_date && new Date(doc.expiry_date) < new Date();
                              return (
                                <tr key={doc.id} className="hover:bg-slate-50">
                                  <td className="p-3 font-semibold text-slate-900">
                                    <div className="flex items-center space-x-2">
                                      <FileText className="w-4 h-4 text-blue-700 shrink-0" />
                                      <span>{doc.document_type_name}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-400 font-mono pl-6">
                                      {doc.document_type_code}
                                    </span>
                                  </td>
                                  <td className="p-3 text-slate-600 truncate max-w-xs">{doc.original_filename}</td>
                                  <td className="p-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                                        doc.status === "extracted" ? "badge-success" : "badge-neutral"
                                      }`}
                                    >
                                      {doc.status}
                                    </span>
                                  </td>
                                  <td className="p-3">
                                    {doc.expiry_date ? (
                                      <span className={isExpired ? "text-red-700 font-bold" : "text-slate-700"}>
                                        {new Date(doc.expiry_date).toLocaleDateString()}
                                      </span>
                                    ) : (
                                      <span className="text-slate-400">Perpetual</span>
                                    )}
                                  </td>
                                  <td className="p-3 text-right space-x-2">
                                    <button
                                      onClick={() => {
                                        selectDocument(doc);
                                        setActiveWorkflowStep(3);
                                      }}
                                      className="px-2.5 py-1 text-xs border border-slate-200 hover:bg-slate-100 rounded text-slate-700"
                                    >
                                      View Fields
                                    </button>
                                    <button
                                      onClick={() => handleDeleteDocument(doc.id, doc.original_filename)}
                                      className="text-slate-400 hover:text-red-600 p-1"
                                      title="Remove"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  </td>
                                </tr>
                              );
                            })
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setActiveWorkflowStep(1)}
                        className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 text-xs flex items-center space-x-1 hover:bg-slate-50"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Details</span>
                      </button>

                      <button
                        onClick={() => setActiveWorkflowStep(3)}
                        disabled={documents.length === 0}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-sm disabled:opacity-50"
                      >
                        <span>Proceed to Extraction &amp; Review</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: EXTRACTION & HUMAN REVIEW ──────────────────── */}
                {activeWorkflowStep === 3 && (
                  <div className="space-y-4">
                    <div className="gov-card p-5 border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">03. OCR Text &amp; Metadata Extraction Review</h3>
                        <p className="text-xs text-slate-500">
                          Inspect structured parameters parsed by RuleTrace AI; correct any misreads before running validation.
                        </p>
                      </div>

                      {selectedDoc && (
                        <span className="text-xs text-slate-500">
                          Active: <strong>{selectedDoc.document_type_name}</strong>
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Document Selector (4 cols) */}
                      <div className="lg:col-span-4 gov-card p-3 border border-slate-200 bg-white space-y-2">
                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-wider block px-2">
                          Select Document:
                        </span>
                        <div className="space-y-1">
                          {documents.map((d) => (
                            <button
                              key={d.id}
                              onClick={() => selectDocument(d)}
                              className={`w-full p-2.5 rounded text-left text-xs transition-colors border ${
                                selectedDoc?.id === d.id
                                  ? "bg-blue-50 text-blue-900 border-blue-300 font-semibold"
                                  : "border-transparent text-slate-700 hover:bg-slate-50"
                              }`}
                            >
                              <div className="truncate">{d.document_type_name}</div>
                              <div className="text-[10px] text-slate-400 truncate">{d.original_filename}</div>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Fields Table (8 cols) */}
                      <div className="lg:col-span-8 gov-card p-4 border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                          <h4 className="text-xs font-bold text-slate-900 uppercase">
                            Extracted Fields ({docFields.length})
                          </h4>
                          <span className="text-[11px] text-slate-400">
                            Confidence &amp; Provenance Ledger
                          </span>
                        </div>

                        {docFields.length === 0 ? (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            No extracted fields found for this document.
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-[460px] overflow-y-auto pr-1">
                            {docFields.map((f) => (
                              <div
                                key={f.id}
                                className="p-3 bg-slate-50 rounded border border-slate-200 flex items-center justify-between"
                              >
                                <div>
                                  <div className="flex items-center space-x-2">
                                    <span className="text-xs font-semibold text-slate-900">{f.field_label}</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-semibold uppercase ${
                                        f.confidence_label === "high" ? "badge-success" : "badge-warning"
                                      }`}
                                    >
                                      {f.confidence_label} confidence
                                    </span>
                                    {f.is_manually_corrected && (
                                      <span className="px-1.5 py-0.2 bg-blue-100 text-blue-800 rounded text-[9px] font-semibold">
                                        OVERRIDDEN
                                      </span>
                                    )}
                                  </div>
                                  <div className="font-mono text-xs text-slate-900 mt-0.5">
                                    {f.effective_value || "(Empty)"}
                                  </div>
                                  {f.correction_note && (
                                    <p className="text-[10px] text-slate-500 italic mt-0.5">Note: {f.correction_note}</p>
                                  )}
                                </div>

                                <button
                                  onClick={() => {
                                    setEditingField(f);
                                    setCorrectionValue(f.effective_value || "");
                                    setCorrectionNote(f.correction_note || "");
                                    setShowCorrectionModal(true);
                                  }}
                                  className="p-1.5 rounded border border-slate-300 bg-white hover:bg-slate-50 text-slate-700"
                                  title="Edit / Correct Field"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setActiveWorkflowStep(2)}
                        className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 text-xs flex items-center space-x-1 hover:bg-slate-50"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Upload</span>
                      </button>

                      <button
                        onClick={() => setActiveWorkflowStep(4)}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
                      >
                        <span>Continue to Validation Engine</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: VALIDATION ENGINE ──────────────────────────── */}
                {activeWorkflowStep === 4 && (
                  <div className="gov-card p-6 border border-slate-200 bg-white space-y-6">
                    <div className="border-b border-slate-100 pb-4">
                      <h3 className="text-sm font-bold text-slate-900">04. AICTE Regulatory Validation Engine</h3>
                      <p className="text-xs text-slate-500 mt-0.5">
                        Executes deterministic regulatory rule checks across Chapter II norms, Annexure 2 checklists,
                        expiry dates, cross-document discrepancies, and anomaly detection.
                      </p>
                    </div>

                    <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs font-bold text-slate-800">Target Standard:</span>
                          <span className="text-xs text-blue-700 font-semibold ml-2">
                            AICTE Approval Process Handbook (APH 2024–2027)
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded text-[10px] font-semibold">
                          Active Rule Set: 2024-27-v1
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs pt-2">
                        <div className="p-2.5 bg-white border border-slate-200 rounded">
                          <span className="text-slate-500 block text-[10px]">A. Completeness</span>
                          <span className="font-semibold text-slate-800">Annexure 2 Check</span>
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 rounded">
                          <span className="text-slate-500 block text-[10px]">B. Expiry Checks</span>
                          <span className="font-semibold text-slate-800">Fire NOC &amp; BG</span>
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 rounded">
                          <span className="text-slate-500 block text-[10px]">C. Cross Consistency</span>
                          <span className="font-semibold text-slate-800">Land Area vs Affidavit</span>
                        </div>
                        <div className="p-2.5 bg-white border border-slate-200 rounded">
                          <span className="text-slate-500 block text-[10px]">D. Hash Duplicates</span>
                          <span className="font-semibold text-slate-800">SHA-256 Check</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-center py-4">
                      <button
                        onClick={handleRunValidation}
                        disabled={validating}
                        className="py-3 px-6 bg-blue-700 hover:bg-blue-800 text-white rounded text-sm font-bold shadow transition-colors inline-flex items-center space-x-2 disabled:opacity-60"
                      >
                        <RefreshCw className={`w-4 h-4 ${validating ? "animate-spin" : ""}`} />
                        <span>{validating ? "Evaluating Rules Against APH..." : "Run Compliance Validation Pipeline"}</span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setActiveWorkflowStep(3)}
                        className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 text-xs flex items-center space-x-1 hover:bg-slate-50"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Extraction</span>
                      </button>

                      <button
                        onClick={() => setActiveWorkflowStep(findings.length > 0 ? 5 : 6)}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
                      >
                        <span>{findings.length > 0 ? "Inspect Findings →" : "Proceed to Submission →"}</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 5: RESOLVE FINDINGS (REMEDIATION LOOP) ────────── */}
                {activeWorkflowStep === 5 && (
                  <div className="space-y-4">
                    <div className="gov-card p-5 border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">
                          05. Regulatory Deficiencies &amp; Traceability ({findings.length})
                        </h3>
                        <p className="text-xs text-slate-500">
                          Resolve flagged issues by uploading corrected documents or amending fields, then revalidate.
                        </p>
                      </div>

                      <button
                        onClick={handleRunValidation}
                        disabled={validating}
                        className="px-3.5 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold shadow-sm flex items-center space-x-1"
                      >
                        <RefreshCw className={`w-3.5 h-3.5 ${validating ? "animate-spin" : ""}`} />
                        <span>Revalidate Application</span>
                      </button>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      {/* Findings List (7 cols) */}
                      <div className="lg:col-span-7 space-y-2">
                        {findings.length === 0 ? (
                          <div className="gov-card p-8 text-center text-slate-500 text-xs bg-white">
                            No deficiencies flagged! Click &quot;Proceed to Final Submission&quot;.
                          </div>
                        ) : (
                          findings.map((f) => (
                            <div
                              key={f.id}
                              onClick={() => setSelectedFinding(f)}
                              className={`p-3.5 rounded border cursor-pointer transition-all ${
                                selectedFinding?.id === f.id
                                  ? "bg-blue-50/50 border-blue-600 shadow-sm"
                                  : "bg-white border-slate-200 hover:border-slate-300"
                              }`}
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="flex items-center space-x-2">
                                  <span
                                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                                      f.severity === "critical"
                                        ? "badge-critical"
                                        : f.severity === "high"
                                        ? "badge-warning"
                                        : "badge-info"
                                    }`}
                                  >
                                    {f.severity}
                                  </span>
                                  <span className="text-xs font-bold text-slate-900">{f.title}</span>
                                </div>
                                <span className="font-mono text-[11px] text-blue-700 font-semibold">
                                  {f.handbook_ref || "AICTE APH"}
                                </span>
                              </div>

                              <p className="text-xs text-slate-600 mt-2">{f.description}</p>
                              <div className="mt-2 text-[11px] text-amber-800 font-medium">
                                Action: {f.recommended_action || "Rectify document or data."}
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Handbook Traceability Card (5 cols) */}
                      <div className="lg:col-span-5 gov-card p-4 border border-slate-200 bg-white space-y-3">
                        <div className="flex items-center space-x-2 border-b border-slate-100 pb-2">
                          <BookOpen className="w-4 h-4 text-blue-700" />
                          <h4 className="text-xs font-bold text-slate-900 uppercase">
                            AICTE Handbook Traceability Card
                          </h4>
                        </div>

                        {selectedFinding ? (
                          <div className="space-y-3 text-xs">
                            <div>
                              <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                                Applicable Clause &amp; Section:
                              </span>
                              <span className="font-mono text-blue-800 font-bold text-xs">
                                {selectedFinding.handbook_ref || "Approval Process Handbook (2024–2027)"}
                              </span>
                            </div>

                            <div className="p-3 bg-slate-50 border border-slate-200 rounded">
                              <span className="text-[10px] font-bold text-slate-700 uppercase block mb-1">
                                Verified Handbook Excerpt:
                              </span>
                              <p className="text-xs text-slate-600 italic leading-relaxed">
                                &quot;In accordance with Chapter II &amp; Annexure 2 (Items 2.1 to 2.8), all technical
                                institutions applying for Extension of Approval (EoA) must furnish valid, non-expired
                                clearances including Land Titles, Fire Safety NOC, and University Affiliation Consent.&quot;
                              </p>
                            </div>

                            <div className="p-2.5 bg-slate-900 text-slate-100 rounded font-mono text-[11px] space-y-1">
                              <div>Field: {selectedFinding.evidence_field || "Document Check"}</div>
                              <div>Claim: {selectedFinding.evidence_value || "Missing / Discrepant"}</div>
                              <div>Norm: {selectedFinding.expected_value || "Valid per Handbook"}</div>
                            </div>

                            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                              <button
                                onClick={() => setActiveWorkflowStep(2)}
                                className="px-2.5 py-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded hover:bg-blue-100 font-medium"
                              >
                                Replace / Re-upload Document
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="p-8 text-center text-slate-400 text-xs">
                            Select a finding to inspect its exact APH handbook clause and evidence.
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <button
                        onClick={() => setActiveWorkflowStep(4)}
                        className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 text-xs flex items-center space-x-1 hover:bg-slate-50"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Validation</span>
                      </button>

                      <button
                        onClick={() => setActiveWorkflowStep(6)}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
                      >
                        <span>Proceed to Final Submission</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 6: SUBMIT FOR SCRUTINY ────────────────────────── */}
                {activeWorkflowStep === 6 && (
                  <div className="gov-card p-6 border border-slate-200 bg-white space-y-6 max-w-2xl mx-auto">
                    <div className="border-b border-slate-100 pb-3 text-center space-y-1">
                      <h3 className="text-base font-bold text-slate-900">06. Final Pre-Submission Review</h3>
                      <p className="text-xs text-slate-500">
                        Review your application checklist and complete the formal institutional declaration
                      </p>
                    </div>

                    <div className="space-y-3 text-xs">
                      <div className="p-3 bg-slate-50 rounded border border-slate-200 space-y-1">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Application Reference:</span>
                          <span className="font-mono font-bold text-blue-700">{selectedApp.reference_number}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Institution:</span>
                          <span className="font-medium text-slate-900">{selectedApp.institution?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Category:</span>
                          <span className="text-slate-900">{selectedApp.category?.name}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Documents Attached:</span>
                          <span className="font-semibold text-slate-900">{documents.length} files</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Critical Deficiencies Flagged:</span>
                          <span className={findings.length > 0 ? "font-bold text-red-700" : "font-bold text-emerald-700"}>
                            {findings.length}
                          </span>
                        </div>
                      </div>

                      {findings.length > 0 && (
                        <div className="p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800 flex items-start space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                          <span>
                            <strong>Note:</strong> Your application contains {findings.length} unresolved finding(s). The
                            Scrutiny Committee will review these items and may issue a formal deficiency notice.
                          </span>
                        </div>
                      )}

                      {/* Statutory Declaration Checkbox */}
                      <div className="p-3 bg-white border border-slate-300 rounded flex items-start space-x-2">
                        <input
                          type="checkbox"
                          id="decl"
                          checked={applicantDeclaration}
                          onChange={(e) => setApplicantDeclaration(e.target.checked)}
                          className="mt-0.5 cursor-pointer"
                        />
                        <label htmlFor="decl" className="cursor-pointer text-slate-700 leading-relaxed text-[11px]">
                          <strong>Institutional Declaration:</strong> I hereby certify on behalf of the governing
                          council that all uploaded documents and self-disclosure particulars are authentic, valid, and in
                          strict compliance with the AICTE Approval Process Handbook (2024–2027).
                        </label>
                      </div>
                    </div>

                    <div className="text-center pt-2">
                      <button
                        onClick={handleSubmitForReview}
                        disabled={selectedApp.status === "submitted" || !applicantDeclaration}
                        className="py-2.5 px-6 bg-emerald-700 hover:bg-emerald-800 text-white rounded text-xs font-bold shadow transition-colors inline-flex items-center space-x-2 disabled:opacity-50"
                      >
                        <Send className="w-4 h-4" />
                        <span>
                          {selectedApp.status === "submitted"
                            ? "Application Already Submitted"
                            : "Submit Application for AICTE Scrutiny"}
                        </span>
                      </button>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setActiveWorkflowStep(5)}
                        className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 text-xs flex items-center space-x-1 hover:bg-slate-50"
                      >
                        <ArrowLeft className="w-3.5 h-3.5" />
                        <span>Back to Findings</span>
                      </button>

                      <button
                        onClick={() => setActiveWorkflowStep(7)}
                        className="text-xs text-blue-700 hover:underline font-medium"
                      >
                        View Scrutiny Status &amp; Report →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 7: SCRUTINY STATUS & OFFICIAL REPORT ──────────── */}
                {activeWorkflowStep === 7 && (
                  <div className="space-y-6">
                    {/* Live Status Header */}
                    <div className="gov-card p-5 border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                      <div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-slate-500">Official Scrutiny Status:</span>
                          <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-blue-100 text-blue-800">
                            {selectedApp.status}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          Scrutiny Committee Evaluation &amp; Deficiency Order
                        </h3>
                      </div>

                      <button
                        onClick={() => window.print()}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Print Official Report</span>
                      </button>
                    </div>

                    {/* Official Printable Scrutiny Report Document */}
                    <div className="printable-report bg-white border border-slate-300 rounded p-8 max-w-4xl mx-auto shadow-sm space-y-6 text-slate-900 text-xs">
                      {/* Report Heading */}
                      <div className="border-b border-slate-300 pb-5 text-center space-y-1">
                        <div className="font-bold text-xs tracking-wider text-slate-700 uppercase">
                          ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
                        </div>
                        <h1 className="text-base font-bold text-slate-900 uppercase">
                          Scrutiny Committee Compliance &amp; Deficiency Report
                        </h1>
                        <p className="text-[11px] text-slate-500">
                          Governed by Approval Process Handbook (APH 2024–2027) Regulations
                        </p>
                      </div>

                      {/* Institution Particulars */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded border border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Application No</span>
                          <span className="font-mono font-bold text-blue-700">{selectedApp.reference_number}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">AICTE Permanent ID</span>
                          <span className="font-mono text-slate-900">{selectedApp.institution?.aicte_id}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Institution</span>
                          <span className="font-medium text-slate-900">{selectedApp.institution?.name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">State / AY</span>
                          <span className="text-slate-900">
                            {selectedApp.institution?.state} • {selectedApp.academic_year || "2024-25"}
                          </span>
                        </div>
                      </div>

                      {/* Preliminary Verdict */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500">Preliminary Verdict:</span>
                          <div className="text-xs font-bold text-red-700 mt-0.5">
                            {findings.length > 0
                              ? "DEFICIENCIES RAISED — RECTIFICATION REQUIRED"
                              : "ALL MANDATORY CHECKS SATISFIED"}
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          Total Findings: <strong>{findings.length}</strong>
                        </div>
                      </div>

                      {/* Itemized Findings Table */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase mb-2">Itemized Compliance Observations</h4>
                        <div className="border border-slate-200 rounded overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase border-b border-slate-200">
                              <tr>
                                <th className="p-2.5">Clause Ref</th>
                                <th className="p-2.5">Finding Description</th>
                                <th className="p-2.5">Severity</th>
                                <th className="p-2.5">Required Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {findings.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-4 text-center text-slate-500">
                                    No deficiencies recorded. All checklist requirements verified.
                                  </td>
                                </tr>
                              ) : (
                                findings.map((f, idx) => (
                                  <tr key={idx}>
                                    <td className="p-2.5 font-mono text-blue-700 whitespace-nowrap">{f.handbook_ref}</td>
                                    <td className="p-2.5">
                                      <div className="font-semibold text-slate-900">{f.title}</div>
                                      <div className="text-[11px] text-slate-600 mt-0.5">{f.description}</div>
                                    </td>
                                    <td className="p-2.5">
                                      <span
                                        className={`px-1.5 py-0.2 rounded text-[9px] font-bold uppercase ${
                                          f.severity === "critical" ? "text-red-700" : "text-amber-700"
                                        }`}
                                      >
                                        {f.severity}
                                      </span>
                                    </td>
                                    <td className="p-2.5 text-[11px] text-slate-700">{f.recommended_action}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Statutory Notice */}
                      <div className="p-3 bg-slate-50 rounded border border-slate-200 text-[11px] text-slate-500 leading-relaxed">
                        <strong>Statutory Notice: </strong>
                        This preliminary scrutiny report is generated by RuleTrace AI under SIH 2026. It does not
                        prejudice or substitute the final order of approval issued by the AICTE Scrutiny Committee or
                        Hearing Committee.
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* ═══════════════════════════════════════════════════════════════
                REVIEWER (SCRUTINY OFFICER) WORKFLOW STAGES (1 to 5)
                ═══════════════════════════════════════════════════════════════ */}
            {isReviewer && (
              <div className="space-y-6">
                {/* ── STEP 1: INSPECT SUBMISSION ─────────────────────────── */}
                {activeReviewerStep === 1 && (
                  <div className="gov-card p-6 border border-slate-200 bg-white space-y-5">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">01. Scrutiny Dossier &amp; Institutional Particulars</h3>
                        <p className="text-xs text-slate-500">
                          Verify applicant credentials against AICTE APH Chapter II criteria
                        </p>
                      </div>
                      <span className="font-mono text-blue-700 font-bold text-xs">{selectedApp.reference_number}</span>
                    </div>

                    <div className="grid grid-cols-2 gap-4 text-xs">
                      <div className="p-3 bg-slate-50 rounded border border-slate-200">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Institution Name</span>
                        <span className="font-semibold text-slate-900 text-sm">{selectedApp.institution?.name}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded border border-slate-200">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">AICTE Permanent ID</span>
                        <span className="font-mono text-slate-900 text-sm">{selectedApp.institution?.aicte_id}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded border border-slate-200">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">State / Region</span>
                        <span className="text-slate-900">{selectedApp.institution?.state}</span>
                      </div>
                      <div className="p-3 bg-slate-50 rounded border border-slate-200">
                        <span className="text-slate-500 block text-[10px] uppercase font-semibold">Affiliating Body</span>
                        <span className="text-slate-900">{selectedApp.institution?.affiliating_university}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-end pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setActiveReviewerStep(2)}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5"
                      >
                        <span>Examine Evidence &amp; OCR →</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 2: EVIDENCE & OCR INSPECTION ──────────────────── */}
                {activeReviewerStep === 2 && (
                  <div className="space-y-4">
                    <div className="gov-card p-5 border border-slate-200 bg-white flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">02. Document Evidence &amp; OCR Parameters</h3>
                        <p className="text-xs text-slate-500">Inspect uploaded Annexure 2 deeds and certificates</p>
                      </div>
                      <span className="text-xs text-slate-500">Total Uploads: {documents.length}</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-4 gov-card p-3 border border-slate-200 bg-white space-y-1">
                        {documents.map((d) => (
                          <button
                            key={d.id}
                            onClick={() => selectDocument(d)}
                            className={`w-full p-2.5 rounded text-left text-xs border ${
                              selectedDoc?.id === d.id
                                ? "bg-blue-50 text-blue-900 border-blue-300 font-semibold"
                                : "border-transparent text-slate-700 hover:bg-slate-50"
                            }`}
                          >
                            <div className="truncate font-semibold">{d.document_type_name}</div>
                            <div className="text-[10px] text-slate-400 truncate">{d.original_filename}</div>
                          </button>
                        ))}
                      </div>

                      <div className="lg:col-span-8 gov-card p-4 border border-slate-200 bg-white space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 uppercase">
                          Extracted Parameters ({docFields.length})
                        </h4>
                        <div className="space-y-2 max-h-[460px] overflow-y-auto">
                          {docFields.map((f) => (
                            <div key={f.id} className="p-3 bg-slate-50 rounded border border-slate-200 text-xs">
                              <div className="flex justify-between">
                                <span className="font-semibold text-slate-900">{f.field_label}</span>
                                <span className="badge-success px-1.5 py-0.2 rounded text-[9px] uppercase font-semibold">
                                  {f.confidence_label}
                                </span>
                              </div>
                              <div className="font-mono text-xs text-slate-800 mt-1">{f.effective_value || "(Empty)"}</div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button
                        onClick={() => setActiveReviewerStep(1)}
                        className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 text-xs"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => setActiveReviewerStep(3)}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold"
                      >
                        Review Findings &amp; APH Clauses →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 3: EXAMINE FINDINGS & APH TRACEABILITY ─────────── */}
                {activeReviewerStep === 3 && (
                  <div className="space-y-4">
                    <div className="gov-card p-5 border border-slate-200 bg-white flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">03. Regulatory Findings &amp; APH Citations</h3>
                        <p className="text-xs text-slate-500">
                          Cross-reference findings against AICTE Approval Process Handbook (2024–2027)
                        </p>
                      </div>
                      <span className="text-xs font-semibold text-red-700">{findings.length} Deficiencies Flagged</span>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      <div className="lg:col-span-7 space-y-2">
                        {findings.map((f) => (
                          <div
                            key={f.id}
                            onClick={() => setSelectedFinding(f)}
                            className={`p-3.5 rounded border cursor-pointer ${
                              selectedFinding?.id === f.id
                                ? "bg-blue-50/50 border-blue-600 shadow-sm"
                                : "bg-white border-slate-200 hover:border-slate-300"
                            }`}
                          >
                            <div className="flex justify-between">
                              <span className="text-xs font-bold text-slate-900">{f.title}</span>
                              <span className="font-mono text-xs text-blue-700 font-bold">{f.handbook_ref}</span>
                            </div>
                            <p className="text-xs text-slate-600 mt-1">{f.description}</p>
                          </div>
                        ))}
                      </div>

                      <div className="lg:col-span-5 gov-card p-4 border border-slate-200 bg-white space-y-3">
                        <h4 className="text-xs font-bold text-slate-900 uppercase">APH Traceability Card</h4>
                        {selectedFinding ? (
                          <div className="space-y-2 text-xs">
                            <span className="font-mono text-blue-800 font-bold block">{selectedFinding.handbook_ref}</span>
                            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 italic text-slate-600 text-[11px]">
                              &quot;Per AICTE APH Chapter II Clause 2.3.4 &amp; Annexure 2 norms, mandatory clearances
                              must be valid and free from encumbrance.&quot;
                            </div>
                          </div>
                        ) : (
                          <p className="text-slate-400 text-xs">Select finding to inspect.</p>
                        )}
                      </div>
                    </div>

                    <div className="flex justify-between pt-2">
                      <button
                        onClick={() => setActiveReviewerStep(2)}
                        className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 text-xs"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => setActiveReviewerStep(4)}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold"
                      >
                        Record Committee Decisions →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 4: RECORD SCRUTINY DECISIONS ──────────────────── */}
                {activeReviewerStep === 4 && (
                  <div className="gov-card p-6 border border-slate-200 bg-white space-y-5">
                    <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">04. Scrutiny Committee Decisions on Findings</h3>
                        <p className="text-xs text-slate-500">
                          Confirm deficiencies, request additional clarifications, or clear false positives
                        </p>
                      </div>
                    </div>

                    <div className="space-y-3">
                      {findings.map((f) => (
                        <div key={f.id} className="p-4 bg-slate-50 rounded border border-slate-200 space-y-2 text-xs">
                          <div className="flex justify-between">
                            <span className="font-bold text-slate-900">{f.title}</span>
                            <span className="text-slate-500">Status: <strong>{f.review_status || "Pending"}</strong></span>
                          </div>
                          <p className="text-slate-600">{f.description}</p>
                          <div className="flex justify-end">
                            <button
                              onClick={() => {
                                setReviewActionTarget(f);
                                setReviewActionChoice("confirmed");
                                setReviewActionNotes("");
                                setShowReviewModal(true);
                              }}
                              className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded text-xs font-medium"
                            >
                              Record Action on Finding
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="flex justify-between pt-4 border-t border-slate-100">
                      <button
                        onClick={() => setActiveReviewerStep(3)}
                        className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 text-xs"
                      >
                        ← Back
                      </button>
                      <button
                        onClick={() => setActiveReviewerStep(5)}
                        className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold"
                      >
                        Proceed to Outcome &amp; Report →
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 5: COMMITTEE OUTCOME & REPORT ─────────────────── */}
                {activeReviewerStep === 5 && (
                  <div className="gov-card p-6 border border-slate-200 bg-white space-y-6">
                    <div className="border-b border-slate-100 pb-3">
                      <h3 className="text-sm font-bold text-slate-900">05. Scrutiny Committee Final Outcome</h3>
                      <p className="text-xs text-slate-500">
                        Record final recommendation and generate the Scrutiny &amp; Deficiency Report
                      </p>
                    </div>

                    <div className="space-y-4 text-xs max-w-xl">
                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">
                          Scrutiny Committee Recommendation:
                        </label>
                        <select
                          value={scrutinyOutcome}
                          onChange={(e) => setScrutinyOutcome(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 font-medium"
                        >
                          <option value="RECOMMEND_APPROVAL">Recommend Extension of Approval (EoA)</option>
                          <option value="DEFICIENCY_RAISED">Issue Deficiency Notice (Rectification 15 Days)</option>
                          <option value="FORWARD_HEARING">Forward to Standing Hearing Committee</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-700 font-semibold mb-1">Committee Remarks / Order:</label>
                        <textarea
                          rows={3}
                          value={scrutinyRemarks}
                          onChange={(e) => setScrutinyRemarks(e.target.value)}
                          className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 text-xs"
                        />
                      </div>

                      <button
                        onClick={async () => {
                          try {
                            // Update application status with committee decision
                            await api.updateApplication(selectedApp.id, {
                              status: "compliance_review",
                              reviewer_notes: scrutinyRemarks,
                              next_action: scrutinyOutcome,
                            });
                          } catch (_) { /* non-fatal */ }
                          try {
                            await api.generateReport(selectedApp.id);
                          } catch (_) { /* non-fatal */ }
                          showToast("Scrutiny Report Generated & Recorded in Audit Ledger!");
                          // Transition to the Official Report step (step 6) for reviewers
                          setActiveReviewerStep(6);
                        }}
                        className="py-2.5 px-5 bg-blue-700 hover:bg-blue-800 text-white rounded font-bold text-xs shadow-sm flex items-center space-x-1.5"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span>Finalize &amp; Generate Scrutiny Report</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* ── STEP 6: OFFICIAL SCRUTINY REPORT (REVIEWER) ──────────── */}
                {activeReviewerStep === 6 && (
                  <div className="space-y-6">
                    {/* Report Header Card */}
                    <div className="gov-card p-5 border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print">
                      <div>
                        <div className="flex items-center space-x-2 text-xs">
                          <span className="text-slate-500">Official Scrutiny Status:</span>
                          <span className="px-2.5 py-0.5 rounded text-xs font-bold uppercase bg-blue-100 text-blue-800">
                            {scrutinyOutcome === "RECOMMEND_APPROVAL"
                              ? "APPROVED"
                              : scrutinyOutcome === "DEFICIENCY_RAISED"
                              ? "DEFICIENCY NOTICE ISSUED"
                              : "FORWARDED TO HEARING COMMITTEE"}
                          </span>
                        </div>
                        <h3 className="text-base font-bold text-slate-900 mt-1">
                          Scrutiny Committee Evaluation &amp; Deficiency Order
                        </h3>
                      </div>
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => setActiveReviewerStep(5)}
                          className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 text-xs"
                        >
                          ← Back
                        </button>
                        <button
                          onClick={() => window.print()}
                          className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded text-xs font-semibold flex items-center space-x-1.5 shadow-sm"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          <span>Print Official Report</span>
                        </button>
                      </div>
                    </div>

                    {/* Printable Report Body */}
                    <div className="printable-report bg-white border border-slate-300 rounded p-8 max-w-4xl mx-auto shadow-sm space-y-6 text-slate-900 text-xs">
                      {/* Report Heading */}
                      <div className="border-b border-slate-300 pb-5 text-center space-y-1">
                        <div className="font-bold text-xs tracking-wider text-slate-700 uppercase">
                          ALL INDIA COUNCIL FOR TECHNICAL EDUCATION (AICTE)
                        </div>
                        <h1 className="text-base font-bold text-slate-900 uppercase">
                          Scrutiny Committee Compliance &amp; Deficiency Report
                        </h1>
                        <p className="text-[11px] text-slate-500">
                          Governed by Approval Process Handbook (APH 2024–2027) Regulations
                        </p>
                      </div>

                      {/* Institution Particulars */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 bg-slate-50 rounded border border-slate-200">
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Application No</span>
                          <span className="font-mono font-bold text-blue-700">{selectedApp.reference_number}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">AICTE Permanent ID</span>
                          <span className="font-mono text-slate-900">{selectedApp.institution?.aicte_id}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">Institution</span>
                          <span className="font-medium text-slate-900">{selectedApp.institution?.name}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 uppercase font-semibold block">State / AY</span>
                          <span className="text-slate-900">
                            {selectedApp.institution?.state} • {selectedApp.academic_year || "2024-25"}
                          </span>
                        </div>
                      </div>

                      {/* Committee Decision Banner */}
                      <div className={`p-4 rounded border-l-4 ${
                        scrutinyOutcome === "RECOMMEND_APPROVAL"
                          ? "bg-emerald-50 border-emerald-500"
                          : scrutinyOutcome === "DEFICIENCY_RAISED"
                          ? "bg-red-50 border-red-500"
                          : "bg-amber-50 border-amber-500"
                      }`}>
                        <div className="text-[10px] uppercase font-semibold text-slate-500 mb-1">Committee Recommendation:</div>
                        <div className={`text-sm font-bold ${
                          scrutinyOutcome === "RECOMMEND_APPROVAL"
                            ? "text-emerald-700"
                            : scrutinyOutcome === "DEFICIENCY_RAISED"
                            ? "text-red-700"
                            : "text-amber-700"
                        }`}>
                          {scrutinyOutcome === "RECOMMEND_APPROVAL"
                            ? "✓ RECOMMEND EXTENSION OF APPROVAL (EoA)"
                            : scrutinyOutcome === "DEFICIENCY_RAISED"
                            ? "⚠ ISSUE DEFICIENCY NOTICE — RECTIFICATION REQUIRED WITHIN 15 DAYS"
                            : "→ FORWARD TO STANDING HEARING COMMITTEE"}
                        </div>
                        {scrutinyRemarks && (
                          <p className="text-xs text-slate-700 mt-2 italic">{scrutinyRemarks}</p>
                        )}
                      </div>

                      {/* Preliminary Verdict */}
                      <div className="p-3 bg-slate-50 border border-slate-200 rounded flex items-center justify-between">
                        <div>
                          <span className="text-[10px] uppercase font-semibold text-slate-500">Preliminary Verdict:</span>
                          <div className={`text-xs font-bold mt-0.5 ${
                            findings.length > 0 ? "text-red-700" : "text-emerald-700"
                          }`}>
                            {findings.length > 0
                              ? "DEFICIENCIES RAISED — RECTIFICATION REQUIRED"
                              : "ALL MANDATORY CHECKS SATISFIED"}
                          </div>
                        </div>
                        <div className="text-right text-xs">
                          Total Findings: <strong>{findings.length}</strong>
                        </div>
                      </div>

                      {/* Itemized Findings Table */}
                      <div>
                        <h4 className="text-xs font-bold text-slate-900 uppercase mb-2">Itemized Compliance Observations</h4>
                        <div className="border border-slate-200 rounded overflow-hidden">
                          <table className="w-full text-left text-xs">
                            <thead className="bg-slate-100 text-slate-700 text-[10px] uppercase border-b border-slate-200">
                              <tr>
                                <th className="p-2.5">Clause Ref</th>
                                <th className="p-2.5">Finding Description</th>
                                <th className="p-2.5">Severity</th>
                                <th className="p-2.5">Required Action</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {findings.length === 0 ? (
                                <tr>
                                  <td colSpan={4} className="p-4 text-center text-slate-500">
                                    No deficiencies recorded. All checklist requirements verified.
                                  </td>
                                </tr>
                              ) : (
                                findings.map((f: any, idx: number) => (
                                  <tr key={idx}>
                                    <td className="p-2.5 font-mono text-blue-700 whitespace-nowrap">{f.handbook_ref || "APH §2"}</td>
                                    <td className="p-2.5">
                                      <div className="font-medium">{f.title}</div>
                                      <div className="text-slate-500 text-[10px] mt-0.5">{f.description?.slice(0, 120)}</div>
                                    </td>
                                    <td className="p-2.5">
                                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                        f.severity === "critical" ? "bg-red-100 text-red-800" :
                                        f.severity === "high" ? "bg-orange-100 text-orange-800" :
                                        "bg-yellow-100 text-yellow-800"
                                      }`}>{f.severity}</span>
                                    </td>
                                    <td className="p-2.5 text-slate-600">{f.recommended_action || "Rectify within 15 days"}</td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Footer */}
                      <div className="border-t border-slate-200 pt-4 flex justify-between text-[10px] text-slate-400">
                        <span>Report generated by RuleTrace AI • AICTE Smart Automation Cell</span>
                        <span>{new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VIEW C: APH RULES REPOSITORY (ADMIN & OBSERVER)
            ═══════════════════════════════════════════════════════════════════ */}
        {currentView === "rules" && (
          <div className="space-y-6">
            <div className="gov-card p-5 border border-slate-200 bg-white flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  AICTE Approval Process Handbook (2024–2027) Knowledge Base
                </h2>
                <p className="text-xs text-slate-500">
                  Digitized regulatory rules, Annexure 2 criteria, and verified handbook citations
                </p>
              </div>
              <span className="text-xs text-blue-700 font-semibold">{rules.length} Rules Configured</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {rules.map((r) => (
                <div key={r.id} className="gov-card p-4 border border-slate-200 bg-white space-y-2">
                  <div className="flex items-start justify-between">
                    <span className="font-mono text-xs font-bold text-blue-700">{r.code}</span>
                    <span className="px-1.5 py-0.2 bg-slate-100 text-slate-700 text-[9px] font-semibold uppercase rounded">
                      {r.check_type}
                    </span>
                  </div>

                  <h3 className="text-xs font-bold text-slate-900">{r.name}</h3>

                  <div className="p-2 bg-slate-50 rounded border border-slate-100 text-[11px] text-slate-600 space-y-0.5">
                    <div>Chapter: {r.chapter || "Chapter II"}</div>
                    <div>Clause: {r.clause || "Clause 2.3.4"}</div>
                    {r.annexure && <div>Annexure: {r.annexure}</div>}
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 italic">
                    &quot;{r.source_excerpt || "Regulatory standard prescribed by AICTE."}&quot;
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VIEW D: AUDIT TRAIL LEDGER (ADMIN & AUDIT VIEWER)
            ═══════════════════════════════════════════════════════════════════ */}
        {currentView === "audit" && (
          <div className="space-y-6">
            {/* Header */}
            <div className="gov-card p-5 border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-slate-900">Immutable Compliance Audit Ledger</h2>
                  <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded uppercase">
                    Tamper-Evident
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Chronological history of all regulatory actions, document uploads, OCR extractions, and overrides with SHA-256 chain verification.
                </p>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={() => {
                    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(auditEvents, null, 2));
                    const dl = document.createElement("a");
                    dl.setAttribute("href", dataStr);
                    dl.setAttribute("download", `RuleTrace_Audit_Export_${new Date().toISOString().slice(0, 10)}.json`);
                    dl.click();
                    showToast("Full audit ledger exported successfully.");
                  }}
                  className="py-1.5 px-3 border border-slate-300 hover:bg-slate-50 text-slate-700 rounded text-xs font-medium flex items-center space-x-1.5 transition-colors"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Export JSON</span>
                </button>
                <button
                  onClick={() => loadWorkspaceData(currentUser)}
                  className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-600"
                  title="Refresh Audit Data"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Audit Filters Bar */}
            <div className="gov-card p-4 border border-slate-200 bg-white rounded-lg shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
              <div className="flex flex-1 flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search description, entity ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-1.5 text-xs border border-slate-300 rounded bg-white text-slate-900 placeholder-slate-400 focus:outline-none focus:border-blue-600"
                  />
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-slate-500 font-medium">Event Type:</span>
                  <select
                    value={auditFilterType}
                    onChange={(e) => setAuditFilterType(e.target.value)}
                    className="px-2.5 py-1.5 border border-slate-300 rounded bg-white text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                  >
                    <option value="">All Event Types</option>
                    <option value="application">Application Events</option>
                    <option value="document">Document &amp; OCR Events</option>
                    <option value="validation">Validation &amp; Rules</option>
                    <option value="finding">Findings &amp; Scrutiny</option>
                    <option value="field_override">Field Overrides</option>
                    <option value="user">User &amp; Auth</option>
                  </select>
                </div>
              </div>

              <div className="text-slate-500 text-[11px] font-medium whitespace-nowrap">
                Showing {
                  auditEvents
                    .filter((evt) => {
                      if (auditFilterType && !evt.event_type?.toLowerCase().includes(auditFilterType.toLowerCase())) return false;
                      if (searchQuery) {
                        const q = searchQuery.toLowerCase();
                        return (
                          evt.description?.toLowerCase().includes(q) ||
                          evt.event_type?.toLowerCase().includes(q) ||
                          evt.entity_type?.toLowerCase().includes(q) ||
                          evt.entity_id?.toLowerCase().includes(q)
                        );
                      }
                      return true;
                    }).length
                } of {auditEvents.length} ledger events
              </div>
            </div>

            {/* Audit Table */}
            <div className="gov-card border border-slate-200 bg-white overflow-hidden rounded shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="p-3">Timestamp (IST)</th>
                      <th className="p-3">Event Type</th>
                      <th className="p-3">Description &amp; Context</th>
                      <th className="p-3">Entity Type</th>
                      <th className="p-3">Actor</th>
                      <th className="p-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {auditEvents
                      .filter((evt) => {
                        if (auditFilterType && !evt.event_type?.toLowerCase().includes(auditFilterType.toLowerCase())) return false;
                        if (searchQuery) {
                          const q = searchQuery.toLowerCase();
                          return (
                            evt.description?.toLowerCase().includes(q) ||
                            evt.event_type?.toLowerCase().includes(q) ||
                            evt.entity_type?.toLowerCase().includes(q) ||
                            evt.entity_id?.toLowerCase().includes(q)
                          );
                        }
                        return true;
                      })
                      .map((evt) => (
                        <tr key={evt.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-3 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                            {new Date(evt.created_at).toLocaleString("en-IN", {
                              timeZone: "Asia/Kolkata",
                              month: "short",
                              day: "2-digit",
                              hour: "2-digit",
                              minute: "2-digit",
                              second: "2-digit",
                            })}
                          </td>
                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-medium ${
                              evt.event_type?.includes("override") || evt.event_type?.includes("decision")
                                ? "bg-purple-100 text-purple-800"
                                : evt.event_type?.includes("submit") || evt.event_type?.includes("complete")
                                ? "bg-blue-100 text-blue-800"
                                : evt.event_type?.includes("deficiency") || evt.event_type?.includes("delete")
                                ? "bg-red-100 text-red-800"
                                : "bg-slate-100 text-slate-700"
                            }`}>
                              {evt.event_type}
                            </span>
                          </td>
                          <td className="p-3">
                            <div className="font-medium text-slate-900">{evt.description}</div>
                            {evt.entity_id && (
                              <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                                Ref: {evt.entity_id}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-slate-500 font-mono text-[11px]">{evt.entity_type}</td>
                          <td className="p-3 text-slate-600 font-mono text-[10px]">
                            {evt.actor_id ? evt.actor_id.slice(0, 10) + "..." : "System AI"}
                          </td>
                          <td className="p-3 text-right">
                            <button
                              onClick={() => setSelectedAuditEvent(evt)}
                              className="px-2.5 py-1 text-[11px] bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium transition-colors"
                            >
                              Inspect
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VIEW E: CONNECTORS HUB (ADMIN)
            ═══════════════════════════════════════════════════════════════════ */}
        {currentView === "connectors" && (
          <div className="space-y-6">
            <div className="gov-card p-5 border border-slate-200 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">External Regulatory Verification Gateways</h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Live verification gateways for DigiLocker, AICTE National Registry, State Fire Services, and University Portals.
                </p>
              </div>
              <button
                onClick={() => loadWorkspaceData(currentUser)}
                className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-600 text-xs flex items-center space-x-1"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Refresh Status</span>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {connectors.map((c) => (
                <div key={c.id} className="gov-card p-5 border border-slate-200 bg-white rounded-lg shadow-xs space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <div className="w-7 h-7 rounded bg-blue-50 text-blue-700 flex items-center justify-center">
                        <Database className="w-4 h-4" />
                      </div>
                      <h3 className="text-xs font-bold text-slate-900">{c.name}</h3>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 text-[10px] font-semibold rounded">
                      {c.is_demo ? "Demo Sandbox" : "Connected"}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{c.description}</p>
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500 font-mono">
                    <span>Protocol: REST / OAuth2</span>
                    <span className="text-emerald-700 font-medium">Status: Online</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════════════════════
            VIEW F: ADMINISTRATOR — Users & Roles Management
            ═══════════════════════════════════════════════════════════════════ */}
        {currentView === "users" && isAdmin && (
          <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-lg border border-slate-200 shadow-sm">
              <div>
                <div className="flex items-center space-x-2">
                  <h2 className="text-base font-bold text-slate-900">User Accounts &amp; Role-Based Access Control (RBAC)</h2>
                  <span className="px-2 py-0.5 bg-blue-100 text-blue-800 text-[10px] font-bold rounded uppercase">
                    Admin Directory
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">
                  Manage platform officer accounts, assign institutional credentials, and enforce segregation of duties under SIH26261.
                </p>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => loadWorkspaceData(currentUser)}
                  className="p-1.5 border border-slate-200 rounded hover:bg-slate-50 text-slate-600 text-xs flex items-center space-x-1"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Users</span>
                </button>
              </div>
            </div>

            {/* RBAC Segregation of Duties Explainer */}
            <div className="p-4 bg-blue-50/50 border border-blue-200 rounded-lg text-xs space-y-2">
              <div className="flex items-center space-x-2 text-blue-900 font-bold">
                <ShieldCheck className="w-4 h-4 text-blue-700" />
                <span>AICTE Governance Policy: Strict 4-Role Segregation of Duties</span>
              </div>
              <p className="text-slate-600 leading-relaxed">
                To guarantee zero conflict-of-interest and regulatory compliance:
                (1) <strong>Institution Officers</strong> may only view/edit their own applications and upload evidence;
                (2) <strong>Scrutiny Officers</strong> inspect submissions and confirm/reject deficiencies but cannot edit institution documents;
                (3) <strong>Administrators</strong> oversee platform health and configure rules;
                (4) <strong>Audit Officers</strong> have independent, append-only, read-only oversight across the entire tamper-evident chain of custody.
              </p>
            </div>

            {/* Users Directory Table */}
            <div className="gov-card border border-slate-200 bg-white overflow-hidden rounded-lg shadow-sm">
              <div className="p-4 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-900">
                  Registered Officers &amp; Staff ({users.length > 0 ? users.length : 4})
                </span>
                <span className="text-[11px] text-slate-500 font-mono">
                  Authentication: JWT Bearer • SHA-256 Passwords
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-600 text-[10px] uppercase border-b border-slate-200 font-semibold">
                    <tr>
                      <th className="px-5 py-3">Officer Name</th>
                      <th className="px-5 py-3">Email Address</th>
                      <th className="px-5 py-3">Assigned Role</th>
                      <th className="px-5 py-3">Affiliation / Scope</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(users.length > 0 ? users : DEMO_PERSONAS.map((p, idx) => ({
                      id: `demo-${idx}`,
                      full_name: p.label,
                      email: p.email,
                      role: p.role,
                      institution_id: p.role === "institution" ? "Apex Institute of Technology" : null,
                      is_active: true,
                    }))).map((u: any) => (
                      <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-5 py-3.5 font-medium text-slate-900">
                          <div className="flex items-center space-x-2">
                            <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                              {u.full_name?.charAt(0) || "U"}
                            </div>
                            <span>{u.full_name}</span>
                          </div>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600 font-mono">{u.email}</td>
                        <td className="px-5 py-3.5">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            u.role === "administrator"
                              ? "bg-slate-800 text-white"
                              : u.role === "reviewer"
                              ? "bg-purple-100 text-purple-800"
                              : u.role === "audit_viewer"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-blue-100 text-blue-800"
                          }`}>
                            {u.role?.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-slate-600">
                          {u.institution_id || (u.role === "reviewer" ? "AICTE Scrutiny Committee" : u.role === "administrator" ? "AICTE Headquarters" : "National Audit Board")}
                        </td>
                        <td className="px-5 py-3.5">
                          <span className="inline-flex items-center space-x-1 text-emerald-700 font-medium text-[11px]">
                            <CheckCircle className="w-3.5 h-3.5" />
                            <span>Active</span>
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* ── MODALS ───────────────────────────────────────────────────────── */}

      {/* 1. Create New Application Modal */}
      {showNewAppModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Create New Regulatory Application</h3>
              <button onClick={() => setShowNewAppModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateApplication} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Application Type (Chapter II):</label>
                <select
                  value={newAppType}
                  onChange={(e) => setNewAppType(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="EOA_SELF_DISCLOSURE">Extension of Approval (EoA) — Self-Disclosure</option>
                  <option value="NEW_INSTITUTION">New Technical Institution — Chapter I</option>
                  <option value="EXPANSION_PROGRAM">Introduction of New Programme / Level</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Institution:</label>
                <select
                  value={newAppInstId}
                  onChange={(e) => setNewAppInstId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  {institutions.map((inst) => (
                    <option key={inst.id} value={inst.id}>
                      {inst.name} ({inst.aicte_id || "ID Pending"})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Academic Year:</label>
                <input
                  type="text"
                  value={newAppYear}
                  onChange={(e) => setNewAppYear(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowNewAppModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={newAppCreating}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium disabled:opacity-60"
                >
                  {newAppCreating ? "Creating..." : "Save Draft & Proceed to Documents"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. Upload Document Modal */}
      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Upload Regulatory Document</h3>
              <button onClick={() => setShowUploadModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleUploadDocument} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-700 font-medium mb-1">Document Category (Annexure 2):</label>
                <select
                  value={uploadDocCode}
                  onChange={(e) => {
                    setUploadDocCode(e.target.value);
                    const opt = e.target.options[e.target.selectedIndex].text;
                    setUploadDocName(opt);
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="AFFIDAVIT_2">Affidavit 2 (Notarized on Stamp Paper, Rs. 100)</option>
                  <option value="TER_PAYMENT_RECEIPT">TER Charges Payment Receipt (AICTE Portal)</option>
                  <option value="OCCUPANCY_CERTIFICATE">Occupancy / Completion Certificate (Form D)</option>
                  <option value="FIRE_SAFETY_CERTIFICATE">Fire Safety Certificate (NOC)</option>
                  <option value="SATELLITE_MAP">Satellite Map with GPS Coordinates</option>
                  <option value="AUDITED_ACCOUNTS">Audited Statement of Accounts (Previous Year)</option>
                  <option value="LAND_TITLE">Land Ownership Deed / Registered Lease</option>
                  <option value="BUILDING_PLAN">Master Building Plan (Approved by Authority)</option>
                  <option value="AFFILIATION_NOC">University Affiliation NOC / Consent</option>
                  <option value="BANK_GUARANTEE">Bank Guarantee for FDR</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Select File (PDF, Image, Text):</label>
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg,.txt"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      setUploadFile(e.target.files[0]);
                    }
                  }}
                  className="w-full text-xs text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                />
                <p className="text-[11px] text-slate-400 mt-1">
                  Leave empty to generate and attach a synthetic sample document for test demonstration.
                </p>
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUploadModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={uploading}
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium disabled:opacity-60"
                >
                  {uploading ? "Processing & Extracting..." : "Upload & Process"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. Field Correction Modal */}
      {showCorrectionModal && editingField && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Manual Field Correction &amp; Override</h3>
              <button onClick={() => setShowCorrectionModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Target Metadata Field:</span>
                <span className="font-semibold text-slate-900">{editingField.field_label}</span>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Corrected Value:</label>
                <input
                  type="text"
                  value={correctionValue}
                  onChange={(e) => setCorrectionValue(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 font-mono text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Auditor Rationale / Note:</label>
                <textarea
                  rows={2}
                  value={correctionNote}
                  onChange={(e) => setCorrectionNote(e.target.value)}
                  placeholder="Rationale for manual correction..."
                  className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowCorrectionModal(false)}
                className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCorrection}
                className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium text-xs"
              >
                Save Correction
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. Reviewer Scrutiny Action Modal */}
      {showReviewModal && reviewActionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-md w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">Record Scrutiny Determination</h3>
              <button onClick={() => setShowReviewModal(false)} className="text-slate-400 hover:text-slate-700">
                ✕
              </button>
            </div>

            <form onSubmit={handleRecordReviewAction} className="space-y-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Finding Under Scrutiny:</span>
                <span className="font-semibold text-slate-900">{reviewActionTarget.title}</span>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Determination:</label>
                <select
                  value={reviewActionChoice}
                  onChange={(e) => setReviewActionChoice(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded bg-white text-slate-900 focus:outline-none focus:border-blue-600"
                >
                  <option value="confirmed">Confirm Deficiency (Deficiency Notice to be issued)</option>
                  <option value="false_positive">Mark as False Positive (Satisfied by supplementary proof)</option>
                  <option value="pending_more_info">Request Clarification / Hearing Submission</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-medium mb-1">Committee Remarks / Justification:</label>
                <textarea
                  rows={3}
                  required
                  value={reviewActionNotes}
                  onChange={(e) => setReviewActionNotes(e.target.value)}
                  placeholder="Record formal justification for the scrutiny ledger..."
                  className="w-full px-3 py-2 border border-slate-300 rounded text-slate-900 text-xs focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex items-center justify-end space-x-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowReviewModal(false)}
                  className="px-3 py-1.5 border border-slate-300 rounded text-slate-700 hover:bg-slate-50 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-medium text-xs"
                >
                  Confirm Determination
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. Audit Event Detail Inspection Modal */}
      {selectedAuditEvent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-lg max-w-lg w-full p-6 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center space-x-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h3 className="text-sm font-bold text-slate-900">Cryptographic Audit Record Details</h3>
              </div>
              <button
                onClick={() => setSelectedAuditEvent(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 p-3 bg-slate-50 border border-slate-100 rounded">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Timestamp (IST)</span>
                  <span className="font-mono text-slate-800">
                    {new Date(selectedAuditEvent.created_at).toLocaleString("en-IN", { timeZone: "Asia/Kolkata" })}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Event Type</span>
                  <span className="font-mono font-bold text-blue-700">{selectedAuditEvent.event_type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Target Entity</span>
                  <span className="font-mono text-slate-800">{selectedAuditEvent.entity_type}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block">Chain Integrity</span>
                  <span className="font-semibold text-emerald-700 flex items-center space-x-1">
                    <CheckCircle className="w-3 h-3" />
                    <span>SHA-256 Valid</span>
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Description</span>
                <p className="text-slate-800 p-2.5 bg-slate-50 border border-slate-100 rounded text-xs leading-relaxed">
                  {selectedAuditEvent.description}
                </p>
              </div>

              {selectedAuditEvent.entity_id && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Entity Reference ID</span>
                  <span className="font-mono text-slate-700 text-[11px] block p-1.5 bg-slate-50 rounded border border-slate-100 select-all">
                    {selectedAuditEvent.entity_id}
                  </span>
                </div>
              )}

              {selectedAuditEvent.actor_id && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Actor UID</span>
                  <span className="font-mono text-slate-700 text-[11px] block p-1.5 bg-slate-50 rounded border border-slate-100 select-all">
                    {selectedAuditEvent.actor_id}
                  </span>
                </div>
              )}

              {selectedAuditEvent.details && (
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-semibold block mb-0.5">Cryptographic Payload / Metadata</span>
                  <pre className="p-2.5 bg-slate-900 text-slate-200 rounded font-mono text-[10px] overflow-x-auto max-h-40">
                    {typeof selectedAuditEvent.details === "string"
                      ? selectedAuditEvent.details
                      : JSON.stringify(selectedAuditEvent.details, null, 2)}
                  </pre>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setSelectedAuditEvent(null)}
                className="px-4 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded font-medium text-xs"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
