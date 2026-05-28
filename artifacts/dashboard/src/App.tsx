import { Switch, Route, Router as WouterRouter, Link, useLocation } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { DocumentProvider } from "@/lib/store";
import NotFound from "@/pages/not-found";
import Overview from "@/pages/overview";
import Upload from "@/pages/upload";
import Traces from "@/pages/traces";
import Analytics from "@/pages/analytics";
import Governance from "@/pages/governance";
import BusinessCase from "@/pages/business-case";
import Observability from "@/pages/observability";
import Report from "@/pages/report";

const queryClient = new QueryClient();

const NAV = [
  { path: "/", label: "Executive Overview", icon: "◆" },
  { path: "/upload", label: "Upload & Analyze", icon: "↑" },
  { path: "/traces", label: "Trace Explorer", icon: "⬡" },
  { path: "/analytics", label: "Cost & Performance", icon: "▦" },
  { path: "/governance", label: "Governance", icon: "⊞" },
  { path: "/observability", label: "Observability & Eval", icon: "✦" },
  { path: "/business-case", label: "Business Case", icon: "£" },
  { path: "/report", label: "Executive Report", icon: "⎙" },
];

const NAVY = "#0B2545";

function Sidebar() {
  const [location] = useLocation();
  return (
    <aside className="w-56 shrink-0 flex flex-col" style={{ backgroundColor: NAVY, minHeight: "100vh" }}>
      <div className="px-5 py-5 border-b border-white/10">
        <div className="text-white font-bold text-sm leading-tight">Audit Evidence</div>
        <div className="text-blue-300 text-xs mt-0.5">Review Assistant</div>
      </div>
      <nav className="flex-1 py-3">
        {NAV.map((n) => {
          const active = n.path === "/" ? location === "/" : location.startsWith(n.path);
          return (
            <Link key={n.path} href={n.path}>
              <span className={`flex items-center gap-3 px-5 py-2.5 text-sm cursor-pointer transition-colors ${active ? "bg-white/15 text-white font-medium" : "text-blue-200 hover:bg-white/8 hover:text-white"}`}>
                <span className="w-4 text-center text-xs opacity-70">{n.icon}</span>
                {n.label}
              </span>
            </Link>
          );
        })}
      </nav>
      <div className="px-5 py-4 border-t border-white/10">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
          <span className="text-xs text-blue-200">Live · May 25, 2026</span>
        </div>
      </div>
    </aside>
  );
}

function Layout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-50">
      <Sidebar />
      <main className="flex-1 min-w-0 overflow-auto">{children}</main>
    </div>
  );
}

function Router() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={Overview} />
        <Route path="/upload" component={Upload} />
        <Route path="/traces" component={Traces} />
        <Route path="/analytics" component={Analytics} />
        <Route path="/governance" component={Governance} />
        <Route path="/observability" component={Observability} />
        <Route path="/business-case" component={BusinessCase} />
        <Route path="/report" component={Report} />
        <Route component={NotFound} />
      </Switch>
    </Layout>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <DocumentProvider>
        <TooltipProvider>
          <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
            <Router />
          </WouterRouter>
          <Toaster />
        </TooltipProvider>
      </DocumentProvider>
    </QueryClientProvider>
  );
}

export default App;
