import { ShieldCheck, Users, BarChart3, Vote, ClipboardList, Eye } from "lucide-react";
const features = [
  { i: ClipboardList, t: "Build elections fast", d: "Set positions, add candidates with photos and manifestos, and schedule the voting window." },
  { i: Users, t: "Manage your voters", d: "Add voters one by one or import a CSV, then send invitations and track who has voted." },
  { i: Vote, t: "One person, one ballot", d: "The database rejects a second ballot from the same voter, and rejects votes outside the window." },
  { i: Eye, t: "Choices stay private", d: "Participation and ballot choices live in separate tables, so admins see turnout but not individual votes." },
  { i: BarChart3, t: "Clear results", d: "Totals, percentages, turnout and winners. Ties are shown as ties." },
  { i: ShieldCheck, t: "Organisation isolation", d: "Every organisation is a separate tenant enforced by row-level security." },
];
export default function Home() {
  return (<main>
    <header className="sticky top-0 z-10 border-b border-navy/10 bg-white/90 backdrop-blur">
      <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <span className="font-display text-2xl font-semibold text-navy">Votely<span className="text-teal">.</span></span>
        <div className="hidden gap-7 text-sm font-medium text-navy md:flex"><a href="#features">Features</a><a href="#how">How it works</a><a href="#pricing">Pricing</a></div>
        <a href="/register" className="rounded-full bg-navy px-5 py-2 text-sm font-semibold text-white hover:bg-navy-800">Get started</a>
      </nav></header>
    <section className="bg-navy text-white">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 py-20 md:grid-cols-2 md:py-28">
        <div>
          <h1 className="font-display text-5xl font-semibold leading-tight md:text-6xl">Modern elections. Trusted results.</h1>
          <p className="mt-6 max-w-lg text-lg text-white/80">Votely gives organisations a simple, secure and transparent way to create elections, manage voters, run online voting and publish results.</p>
          <div className="mt-8 flex flex-wrap gap-3">
            <a href="/register" className="rounded-full bg-amber px-6 py-3 font-semibold text-navy hover:brightness-95">Register your organisation</a>
            <a href="#features" className="rounded-full border border-white/30 px-6 py-3 font-semibold hover:bg-white/10">Explore features</a></div>
        </div>
        <div className="rounded-3xl bg-white p-6 text-ink shadow-2xl" aria-label="Sample ballot">
          <p className="font-display text-xl font-semibold text-navy">Student Union Election 2027</p>
          <p className="text-sm text-ink/60">President. Choose one candidate.</p>
          <div className="mt-4 space-y-3">
            {["Amara Okafor", "Tunde Bello", "Grace Eze"].map((n, k) => (
              <div key={n} className={`flex items-center gap-3 rounded-xl border-2 p-3 ${k === 0 ? "border-teal bg-teal-100" : "border-ice"}`}>
                <span className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold ${k === 0 ? "bg-teal text-white" : "bg-ice text-navy"}`}>{n[0]}</span>
                <span className="font-medium">{n}</span>{k === 0 && <span className="ml-auto text-sm font-semibold text-teal-600">Selected</span>}
              </div>))}
          </div>
          <button className="mt-5 w-full rounded-xl bg-navy py-3 font-semibold text-white">Submit ballot</button>
        </div>
      </div></section>
    <section id="features" className="bg-ice py-20"><div className="mx-auto max-w-6xl px-5">
      <h2 className="font-display text-3xl font-semibold text-navy md:text-4xl">Everything an election needs</h2>
      <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map(({ i: Icon, t, d }) => (<div key={t} className="rounded-2xl bg-white p-6 shadow-sm">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-teal-100 text-teal-600"><Icon size={22} /></span>
          <h3 className="mt-4 text-lg font-bold text-navy">{t}</h3><p className="mt-2 text-ink/70">{d}</p></div>))}
      </div></div></section>
    <section id="how" className="py-20"><div className="mx-auto max-w-4xl px-5">
      <h2 className="font-display text-3xl font-semibold text-navy md:text-4xl">How it works</h2>
      <ol className="mt-8 space-y-4">{["Register your organisation and finish onboarding.","Add voters and create an election with positions and candidates.","Publish it. Voters sign in and vote during the window.","Close the election, review turnout and publish results."].map((s, n) => (
        <li key={s} className="flex gap-4 rounded-2xl border border-navy/10 p-5"><span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-navy font-bold text-white">{n + 1}</span><span>{s}</span></li>))}</ol>
    </div></section>
    <section id="pricing" className="bg-navy py-20 text-white"><div className="mx-auto max-w-6xl px-5">
      <h2 className="font-display text-3xl font-semibold md:text-4xl">Plans that grow with you</h2>
      <div className="mt-10 grid gap-5 md:grid-cols-3">{[["Free","Basic elections and results, limited voters."],["Professional","More elections, CSV import, email notifications, reports."],["Enterprise","Higher limits, multiple administrators, priority support."]].map(([n, d], k) => (
        <div key={n} className={`rounded-2xl p-6 ${k === 1 ? "bg-teal text-navy" : "bg-navy-800"}`}><h3 className="text-xl font-bold">{n}</h3><p className="mt-2 opacity-85">{d}</p></div>))}</div>
    </div></section>
    <footer className="border-t border-navy/10 py-8 text-center text-sm text-ink/60">Votely. Every vote matters.</footer>
  </main>);
}
