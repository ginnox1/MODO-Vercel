import { useState } from "react";
import { useAuth } from "@/_core/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import { ArrowLeft, Check, Download, Loader2, Moon, ShieldCheck, Sun } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { Area, AreaChart, Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

export default function Admin() {
  const { theme, toggleTheme } = useTheme();
  const { user, loading } = useAuth();
  const [days, setDays] = useState<1 | 7 | 30 | 90>(7);
  const entries = trpc.waitlist.list.useQuery(undefined, { enabled: Boolean(user?.role === "admin"), retry: false });
  const utils = trpc.useUtils();
  const approve = trpc.waitlist.approve.useMutation({
    onSuccess: (result) => {
      toast.success(result.notified ? "Approved — confirmation sent to the member." : "Approved, but the confirmation message could not be delivered.");
      void utils.waitlist.list.invalidate();
      void utils.analytics.summary.invalidate();
    },
    onError: (error) => toast.error(error.message),
  });
  const analytics = trpc.analytics.summary.useQuery({ days }, { enabled: Boolean(user?.role === "admin"), retry: false });

  return (
    <DashboardLayout>
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <p className="admin-kicker"><ShieldCheck size={15} /> Protected workspace</p>
            <h1>Founding circle</h1>
            <p>Review the people who want to make room with MODO.</p>
          </div>
          <div className="flex items-center gap-4">
            <button
              className="theme-toggle"
              type="button"
              onClick={toggleTheme}
              aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
              title={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            >
              {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
              <span>{theme === "dark" ? "LIGHT" : "DARK"}</span>
            </button>
            <Link className="admin-back" href="/"><ArrowLeft size={16} /> Back to MODO</Link>
          </div>
        </header>
        {loading ? <div className="admin-empty">Checking access…</div> : user?.role !== "admin" ? (
          <div className="admin-empty"><ShieldCheck size={28} /><h2>Admin access required</h2><p>This area is reserved for the MODO owner account.</p></div>
        ) : entries.isLoading ? (
          <div className="admin-empty">Loading founding members…</div>
        ) : entries.isError ? (
          <div className="admin-empty"><h2>Could not load entries</h2><p>Refresh and try again.</p></div>
        ) : (
          <>
          <section className="analytics-card">
            <div className="analytics-top"><div><p className="admin-kicker">Traffic intelligence</p><h2>Analytics</h2><p>Page views, acquisition, browser mix, and timezone context.</p></div><div className="period-tabs" role="group" aria-label="Analytics period">{([[1, "Today"], [7, "7 days"], [30, "1 month"], [90, "90 days"]] as const).map(([value, label]) => <button key={value} type="button" className={days === value ? "active" : ""} onClick={() => setDays(value)}>{label}</button>)}</div></div>
            {analytics.isLoading ? <div className="analytics-empty">Loading analytics…</div> : analytics.isError ? <div className="analytics-empty">Analytics are temporarily unavailable.</div> : <>
              <div className="analytics-stat-grid"><div><span className="analytics-stat">{analytics.data?.totalViews ?? 0}</span><span>page views</span></div><div><span className="analytics-stat">{analytics.data?.waitlistSignups ?? 0}</span><span>waitlist signups</span></div><div><span className="analytics-stat">{analytics.data?.sources[0]?.label ?? "—"}</span><span>top source</span></div></div>
              <div className="analytics-charts"><TrafficChart data={analytics.data?.series ?? []} hourly={analytics.data?.hourly ?? false} /><FunnelChart data={analytics.data?.funnel ?? []} /></div>
              <div className="analytics-breakdowns"><AnalyticsList title="Source" items={analytics.data?.sources ?? []} /><AnalyticsList title="Browser" items={analytics.data?.browsers ?? []} /><AnalyticsList title="Location / timezone" items={analytics.data?.locations ?? []} /></div>
            </>}
          </section>
          <section className="admin-card">
            <div className="admin-card-top"><div><span className="admin-count">{entries.data?.length ?? 0}</span><span>founding members</span></div><button className="admin-export" type="button" disabled><Download size={15} /> Export coming soon</button></div>
            {entries.data?.length ? <div className="admin-table-wrap"><table><thead><tr><th>Name</th><th>Phone</th><th>Updates</th><th>Status</th><th>Joined</th></tr></thead><tbody>{entries.data.map((entry) => <tr key={entry.id}><td>{entry.fullName}</td><td>{entry.phone}</td><td>{entry.notificationPreference === "telegram" ? `Telegram${entry.telegramHandle ? ` · ${entry.telegramHandle}` : " · opted in"}` : "Phone"}</td><td><StatusCell status={entry.onboardingStatus} linked={Boolean(entry.telegramUserId)} pending={approve.isPending && approve.variables?.id === entry.id} onApprove={() => approve.mutate({ id: entry.id })} /></td><td>{new Date(entry.createdAt).toLocaleDateString()}</td></tr>)}</tbody></table></div> : <div className="admin-empty table-empty"><h2>No members yet</h2><p>New founding-member submissions will appear here.</p></div>}
          </section>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}

function AnalyticsList({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  return <div className="analytics-list"><h3>{title}</h3>{items.length ? items.map((item) => <div className="analytics-row" key={item.label}><span>{item.label}</span><strong>{item.count}</strong></div>) : <p className="analytics-muted">No data yet</p>}</div>;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING_TG: "Awaiting Telegram",
  JOIN_REQUESTED: "Requested to join",
  JOINED_TG: "In channel",
  RESERVED: "Reserved",
  PAID: "Paid",
};

function StatusCell({ status, linked, pending, onApprove }: { status: string; linked: boolean; pending: boolean; onApprove: () => void }) {
  const label = status === "PENDING_TG" && linked ? "Linked, not requested" : STATUS_LABELS[status] ?? status;
  return (
    <div className="admin-status">
      <span className={`admin-status-pill ${status === "JOIN_REQUESTED" ? "attention" : ""}`}>{label}</span>
      {status === "JOIN_REQUESTED" && (
        <button type="button" className="admin-approve" onClick={onApprove} disabled={pending}>
          {pending ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
        </button>
      )}
    </div>
  );
}

const CHART_TICK = { fill: "currentColor", fillOpacity: 0.6, fontSize: 10 };
const CHART_TOOLTIP = { contentStyle: { background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 3, color: "var(--ink)", fontSize: 11 }, cursor: { stroke: "currentColor", strokeOpacity: 0.2 } };

function bucketLabel(bucket: string, hourly: boolean) {
  return hourly ? `${String(new Date(`${bucket}:00:00Z`).getHours()).padStart(2, "0")}:00` : bucket.slice(5);
}

function TrafficChart({ data, hourly }: { data: { bucket: string; views: number; signups: number }[]; hourly: boolean }) {
  return (
    <div className="analytics-chart">
      <h3>Views &amp; signups</h3>
      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={data} margin={{ top: 6, right: 6, bottom: 0, left: -22 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.12} vertical={false} />
          <XAxis dataKey="bucket" tickFormatter={(value: string) => bucketLabel(value, hourly)} tick={CHART_TICK} tickLine={false} axisLine={false} minTickGap={24} />
          <YAxis allowDecimals={false} tick={CHART_TICK} tickLine={false} axisLine={false} />
          <Tooltip {...CHART_TOOLTIP} labelFormatter={(value: string) => bucketLabel(value, hourly)} />
          <Legend iconType="line" wrapperStyle={{ fontSize: 10 }} />
          <Area type="monotone" dataKey="views" name="Page views" stroke="var(--rust)" fill="var(--rust)" fillOpacity={0.22} strokeWidth={2} />
          <Area type="monotone" dataKey="signups" name="Signups" stroke="currentColor" fill="currentColor" fillOpacity={0.12} strokeWidth={2} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

function FunnelChart({ data }: { data: { stage: string; count: number }[] }) {
  return (
    <div className="analytics-chart">
      <h3>Onboarding funnel · all time</h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} layout="vertical" margin={{ top: 6, right: 18, bottom: 0, left: 6 }}>
          <CartesianGrid stroke="currentColor" strokeOpacity={0.12} horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={CHART_TICK} tickLine={false} axisLine={false} />
          <YAxis type="category" dataKey="stage" width={78} tick={CHART_TICK} tickLine={false} axisLine={false} />
          <Tooltip {...CHART_TOOLTIP} cursor={{ fill: "currentColor", fillOpacity: 0.08 }} />
          <Bar dataKey="count" name="Members" fill="var(--rust)" radius={[0, 2, 2, 0]} barSize={16} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
