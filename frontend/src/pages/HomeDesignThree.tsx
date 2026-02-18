import { Link } from 'react-router-dom';

export function HomeDesignThree() {
  return (
    <div className="min-h-screen w-full bg-[#f2efe8] text-[#1a1a18] font-display relative overflow-hidden">
      <div className="absolute inset-0 bg-hatch opacity-[0.05]"></div>
      <div className="absolute top-10 left-8 text-[10rem] md:text-[14rem] text-[#1a1a18]/10 leading-none">HW</div>

      <header className="relative z-10 px-6 md:px-12 pt-8 flex items-center justify-between">
        <div className="text-2xl tracking-[0.3em]">HOMEWORKAI</div>
        <div className="hidden md:flex gap-6 text-sm font-mono-alt">
          <a href="#impact" className="hover:underline">Impact</a>
          <a href="#steps" className="hover:underline">Steps</a>
          <Link to="/register" className="underline underline-offset-4">Enroll</Link>
        </div>
      </header>

      <main className="relative z-10 px-6 md:px-12 pb-20">
        <section className="pt-12 md:pt-20 grid lg:grid-cols-[1.1fr_0.9fr] gap-10">
          <div>
            <div className="text-sm font-mono-alt mb-6">STUDIO EDITION</div>
            <h1 className="text-6xl md:text-8xl leading-[0.9]">
              Make homework
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-[#111827] to-[#d97706] text-stroke-dark">
                unforgettable.
              </span>
            </h1>
            <p className="mt-6 text-base md:text-lg font-sans-alt max-w-2xl">
              A bold interface for ambitious learners: parsing, reasoning, and presentation locked together.
            </p>
            <div className="mt-8 flex flex-wrap gap-4">
              <Link to="/register" className="px-6 py-3 bg-[#1a1a18] text-[#f2efe8] rounded-full text-sm font-mono-alt">
                Start Now
              </Link>
              <Link to="/login" className="px-6 py-3 border border-[#1a1a18] rounded-full text-sm font-mono-alt">
                Preview
              </Link>
            </div>
          </div>
          <div className="grid gap-4">
            <div className="bg-white/70 border border-[#1a1a18] rounded-3xl p-6">
              <div className="text-xs font-mono-alt">DOCUMENT LIVE</div>
              <div className="mt-4 text-4xl">+38%</div>
              <div className="text-sm font-sans-alt">Retention when steps are explained.</div>
            </div>
            <div className="bg-[#1a1a18] text-[#f2efe8] border border-[#1a1a18] rounded-3xl p-6">
              <div className="text-xs font-mono-alt">ANALYSIS</div>
              <div className="mt-4 text-2xl">12 pages · 48 steps · 3 mins</div>
            </div>
          </div>
        </section>

        <section id="impact" className="mt-16 grid md:grid-cols-3 gap-4">
          {[
            ['Clarity', 'Answers that read like a tutor not a robot.'],
            ['Speed', 'Fast enough for study sessions and office hours.'],
            ['Structure', 'Consistent formatting for every export.'],
          ].map(([title, desc]) => (
            <div key={title} className="border border-[#1a1a18] rounded-3xl p-6 bg-white/70">
              <h3 className="text-2xl">{title}</h3>
              <p className="text-sm font-sans-alt text-[#3b3a37]">{desc}</p>
            </div>
          ))}
        </section>

        <section id="steps" className="mt-16 border-t border-[#1a1a18] pt-10 font-sans-alt text-sm md:text-base">
          Upload. Parse. Explain. Export. All inside one choreographed workflow.
        </section>
      </main>
    </div>
  );
}
