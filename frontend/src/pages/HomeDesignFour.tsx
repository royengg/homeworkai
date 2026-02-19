import { Link } from 'react-router-dom';

export function HomeDesignFour() {
  return (
    <div className="min-h-screen w-full bg-[#0f1115] text-white font-mono-alt relative overflow-hidden">
      <div className="absolute inset-0 bg-noise opacity-[0.12]"></div>
      <div className="absolute inset-0 bg-grid-fine-dark opacity-20"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-fuchsia-500/30 to-orange-400/10 blur-3xl rounded-full"></div>

      <header className="relative z-10 px-6 md:px-12 pt-8 flex items-center justify-between">
        <div className="text-sm uppercase tracking-[0.4em]">HomeworkAI</div>
        <div className="hidden md:flex gap-6 text-xs text-white/70">
          <a href="#stack" className="hover:text-white">Stack</a>
          <a href="#labs" className="hover:text-white">Labs</a>
          <Link to="/register" className="text-white">Join</Link>
        </div>
      </header>

      <main className="relative z-10 px-6 md:px-12 pb-20">
        <section className="pt-16 md:pt-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-10 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 text-xs border border-white/20 px-4 py-2 rounded-full">
              <span className="w-2 h-2 bg-fuchsia-400 rounded-full"></span>
              Experimental build · 2026
            </div>
            <h1 className="text-5xl md:text-7xl leading-[0.9]">
              Homework, but in high fidelity.
            </h1>
            <p className="text-sm md:text-base text-white/70 max-w-2xl">
              A lab-grade environment for AI reasoning, live document parsing, and export-ready solutions.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register" className="px-6 py-3 bg-white text-black rounded-full text-sm">
                Start a session
              </Link>
              <Link to="/login" className="px-6 py-3 border border-white/30 rounded-full text-sm">
                Open workspace
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="border border-white/10 rounded-2xl p-6 bg-white/5">
              <div className="text-xs text-white/50">PIPELINE</div>
              <div className="mt-4 space-y-2">
                {['Ingest PDF', 'Detect regions', 'Reason w/ Gemini', 'Render packet'].map((step) => (
                  <div key={step} className="flex items-center gap-3">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                    <span className="text-sm text-white/80">{step}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border border-white/10 rounded-2xl p-6 bg-gradient-to-br from-white/10 to-transparent">
              <div className="text-xs text-white/50">OUTPUT</div>
              <div className="mt-4 text-3xl">PDF + Notes</div>
              <div className="text-sm text-white/60">Structure and citations included.</div>
            </div>
          </div>
        </section>

        <section id="stack" className="mt-16 grid md:grid-cols-3 gap-4 text-white/70 text-sm">
          {[
            ['Parser', 'High-fidelity extraction for math & diagrams.'],
            ['Reasoner', 'Step-by-step decomposition and logic checks.'],
            ['Exporter', 'Shareable PDF plus learning notes.'],
          ].map(([title, desc]) => (
            <div key={title} className="border border-white/10 rounded-2xl p-6 bg-white/5">
              <div className="text-white text-lg mb-1">{title}</div>
              <div>{desc}</div>
            </div>
          ))}
        </section>

        <section id="labs" className="mt-16 border-t border-white/10 pt-8 text-xs text-white/60">
          Built for students, educators, and anyone who wants a clearer path through complex homework.
        </section>
      </main>
    </div>
  );
}
