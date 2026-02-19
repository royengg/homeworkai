import { Link } from 'react-router-dom';
import { ThemeToggle } from '../components/ThemeToggle';

export function HomeDesignOne() {
  return (
    <div className="min-h-screen w-full bg-[#f7f3ee] text-[#1c1b19] font-editorial">
      <div className="absolute inset-0 bg-paper opacity-60 pointer-events-none"></div>

      <header className="relative z-10 px-8 md:px-16 pt-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full border border-[#1c1b19] grid place-items-center text-sm font-mono-alt">
            HW
          </div>
          <div className="text-sm tracking-[0.2em] uppercase font-mono-alt">HomeworkAI</div>
        </div>
        <nav className="hidden md:flex items-center gap-8 text-sm font-mono-alt">
          <a href="#features" className="hover:underline">Features</a>
          <a href="#method" className="hover:underline">Method</a>
          <a href="#subjects" className="hover:underline">Subjects</a>
          <a href="#faq" className="hover:underline">FAQ</a>
          <Link to="/login" className="underline underline-offset-4">Login</Link>
          <ThemeToggle />
        </nav>
      </header>

      <main className="relative z-10 px-8 md:px-16 pb-20">
        <section className="grid md:grid-cols-[1.3fr_0.7fr] gap-10 items-start pt-16 md:pt-24">
          <div className="space-y-8">
            <div className="inline-flex items-center gap-3 border border-[#1c1b19] px-4 py-2 rounded-full text-xs font-mono-alt">
              <span className="w-2 h-2 rounded-full bg-[#1c1b19]"></span>
              Editorial-grade analysis for real homework
            </div>
            <h1 className="text-5xl md:text-7xl leading-[0.95]">
              Turn scanned assignments into{' '}
              <span className="italic">clear thinking</span>.
            </h1>
            <p className="text-lg md:text-xl font-sans-alt max-w-2xl">
              HomeworkAI reads messy PDFs, explains the reasoning, and produces a clean solution packet
              you can actually study from.
            </p>
            <div className="flex flex-wrap items-center gap-4">
              <Link
                to="/register"
                className="px-6 py-3 bg-[#1c1b19] text-[#f7f3ee] rounded-full text-sm font-mono-alt"
              >
                Start free
              </Link>
              <Link
                to="/login"
                className="px-6 py-3 border border-[#1c1b19] rounded-full text-sm font-mono-alt"
              >
                See demo
              </Link>
            </div>
            <div className="flex items-center gap-6 text-xs font-mono-alt text-[#3b3a37]">
              <span>PDF · OCR · Gemini</span>
              <span className="h-4 w-px bg-[#1c1b19]"></span>
              <span>Trusted by study groups</span>
            </div>
          </div>

          <div className="relative">
            <div className="absolute -top-6 -right-6 w-40 h-40 border border-[#1c1b19] rounded-full"></div>
            <div className="border border-[#1c1b19] bg-white/70 p-6 rounded-3xl shadow-warm">
              <div className="flex items-center justify-between text-xs font-mono-alt">
                <span>ANALYSIS LOG</span>
                <span>v2.5</span>
              </div>
              <div className="mt-6 space-y-4">
                <div className="h-2 bg-[#1c1b19] w-3/4"></div>
                <div className="h-2 bg-[#1c1b19] w-5/6"></div>
                <div className="h-2 bg-[#1c1b19] w-2/3"></div>
              </div>
              <div className="mt-8 border-t border-[#1c1b19] pt-4 text-sm font-sans-alt">
                "We highlight the reasoning, not just the answer."
              </div>
            </div>
            <div className="absolute -bottom-6 -left-6 bg-[#1c1b19] text-[#f7f3ee] text-xs font-mono-alt px-4 py-2 rounded-full">
              NEW: citation-first output
            </div>
          </div>
        </section>

        <section id="features" className="mt-20 grid md:grid-cols-3 gap-6">
          {[
            ['Precision OCR', 'Reads math, diagrams, and handwritten steps without losing context.'],
            ['Step-by-step', 'Breaks solutions into human-readable reasoning blocks.'],
            ['Shareable packet', 'Export a polished PDF you can submit or study.'],
          ].map(([title, desc]) => (
            <div key={title} className="border border-[#1c1b19] rounded-3xl p-6 bg-white/70">
              <h3 className="text-xl mb-2">{title}</h3>
              <p className="font-sans-alt text-sm text-[#3b3a37]">{desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 grid md:grid-cols-[0.8fr_1.2fr] gap-8 items-center">
          <div className="border border-[#1c1b19] rounded-3xl p-6 bg-white/70">
            <div className="text-xs font-mono-alt">LIVE PROOF</div>
            <div className="mt-4 text-4xl">98%</div>
            <div className="text-sm font-sans-alt text-[#3b3a37]">
              Students say the reasoning reads like a tutor.
            </div>
            <div className="mt-6 border-t border-[#1c1b19] pt-4 text-xs font-mono-alt text-[#3b3a37]">
              Survey · 2,100 responses
            </div>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {[
              ['Math', 'From calculus to discrete structures'],
              ['Science', 'Physics, chemistry, and lab sheets'],
              ['CS', 'Theory, proofs, and complexity'],
              ['Econ', 'Models and quantitative analysis'],
            ].map(([title, desc]) => (
              <div key={title} className="border border-[#1c1b19] rounded-2xl p-4 bg-white/70">
                <div className="text-sm font-mono-alt">{title}</div>
                <div className="text-sm font-sans-alt text-[#3b3a37]">{desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="method" className="mt-20 border-t border-[#1c1b19] pt-10">
          <div className="grid md:grid-cols-[0.7fr_1.3fr] gap-10">
            <div className="text-3xl leading-tight">
              A study desk, but digital.
            </div>
            <div className="font-sans-alt text-sm md:text-base text-[#3b3a37] space-y-4">
              <p>
                Upload a PDF, we parse the structure, route the questions to Gemini for reasoning,
                then render a clean answer sheet with citations.
              </p>
              <p>
                Built for students who want to learn the why, and for educators who need consistent
                outputs without the busywork.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-16 grid md:grid-cols-3 gap-6">
          {[
            ['Faster review', 'Reduce time spent reformatting solutions for study.'],
            ['Cleaner reasoning', 'Every step is labeled and explained in context.'],
            ['Consistent quality', 'Outputs are formatted for focus and clarity.'],
          ].map(([title, desc]) => (
            <div key={title} className="border border-[#1c1b19] rounded-3xl p-6 bg-white/70 relative">
              <div className="absolute -top-3 -right-3 w-8 h-8 border border-[#1c1b19] rounded-full"></div>
              <div className="text-sm font-mono-alt">OUTCOME</div>
              <h3 className="text-xl mt-2 mb-2">{title}</h3>
              <p className="font-sans-alt text-sm text-[#3b3a37]">{desc}</p>
            </div>
          ))}
        </section>

        <section className="mt-16 border border-[#1c1b19] rounded-3xl p-6 md:p-8 bg-white/70">
          <div className="flex flex-wrap items-center gap-6">
            <div className="text-xs font-mono-alt">WORKFLOW</div>
            {['Upload', 'Parse', 'Explain', 'Export'].map((step, index) => (
              <div key={step} className="flex items-center gap-3">
                <div className="w-7 h-7 rounded-full border border-[#1c1b19] grid place-items-center text-xs font-mono-alt">
                  {index + 1}
                </div>
                <div className="text-sm font-sans-alt text-[#3b3a37]">{step}</div>
              </div>
            ))}
          </div>
        </section>

        <section id="subjects" className="mt-20 border-t border-[#1c1b19] pt-10">
          <div className="grid md:grid-cols-[0.7fr_1.3fr] gap-10">
            <div className="text-3xl leading-tight">Subjects we handle well.</div>
            <div className="grid sm:grid-cols-2 gap-4 font-sans-alt text-sm text-[#3b3a37]">
              {[
                'Calculus & algebra',
                'Physics & mechanics',
                'Chemistry problem sets',
                'Statistics & probability',
                'Computer science theory',
                'Economics & finance',
              ].map((item) => (
                <div key={item} className="border border-[#1c1b19] rounded-2xl p-4 bg-white/70">
                  {item}
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mt-16 grid md:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
          <div className="border border-[#1c1b19] rounded-3xl p-6 bg-white/70">
            <div className="text-xs font-mono-alt">STUDENT NOTE</div>
            <p className="mt-4 text-lg md:text-xl font-editorial">
              "It feels like someone rewrote the assignment in a way I actually understand."
            </p>
            <div className="mt-4 text-xs font-mono-alt text-[#3b3a37]">— Lina, 2nd year engineering</div>
          </div>
          <div className="border border-[#1c1b19] rounded-3xl p-6 bg-[#1c1b19] text-[#f7f3ee]">
            <div className="text-xs font-mono-alt">DISTRIBUTION</div>
            <div className="mt-4 text-3xl">15k+</div>
            <div className="text-sm font-sans-alt">PDF packets delivered this semester.</div>
          </div>
        </section>

        <section id="faq" className="mt-20 border-t border-[#1c1b19] pt-10">
          <div className="grid md:grid-cols-[0.7fr_1.3fr] gap-10">
            <div className="text-3xl leading-tight">Questions, answered.</div>
            <div className="space-y-6 font-sans-alt text-sm md:text-base text-[#3b3a37]">
              <div>
                <div className="font-mono-alt text-xs uppercase tracking-[0.2em]">Accuracy</div>
                <p>We preserve formatting and show reasoning steps so you can verify each answer.</p>
              </div>
              <div>
                <div className="font-mono-alt text-xs uppercase tracking-[0.2em]">Privacy</div>
                <p>Uploads are secured and stored only as needed to deliver the final packet.</p>
              </div>
              <div>
                <div className="font-mono-alt text-xs uppercase tracking-[0.2em]">Speed</div>
                <p>Most assignments return in minutes, even for multi-page PDFs.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-20 border border-[#1c1b19] rounded-3xl p-8 md:p-10 bg-white/70">
          <div className="grid md:grid-cols-[1.2fr_0.8fr] gap-8 items-center">
            <div>
              <h2 className="text-3xl md:text-4xl leading-tight">Ready to make homework legible?</h2>
              <p className="font-sans-alt text-sm md:text-base text-[#3b3a37] mt-3">
                Try HomeworkAI free and export your first clean solution packet today.
              </p>
            </div>
            <div className="flex flex-wrap gap-4 md:justify-end">
              <Link to="/register" className="px-6 py-3 bg-[#1c1b19] text-[#f7f3ee] rounded-full text-sm font-mono-alt">
                Start free
              </Link>
              <Link to="/login" className="px-6 py-3 border border-[#1c1b19] rounded-full text-sm font-mono-alt">
                Talk to sales
              </Link>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
