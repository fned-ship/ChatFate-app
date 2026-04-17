import { useEffect, useState, useCallback } from "react";
import Cookies from "js-cookie";
import "./ModeratorReports.css";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ReportUser {
  _id: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  userName?: string;
  numOfReports?: number;
}

interface Report {
  _id: string;
  victimId?: ReportUser;
  reportedId?: ReportUser;
  report?: string;
  importance?: number;
  ai?: boolean;
  images?: string[];
  createdAt?: string;
}

type TabType = "human" | "ai";
type ActionType = "none" | "ban" | "delete";
type ToastType = "success" | "error" | null;

// ── Helpers ───────────────────────────────────────────────────────────────────

const API_BASE = import.meta.env.VITE_SERVER_URL ?? "";

function displayName(user?: ReportUser): string {
  if (!user) return "—";
  const full = [user.firstName, user.lastName].filter(Boolean).join(" ").trim();
  return full || user.userName || user.email || user._id;
}

function fmtDate(d?: string) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

// ── Toast ─────────────────────────────────────────────────────────────────────

function Toast({ message, type }: { message: string; type: ToastType }) {
  if (!type) return null;
  return (
    <div className={`mr-toast mr-toast-${type}`}>
      <span className="mr-toast-dot" />
      {message}
    </div>
  );
}

// ── BanInput ──────────────────────────────────────────────────────────────────

function BanInput({
  onConfirm,
  onCancel,
}: {
  onConfirm: (days: number) => void;
  onCancel: () => void;
}) {
  const [days, setDays] = useState(3);
  return (
    <div className="mr-ban-row">
      <span className="mr-ban-label">Ban duration:</span>
      <input
        className="mr-ban-input"
        type="number"
        min={1}
        max={365}
        value={days}
        onChange={(e) => setDays(Number(e.target.value))}
      />
      <span className="mr-ban-label">days</span>
      <button className="mr-ban-confirm" onClick={() => onConfirm(days)}>
        Confirm ban
      </button>
      <button className="mr-ban-cancel" onClick={onCancel}>
        Cancel
      </button>
    </div>
  );
}

// ── ReportCard ────────────────────────────────────────────────────────────────

function ReportCard({
  report,
  onAction,
  loading,
}: {
  report: Report;
  onAction: (id: string, action: ActionType, days?: number) => void;
  loading: boolean;
}) {
  const [showBan, setShowBan] = useState(false);
  const [exiting, setExiting] = useState(false);
  const imp = report.importance ?? 1;
  const isHighImp = imp >= 3;

  const triggerAction = (action: ActionType, days?: number) => {
    setExiting(true);
    setTimeout(() => onAction(report._id, action, days), 230);
  };

  return (
    <div className={`mr-card${exiting ? " mr-card-exiting" : ""}`}>
      <div className="mr-card-top">
        {/* Left: content */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="mr-badges">
            <span className={`mr-badge ${report.ai ? "mr-badge-ai" : "mr-badge-human"}`}>
              {report.ai ? "AI" : "Human"}
            </span>
            <span className={`mr-badge mr-badge-imp${isHighImp ? " mr-badge-imp-high" : ""}`}>
              imp {imp}
            </span>
          </div>

          <p className="mr-report-text">{report.report ?? ""}</p>

          {report.images && report.images.length > 0 && (
            <div className="mr-images">
              {report.images.map((img) => (
                <img
                  key={img}
                  className="mr-img-thumb"
                  src={`${API_BASE}/${img}`}
                  alt="report"
                  onClick={() => window.open(`${API_BASE}/${img}`, "_blank")}
                  onError={(e) => ((e.currentTarget as HTMLImageElement).style.display = "none")}
                />
              ))}
            </div>
          )}

          <div className="mr-users">
            <div className="mr-user-chip">
              <span className="mr-user-chip-label">Reporter</span>
              <span className="mr-user-name">{displayName(report.victimId)}</span>
              {report.victimId?.email && (
                <>
                  <span className="mr-divider">·</span>
                  <span className="mr-user-email">{report.victimId.email}</span>
                </>
              )}
            </div>
            <div className="mr-user-chip">
              <span className="mr-user-chip-label">Reported</span>
              <span className="mr-user-name">{displayName(report.reportedId)}</span>
              {report.reportedId?.email && (
                <>
                  <span className="mr-divider">·</span>
                  <span className="mr-user-email">{report.reportedId.email}</span>
                </>
              )}
            </div>
          </div>

          <p className="mr-date">{fmtDate(report.createdAt)}</p>
        </div>

        {/* Right: actions */}
        <div className="mr-actions">
          <button
            className="mr-action-btn mr-action-btn-none"
            disabled={loading}
            onClick={() => triggerAction("none")}
          >
            <span className="mr-action-btn-icon">✕</span>
            Dismiss
          </button>
          <button
            className="mr-action-btn mr-action-btn-ban"
            disabled={loading}
            onClick={() => setShowBan((v) => !v)}
          >
            <span className="mr-action-btn-icon">⏸</span>
            Ban user
          </button>
          <button
            className="mr-action-btn mr-action-btn-delete"
            disabled={loading}
            onClick={() => {
              if (
                window.confirm(
                  `Permanently ban ${displayName(report.reportedId)}?\nThis sets a 10-year ban and clears all their reports.`
                )
              ) {
                triggerAction("delete");
              }
            }}
          >
            <span className="mr-action-btn-icon">✕</span>
            Delete account
          </button>
        </div>
      </div>

      {showBan && (
        <BanInput
          onConfirm={(days) => {
            setShowBan(false);
            triggerAction("ban", days);
          }}
          onCancel={() => setShowBan(false)}
        />
      )}
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function ModeratorReports() {
  const token = Cookies.get("token");

  const [tab, setTab] = useState<TabType>("human");
  const [reports, setReports] = useState<Report[]>([]);
  const [loadingList, setLoadingList] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type: ToastType }>({
    message: "",
    type: null,
  });

  const showToast = useCallback((message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: "", type: null }), 3200);
  }, []);

  const fetchReports = useCallback(
    async (type: TabType) => {
      setLoadingList(true);
      const url = type === "ai" ? `${API_BASE}/api/ai/reports` : `${API_BASE}/api/reports`;
      try {
        const res = await fetch(url, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load reports");
        const data: Report[] = await res.json();
        setReports(data);
      } catch (e) {
        showToast((e as Error).message, "error");
      } finally {
        setLoadingList(false);
      }
    },
    [token, showToast]
  );

  useEffect(() => {
    fetchReports(tab);
  }, [tab, fetchReports]);

  const handleAction = useCallback(
    async (reportId: string, action: ActionType, banDays?: number) => {
      setActionLoading(reportId);
      try {
        const res = await fetch(`${API_BASE}/api/reports/${reportId}/action`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ action, ...(banDays !== undefined && { banDays }) }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message ?? data.error ?? "Action failed");
        showToast(data.message ?? "Action taken.", "success");
        setReports((prev) => prev.filter((r) => r._id !== reportId));
      } catch (e) {
        showToast((e as Error).message, "error");
      } finally {
        setActionLoading(null);
      }
    },
    [token, showToast]
  );

  const total           = reports.length;
  const highImp         = reports.filter((r) => (r.importance ?? 1) >= 3).length;
  const uniqueReporters = new Set(reports.map((r) => r.victimId?._id)).size;

  return (
    <div className="mr-page">
      <div className="mr-header">
        <h1 className="mr-title">
          Reports
          <span>{tab === "human" ? "Human" : "AI"}</span>
        </h1>

        <div className="mr-tabs">
          {(["human", "ai"] as TabType[]).map((t) => (
            <button
              key={t}
              className={`mr-tab${tab === t ? " activee" : ""}`}
              onClick={() => setTab(t)}
            >
              <span className={`mr-tab-dot mr-tab-dot-${t}`} />
              {t === "human" ? "Human reports" : "AI reports"}
            </button>
          ))}
        </div>
      </div>

      <div className="mr-stats">
        {[
          { label: "Total reports",     value: total },
          { label: "High importance",   value: highImp },
          { label: "Unique reporters",  value: uniqueReporters },
        ].map(({ label, value }) => (
          <div key={label} className="mr-stat">
            <p className="mr-stat-label">{label}</p>
            <p className="mr-stat-value">{value}</p>
          </div>
        ))}
      </div>

      <div className="mr-list">
        {loadingList ? (
          <div className="mr-loading">
            <span className="mr-spinner" />
            Loading reports…
          </div>
        ) : reports.length === 0 ? (
          <p className="mr-empty">No reports found.</p>
        ) : (
          reports.map((r) => (
            <ReportCard
              key={r._id}
              report={r}
              onAction={handleAction}
              loading={actionLoading === r._id}
            />
          ))
        )}
      </div>

      <Toast message={toast.message} type={toast.type} />
    </div>
  );
}