import { Link } from 'react-router-dom';

export function HomeDesignFive() {
  return (
    <div className="min-h-screen w-full bg-[#f8fafc] text-[#0f172a] font-sans-alt relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-fine opacity-30"></div>
      <div className="absolute -top-24 left-0 w-[32rem] h-[32rem] bg-gradient-to-br from-amber-300/40 to-rose-200/20 blur-3xl rounded-full"></div>
      <div className="absolute bottom-0 right-0 w-[28rem] h-[28rem] bg-gradient-to-br from-sky-300/30 to-indigo-200/20 blur-3xl rounded-full"></div>

      <header className="relative z-10 px-6 md:px-12 pt-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-white shadow-soft grid place-items-center font-geo text-sm">HW</div>
          <div className="text-xs uppercase tracking-[0.35em] text-[#334155]">HomeworkAI</div>
        </div>
        <div className="hidden md:flex gap-6 text-xs text-[#475569]">
          <a href="#flow" className="hover:text-[#0f172a]">Flow</a>
          <a href="#stories" className="hover:text-[#0f172a]">Stories</a>
          <Link to="/register" className="text-[#0f172a]">Start</Link>
        </div>
      </header>

      <main className="relative z-10 px-6 md:px-12 pb-20">
        <section className="pt-16 md:pt-24 grid lg:grid-cols-[1.1fr_0.9fr] gap-12 items-center">
          <div className="space-y-6">
            <div className="inline-flex items-center gap-3 text-xs border border-[#cbd5f5] px-4 py-2 rounded-full bg-white">
              <span className="w-2 h-2 bg-[#f97316] rounded-full"></span>
              Human-grade explanations for complex homework
            </div>
            <h1 className="text-5xl md:text-7xl leading-[0.95] font-geo">
              Learn the steps, not just the answer.
            </h1>
            <p className="text-base md:text-lg text-[#475569] max-w-2xl">
              HomeworkAI translates dense PDFs into friendly, teachable solutions with a clean export packet.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link to="/register" className="px-6 py-3 bg-[#0f172a] text-white rounded-full text-sm font-mono-alt">
                Get Started
              </Link>
              <Link to="/login" className="px-6 py-3 border border-[#0f172a] rounded-full text-sm font-mono-alt">
                View Example
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="bg-white rounded-3xl p-6 shadow-soft">
              <div className="text-xs text-[#64748b]">TODAY'S OUTPUT</div>
              <div className="mt-4 text-3xl text-[#0f172a]">Physics Set</div>
              <div className="text-sm text-[#64748b]">14 questions · 32 steps · 1 export</div>
            </div>
            <div className="bg-white rounded-3xl p-6 shadow-soft">
              <div className="text-xs text-[#64748b]">STUDY PATH</div>
              <div className="mt-4 grid grid-cols-3 gap-3 text-center text-xs">
                <div className="p-3 bg-[#f1f5f9] rounded-2xl">Upload</div>
                <div className="p-3 bg-[#f1f5f9] rounded-2xl">Explain</div>
                <div className="p-3 bg-[#f1f5f9] rounded-2xl">Export</div>
              </div>
            </div>
          </div>
        </section>

        <section id="flow" className="mt-16 grid md:grid-cols-3 gap-4">
          {[
            ['Gentle UI', 'A calm workspace for deep focus.'],
            ['Clear steps', 'Reasoning structured like a tutor.'],
            ['Share fast', 'Export with one click.'],
          ].map(([title, desc]) => (
            <div key={title} className="bg-white rounded-3xl p-6 shadow-soft">
              <div className="text-xl mb-1 font-geo">{title}</div>
              <div className="text-sm text-[#64748b]">{desc}</div>
            </div>
          ))}
        </section>

        <section id="stories" className="mt-16 border-t border-[#e2e8f0] pt-8 text-sm text-[#64748b]">
          From homework chaos to organized clarity, every upload becomes a structured learning story.
        </section>
      </main>
    </div>
  );
}
