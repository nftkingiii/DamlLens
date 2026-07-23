import { Link, useRouterState } from "@tanstack/react-router";
import {
  Activity,
  AlertTriangle,
  Braces,
  Blocks,
  ChevronLeft,
  ChevronRight,
  Code2,
  FileStack,
  Gauge,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  Plus,
  RefreshCw,
  X,
} from "lucide-react";
import { createContext, useContext, useState, type ReactNode } from "react";
import { useLens } from "@/lib/lens";

const nav = [
  { href: "/app", label: "Overview", icon: Gauge },
  { href: "/app/timeline", label: "Timeline", icon: Activity },
  { href: "/app/contracts", label: "Contracts", icon: FileStack },
  { href: "/app/parties", label: "Authority", icon: Network },
  { href: "/app/alerts", label: "Alerts", icon: AlertTriangle },
  { href: "/model", label: "Workflow model", icon: Code2 },
  { href: "/app/raw-data", label: "Raw data", icon: Braces },
];

const SidebarContext = createContext({ collapsed: false });
export const useSidebar = () => useContext(SidebarContext);

export function LensShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const { connection, backend, analysis, config, busy, loadContracts } = useLens();

  return (
    <SidebarContext.Provider value={{ collapsed }}>
      <div className={`lens-workspace ${collapsed ? "sidebar-collapsed" : ""}`}>
        <aside className="lens-sidebar" aria-label="Primary navigation">
          <div className="sidebar-brand">
            <Link to="/" className="brand-link" aria-label="DamlLens home">
              <img src="/damllens-logo-v2.png" alt="" />
              {!collapsed && <span>DamlLens</span>}
            </Link>
            <button
              className="icon-button sidebar-toggle"
              onClick={() => setCollapsed((value) => !value)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? <PanelLeftOpen /> : <PanelLeftClose />}
            </button>
          </div>

          <nav className="sidebar-nav">
            {nav.map((item) => {
              const active =
                item.href === "/app" ? pathname === "/app" : pathname.startsWith(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  to={item.href}
                  className={`sidebar-link ${active ? "active" : ""}`}
                  title={collapsed ? item.label : undefined}
                  onClick={() => setMobileOpen(false)}
                >
                  <Icon />
                  {!collapsed && <span>{item.label}</span>}
                </Link>
              );
            })}
          </nav>

          <div className="sidebar-foot">
            <div
              className="participant-card"
              title={collapsed ? `Participant: ${connection}` : undefined}
            >
              <span className={`connection-dot ${connection}`} />
              {!collapsed && (
                <div>
                  <strong>
                    {connection === "connected" ? "Participant connected" : "Participant offline"}
                  </strong>
                  <span>
                    {analysis.source.includes("Illustrative") ? "Preview data" : "Canton DevNet"}
                  </span>
                </div>
              )}
            </div>
          </div>
        </aside>

        <header className="mobile-header">
          <Link to="/" className="brand-link">
            <img src="/damllens-logo-v2.png" alt="" />
            <span>DamlLens</span>
          </Link>
          <button
            className="icon-button"
            onClick={() => setMobileOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </button>
        </header>

        {mobileOpen && (
          <div className="mobile-drawer" role="dialog" aria-modal="true" aria-label="Navigation">
            <button
              className="drawer-scrim"
              onClick={() => setMobileOpen(false)}
              aria-label="Close navigation"
            />
            <div className="drawer-panel">
              <div className="drawer-head">
                <span>Navigate</span>
                <button
                  className="icon-button"
                  onClick={() => setMobileOpen(false)}
                  aria-label="Close navigation"
                >
                  <X />
                </button>
              </div>
              {nav.map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.href}
                    to={item.href}
                    className="sidebar-link"
                    onClick={() => setMobileOpen(false)}
                  >
                    <Icon />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        <div className="app-column">
          <header className="app-topbar">
            <div className="topbar-context">
              <div>
                <span>Environment</span>
                <strong>
                  {analysis.source.includes("Illustrative") ? "Preview" : "Canton DevNet"}
                </strong>
              </div>
              <div>
                <span>Selected workflow</span>
                <strong>{analysis.workflowId}</strong>
              </div>
              <div>
                <span>Connection</span>
                <strong className={`connection-label ${connection}`}>{connection}</strong>
              </div>
              <div>
                <span>Backend</span>
                <strong className={`connection-label ${backend}`}>{backend}</strong>
              </div>
            </div>
            <div className="topbar-actions">
              <button
                className="icon-button"
                onClick={() => loadContracts()}
                disabled={backend !== "online" || !config.bearerToken || !!busy}
                aria-label="Refresh workflow"
                title="Refresh workflow"
              >
                <RefreshCw className={busy ? "spin" : ""} />
              </button>
              <Link to="/app/analyze" className="button primary compact">
                <Plus />
                New analysis
              </Link>
            </div>
          </header>
          <main className="lens-main">{children}</main>
        </div>
      </div>
    </SidebarContext.Provider>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <header className="page-header">
      <div>
        <span className="eyebrow">{eyebrow}</span>
        <h1>{title}</h1>
        <p>{description}</p>
      </div>
      {actions && <div className="page-actions">{actions}</div>}
    </header>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const safe = status.toLowerCase().replaceAll(" ", "-");
  return (
    <span className={`status-badge ${safe}`}>
      <span />
      {status}
    </span>
  );
}

export function EmptyState({
  icon: Icon = Blocks,
  title,
  body,
}: {
  icon?: typeof Blocks;
  title: string;
  body: string;
}) {
  return (
    <div className="empty-state">
      <Icon />
      <strong>{title}</strong>
      <p>{body}</p>
    </div>
  );
}

export function Pager({
  index,
  count,
  previous,
  next,
}: {
  index: number;
  count: number;
  previous: () => void;
  next: () => void;
}) {
  return (
    <div className="pager">
      <button
        className="icon-button"
        onClick={previous}
        disabled={index === 0}
        aria-label="Previous event"
        title="Previous event"
      >
        <ChevronLeft />
      </button>
      <span>
        {String(index + 1).padStart(2, "0")} / {String(count).padStart(2, "0")}
      </span>
      <button
        className="icon-button"
        onClick={next}
        disabled={index >= count - 1}
        aria-label="Next event"
        title="Next event"
      >
        <ChevronRight />
      </button>
    </div>
  );
}
