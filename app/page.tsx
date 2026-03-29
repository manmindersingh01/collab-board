import Link from "next/link";

const stats = [
  "2,847 tasks shipped last week",
  "34ms real-time sync",
  "184 teams building together",
  "97.3% uptime last quarter",
  "Built for teams of 3 to 300",
];

const aiSubtasks = [
  { task: "Audit current checkout conversion funnel", tag: "Research" },
  { task: "Design new multi-step form wireframes", tag: "Design" },
  { task: "Implement address autocomplete", tag: null },
  { task: "Add Stripe payment element", tag: null },
  { task: "Write E2E tests for happy path", tag: "QA" },
];

export default function Home() {
  return (
    <div className="min-h-[100dvh]">
      {/* ── Hero ─────────────────────────────────────────── */}
      <section className="px-6 pt-16 pb-24 md:pt-24 md:pb-32 overflow-hidden">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">
          {/* Left — text */}
          <div className="lg:col-span-7 stagger-grid">
            <div>
              <span className="neo-badge bg-neo-yellow">
                <span className="w-2 h-2 rounded-full bg-neo-teal animate-pulse-neo" />
                Now in Beta
              </span>
            </div>

            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tighter leading-[0.9]">
              The project board
              <br />
              your team will
              <br />
              <span className="text-neo-blue">actually use</span>
            </h1>

            <p className="text-lg md:text-xl text-neo-muted max-w-xl leading-relaxed">
              Real-time collaboration, drag-and-drop workflows, and an AI
              that breaks down features into subtasks your team can ship
              this sprint.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard" className="neo-btn neo-btn-primary text-base px-6 py-3">Start Building — Free</Link>
              <a
                href="#features"
                className="neo-btn neo-btn-ghost text-base px-6 py-3"
              >
                See How It Works
              </a>
            </div>
          </div>

          {/* Right — board mockup */}
          <div
            className="lg:col-span-5 animate-slide-up"
            style={{ opacity: 0, animationDelay: "0.3s" }}
          >
            <div className="neo-card p-5 rotate-2 hover:rotate-0 transition-transform duration-500">
              {/* Window chrome */}
              <div className="flex items-center gap-2 mb-4 pb-3 border-b-2 border-neo-black">
                <div className="w-3 h-3 rounded-full bg-neo-red border-2 border-neo-black" />
                <div className="w-3 h-3 rounded-full bg-neo-orange border-2 border-neo-black" />
                <div className="w-3 h-3 rounded-full bg-neo-teal border-2 border-neo-black" />
                <span className="ml-auto text-xs font-bold uppercase tracking-wider">
                  Sprint 14
                </span>
              </div>

              {/* Kanban columns */}
              <div className="grid grid-cols-3 gap-3">
                {/* To Do */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-neo-red mb-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neo-red" />
                    To Do
                    <span className="ml-auto text-neo-muted font-mono">3</span>
                  </div>
                  <div className="space-y-2">
                    <div className="neo-card-sm p-2">
                      <div className="text-[11px] font-bold leading-tight">
                        Auth flow redesign
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="w-4 h-4 rounded-full bg-neo-blue border border-neo-black text-[8px] text-white flex items-center justify-center font-bold">
                          S
                        </span>
                        <span className="neo-badge text-[8px] py-0 px-1 bg-neo-red/10 text-neo-red border-neo-red/30">
                          P1
                        </span>
                      </div>
                    </div>
                    <div className="neo-card-sm p-2">
                      <div className="text-[11px] font-bold leading-tight">
                        API rate limits
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="w-4 h-4 rounded-full bg-neo-orange border border-neo-black text-[8px] text-white flex items-center justify-center font-bold">
                          M
                        </span>
                      </div>
                    </div>
                    <div className="neo-card-sm p-2 opacity-60">
                      <div className="text-[11px] font-bold leading-tight">
                        Webhook retries
                      </div>
                    </div>
                  </div>
                </div>

                {/* In Progress */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-neo-orange mb-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neo-orange" />
                    In Progress
                    <span className="ml-auto text-neo-muted font-mono">2</span>
                  </div>
                  <div className="space-y-2">
                    <div className="neo-card-sm p-2 animate-float">
                      <div className="text-[11px] font-bold leading-tight">
                        Dashboard metrics
                      </div>
                      <div className="mt-1.5 h-1 bg-neo-orange/20 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-neo-orange rounded-full"
                          style={{ width: "65%" }}
                        />
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="w-4 h-4 rounded-full bg-neo-teal border border-neo-black text-[8px] text-white flex items-center justify-center font-bold">
                          A
                        </span>
                        <span className="neo-badge text-[8px] py-0 px-1 bg-neo-orange/10 text-neo-orange border-neo-orange/30">
                          P2
                        </span>
                      </div>
                    </div>
                    <div className="neo-card-sm p-2">
                      <div className="text-[11px] font-bold leading-tight">
                        Search indexing
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="w-4 h-4 rounded-full bg-neo-red border border-neo-black text-[8px] text-white flex items-center justify-center font-bold">
                          K
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Done */}
                <div>
                  <div className="text-[10px] font-black uppercase tracking-wider text-neo-teal mb-2 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-neo-teal" />
                    Done
                    <span className="ml-auto text-neo-muted font-mono">4</span>
                  </div>
                  <div className="space-y-2">
                    <div className="neo-card-sm p-2 opacity-50">
                      <div className="text-[11px] font-bold leading-tight line-through">
                        SSO integration
                      </div>
                      <div className="flex items-center gap-1 mt-1.5">
                        <span className="w-4 h-4 rounded-full bg-neo-blue border border-neo-black text-[8px] text-white flex items-center justify-center font-bold">
                          S
                        </span>
                      </div>
                    </div>
                    <div className="neo-card-sm p-2 opacity-50">
                      <div className="text-[11px] font-bold leading-tight line-through">
                        User onboarding
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Stats Ticker ─────────────────────────────────── */}
      <section className="border-y-2 border-neo-black bg-neo-yellow overflow-hidden">
        <div className="flex animate-marquee py-3">
          {[0, 1].map((setIdx) => (
            <div key={setIdx} className="flex items-center shrink-0">
              {stats.map((stat, i) => (
                <span
                  key={i}
                  className="flex items-center gap-2.5 px-6 font-black text-sm uppercase tracking-wider whitespace-nowrap"
                >
                  <span className="w-1.5 h-1.5 bg-neo-black rounded-full" />
                  {stat}
                </span>
              ))}
            </div>
          ))}
        </div>
      </section>

      {/* ── Features Bento ───────────────────────────────── */}
      <section id="features" className="px-6 py-24 md:py-32">
        <div className="max-w-7xl mx-auto">
          <div className="max-w-2xl mb-16">
            <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-none mb-4">
              Built for teams that ship
            </h2>
            <p className="text-lg text-neo-muted leading-relaxed">
              Everything you need to go from idea to done — without the
              bloat of tools that try to do everything.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-4 stagger-grid">
            {/* ── Real-time Boards (7-col) ── */}
            <div className="md:col-span-7 neo-card p-6 md:p-8">
              <div className="text-xs font-black uppercase tracking-wider text-neo-muted mb-3">
                Real-time Boards
              </div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight mb-2">
                Changes sync instantly
              </h3>
              <p className="text-sm text-neo-muted mb-6">
                Your whole team sees updates in under 50ms. No refresh
                button. No merge conflicts. Just flow.
              </p>
              <div className="neo-card-sm p-3 flex items-center gap-3">
                <div className="flex -space-x-2">
                  <div className="w-7 h-7 rounded-full bg-neo-blue border-2 border-neo-black text-[10px] text-white flex items-center justify-center font-bold z-30 relative">
                    S
                  </div>
                  <div className="w-7 h-7 rounded-full bg-neo-teal border-2 border-neo-black text-[10px] text-white flex items-center justify-center font-bold z-20 relative">
                    A
                  </div>
                  <div className="w-7 h-7 rounded-full bg-neo-orange border-2 border-neo-black text-[10px] text-white flex items-center justify-center font-bold z-10 relative">
                    K
                  </div>
                </div>
                <div className="text-xs">
                  <span className="font-bold">3 people</span> editing now
                </div>
                <div className="ml-auto flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-neo-teal animate-pulse-neo" />
                  <span className="text-[10px] font-bold text-neo-teal uppercase">
                    Live
                  </span>
                </div>
              </div>
            </div>

            {/* ── Drag & Drop (5-col) ── */}
            <div className="md:col-span-5 neo-card p-6 md:p-8">
              <div className="text-xs font-black uppercase tracking-wider text-neo-muted mb-3">
                Drag & Drop
              </div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight mb-2">
                Move fast, stay organized
              </h3>
              <p className="text-sm text-neo-muted mb-6">
                Drag tasks between lists. Reorder priorities with a flick.
              </p>
              <div className="space-y-2">
                {[
                  {
                    name: "Onboarding flow",
                    color: "bg-neo-teal",
                    status: "Done",
                    delay: "0s",
                  },
                  {
                    name: "Payment webhook",
                    color: "bg-neo-orange",
                    status: "In Progress",
                    delay: "0.5s",
                  },
                  {
                    name: "Error boundary",
                    color: "bg-neo-red",
                    status: "To Do",
                    delay: "1s",
                  },
                ].map((item) => (
                  <div
                    key={item.name}
                    className="neo-card-sm p-2.5 flex items-center gap-2 animate-float"
                    style={{ animationDelay: item.delay }}
                  >
                    <span
                      className={`w-1.5 h-5 ${item.color} rounded-full shrink-0`}
                    />
                    <span className="text-xs font-bold">{item.name}</span>
                    <span className="ml-auto text-[10px] text-neo-muted">
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── AI Assistant (8-col) ── */}
            <div className="md:col-span-8 neo-card p-6 md:p-8">
              <div className="text-xs font-black uppercase tracking-wider text-neo-muted mb-3">
                AI Assistant
              </div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight mb-2">
                Describe it. Ship it.
              </h3>
              <p className="text-sm text-neo-muted mb-6">
                Tell the AI what you&apos;re building. It breaks your idea
                into subtasks, suggests owners, and drafts acceptance
                criteria.
              </p>
              {/* Dark terminal mockup */}
              <div className="bg-[#141414] text-white rounded-lg border-2 border-neo-black p-4">
                <div className="flex items-center gap-2 text-xs text-zinc-500 mb-3">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <path d="M12 2L2 7l10 5 10-5-10-5z" />
                    <path d="M2 17l10 5 10-5" />
                    <path d="M2 12l10 5 10-5" />
                  </svg>
                  AI Assistant
                </div>
                <div className="text-sm font-mono mb-4 flex items-center text-zinc-300">
                  <span className="text-zinc-600 mr-2">{">"}</span>
                  &quot;Break down the checkout redesign&quot;
                  <span className="w-0.5 h-4 bg-neo-blue animate-blink ml-0.5" />
                </div>
                <div className="space-y-2.5 border-t border-zinc-800 pt-3">
                  {aiSubtasks.map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2.5 text-xs text-zinc-300"
                    >
                      <span className="w-5 h-5 rounded border border-zinc-700 flex items-center justify-center text-[10px] font-bold text-zinc-500 shrink-0">
                        {i + 1}
                      </span>
                      <span>{item.task}</span>
                      {item.tag && (
                        <span className="ml-auto neo-badge text-[8px] py-0 bg-neo-yellow/10 text-neo-yellow border-neo-yellow/30">
                          {item.tag}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Smart Search (4-col) ── */}
            <div className="md:col-span-4 neo-card p-6 md:p-8">
              <div className="text-xs font-black uppercase tracking-wider text-neo-muted mb-3">
                Smart Search
              </div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight mb-2">
                Ask, don&apos;t filter
              </h3>
              <p className="text-sm text-neo-muted mb-6">
                Search with natural language across every board and task.
              </p>
              <div className="space-y-3">
                <div className="neo-input text-xs flex items-center gap-2">
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    className="shrink-0 text-neo-muted"
                  >
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <span className="text-neo-muted">
                    &quot;What shipped last Friday?&quot;
                  </span>
                  <span className="w-0.5 h-3.5 bg-neo-black animate-blink ml-auto" />
                </div>
                <div className="text-[10px] text-neo-muted uppercase tracking-wider font-bold">
                  Powered by vector embeddings
                </div>
              </div>
            </div>

            {/* ── Sprint Reports (5-col) ── */}
            <div className="md:col-span-5 neo-card p-6 md:p-8">
              <div className="text-xs font-black uppercase tracking-wider text-neo-muted mb-3">
                Sprint Reports
              </div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight mb-2">
                Monday updates, automated
              </h3>
              <p className="text-sm text-neo-muted mb-6">
                Generate stakeholder-ready summaries from your sprint data
                in one click.
              </p>
              <div className="neo-card-sm p-3 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase tracking-wider">
                    Sprint 14 Summary
                  </span>
                  <span className="neo-badge text-[8px] py-0 bg-neo-teal/10 text-neo-teal border-neo-teal/30">
                    Generated
                  </span>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-neo-teal w-4 text-right">
                      12
                    </span>
                    <span className="text-neo-muted w-16">completed</span>
                    <div className="flex-1 h-1.5 bg-neo-teal/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neo-teal rounded-full"
                        style={{ width: "73%" }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-neo-orange w-4 text-right">
                      4
                    </span>
                    <span className="text-neo-muted w-16">in progress</span>
                    <div className="flex-1 h-1.5 bg-neo-orange/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neo-orange rounded-full"
                        style={{ width: "24%" }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <span className="font-bold text-neo-red w-4 text-right">
                      2
                    </span>
                    <span className="text-neo-muted w-16">blocked</span>
                    <div className="flex-1 h-1.5 bg-neo-red/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-neo-red rounded-full"
                        style={{ width: "12%" }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ── Team Collaboration (7-col) ── */}
            <div className="md:col-span-7 neo-card p-6 md:p-8">
              <div className="text-xs font-black uppercase tracking-wider text-neo-muted mb-3">
                Team Collaboration
              </div>
              <h3 className="text-xl md:text-2xl font-black tracking-tight mb-2">
                Keep everyone in the loop
              </h3>
              <p className="text-sm text-neo-muted mb-6">
                Assign tasks, leave comments, mention teammates. Context
                stays with the work, not buried in chat threads.
              </p>
              <div className="space-y-2">
                <div className="neo-card-sm p-3 flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-neo-blue border-2 border-neo-black text-[9px] text-white flex items-center justify-center font-bold shrink-0">
                    S
                  </div>
                  <div>
                    <div className="text-[11px]">
                      <span className="font-bold">Sarah</span>{" "}
                      <span className="text-neo-muted">moved</span>{" "}
                      <span className="font-bold">Dashboard metrics</span>{" "}
                      <span className="text-neo-muted">to In Progress</span>
                    </div>
                    <div className="text-[10px] text-neo-muted mt-0.5">
                      Starting on the chart component today.
                    </div>
                  </div>
                  <span className="text-[10px] text-neo-muted ml-auto shrink-0">
                    2h
                  </span>
                </div>
                <div className="neo-card-sm p-3 flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-neo-orange border-2 border-neo-black text-[9px] text-white flex items-center justify-center font-bold shrink-0">
                    M
                  </div>
                  <div>
                    <div className="text-[11px]">
                      <span className="font-bold">Marcus</span>{" "}
                      <span className="text-neo-muted">commented on</span>{" "}
                      <span className="font-bold">API rate limits</span>
                    </div>
                    <div className="text-[10px] text-neo-muted mt-0.5">
                      @Sarah the endpoint changed — check the updated docs
                      in the PR.
                    </div>
                  </div>
                  <span className="text-[10px] text-neo-muted ml-auto shrink-0">
                    45m
                  </span>
                </div>
                <div className="neo-card-sm p-3 flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-neo-teal border-2 border-neo-black text-[9px] text-white flex items-center justify-center font-bold shrink-0">
                    A
                  </div>
                  <div>
                    <div className="text-[11px]">
                      <span className="font-bold">Alex</span>{" "}
                      <span className="text-neo-muted">completed</span>{" "}
                      <span className="font-bold line-through">
                        SSO integration
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] text-neo-muted ml-auto shrink-0">
                    12m
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── CTA ──────────────────────────────────────────── */}
      <section className="px-6 pb-24 md:pb-32">
        <div className="max-w-7xl mx-auto">
          <div className="neo-card bg-neo-yellow p-8 md:p-16">
            <div className="max-w-2xl">
              <h2 className="text-3xl md:text-5xl font-black tracking-tighter leading-none mb-4">
                Your next sprint starts here
              </h2>
              <p className="text-lg text-neo-black/70 mb-8 leading-relaxed">
                Join 184 teams already shipping faster with CollabBoard.
                Free to start, no credit card needed.
              </p>
              <div className="flex flex-wrap gap-3">
                <Link href="/dashboard" className="neo-btn bg-neo-black text-neo-white border-neo-black text-base px-8 py-3.5 shadow-[4px_4px_0px_var(--neo-blue)] hover:shadow-[2px_2px_0px_var(--neo-blue)] hover:translate-x-[2px] hover:translate-y-[2px]">Get Started Free</Link>
                <a
                  href="#features"
                  className="neo-btn neo-btn-ghost text-base px-6 py-3.5 border-neo-black"
                >
                  Explore Features
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────── */}
      <footer className="border-t-2 border-neo-black px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 bg-neo-yellow border-2 border-neo-black rounded-md shadow-neo-sm flex items-center justify-center font-black text-xs">
              C
            </div>
            <span className="font-black text-sm">CollabBoard</span>
          </div>
          <div className="text-xs text-neo-muted">
            2026 CollabBoard. Built for teams that ship.
          </div>
        </div>
      </footer>
    </div>
  );
}
