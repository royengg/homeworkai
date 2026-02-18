import { Link } from 'react-router-dom';

export function HomeDesignTwo() {
  return (
    <div className="min-h-screen w-full bg-[#0b0f1a] text-white font-geo relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-fine-dark opacity-40"></div>
      <div className="absolute -top-20 -left-20 w-72 h-72 bg-gradient-to-br from-cyan-400/40 to-blue-600/10 blur-3xl rounded-full animate-float-slow"></div>
      <div className="absolute -bottom-24 right-0 w-96 h-96 bg-gradient-to-br from-emerald-400/20 to-teal-600/5 blur-3xl rounded-full animate-float-slower"></div>

      <header className="relative z-10 px-6 md:px-12 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg border border-white/30 grid place-items-center text-xs">HW</div>
          <span className="text-xs tracking-[0.35em] uppercase text-white/70">HomeworkAI</span>
        </div>
        <div className="hidden md:flex gap-8 text-xs text-white/70">
          <a href="#systems" className="hover:text-white">Systems</a>
          <a href="#cadence" className="hover:text-white">Cadence</a>
          <Link to="/register" className="text-white">Start</Link>
        </div>
      </header>

      <main className="relative z-10 px-6 md:px-12 pb-20">
        <section className="pt-16 md:pt-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 text-xs border border-cyan-400/40 px-4 py-2 rounded-full">
              <span className="w-2 h-2 bg-cyan-400 rounded-full shadow-glow"></span>
              Intelligence for long-form assignments
            </div>
            <h1 className="text-5xl md:text-7xl leading-[0.95]">
              The homework engine with{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-300 to-emerald-300">real signal</span>.
            </h1>
            <p className="text-base md:text-lg text-white/70 font-sans-alt max-w-2xl">
              Built for depth: PDF parsing, step-by-step reasoning, and real-time progress for every document.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link to="/register" className="px-6 py-3 bg-white text-black rounded-full text-sm font-mono-alt">
                Launch Workspace
              </Link>
              <Link to="/login" className="px-6 py-3 border border-white/30 rounded-full text-sm font-mono-alt">
                View Demo
              </Link>
            </div>
          </div>
          <div className="relative">
            <div className="border border-white/20 rounded-3xl p-6 bg-white/5 backdrop-blur-xl">
              <div className="flex justify-between text-xs text-white/60">
                <span>RUNNING ANALYSIS</span>
                <span>89% COMPLETE</span>
              </div>
              <div className="mt-6 h-2 bg-white/10 rounded-full">
                <div className="h-2 w-[89%] bg-gradient-to-r from-cyan-300 to-emerald-300 rounded-full"></div>
              </div>
              <div className="mt-8 grid grid-cols-2 gap-4 text-xs text-white/70">
                <div className="border border-white/10 rounded-2xl p-4">
                  <div className="text-white">12 pages</div>
                  <div className="text-white/50">Parsed</div>
                </div>
                <div className="border border-white/10 rounded-2xl p-4">
                  <div className="text-white">48 steps</div>
                  <div className="text-white/50">Explained</div>
                </div>
                <div className="border border-white/10 rounded-2xl p-4">
                  <div className="text-white">3 mins</div>
                  <div className="text-white/50">Average</div>
                </div>
                <div className="border border-white/10 rounded-2xl p-4">
                  <div className="text-white">Live</div>
                  <div className="text-white/50">Updates</div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section id="systems" className="mt-20 grid md:grid-cols-3 gap-6">
          {[
            ['OCR Fidelity', 'Capture formulas, diagrams, and annotations.'],
            ['Reasoning Graph', 'Structured steps with dependencies and citations.'],
            ['Delivery Pack', 'Export-ready, polished PDF output.'],
          ].map(([title, desc]) => (
            <div key={title} className="border border-white/10 rounded-3xl p-6 bg-white/5">
              <h3 className="text-xl mb-2">{title}</h3>
              <p className="text-sm text-white/60 font-sans-alt">{desc}</p>
            </div>
          ))}
        </section>

        <section id="cadence" className="mt-20 border-t border-white/10 pt-10 text-white/70 font-sans-alt text-sm md:text-base">
          HomeworkAI orchestrates parsing, AI reasoning, and storage so you only focus on learning.
        </section>
      </main>
    </div>
  );
}
