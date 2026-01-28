import { motion } from 'framer-motion';
import { ChevronRight } from 'lucide-react';

export function Hero() {
  return (
    <div className="w-full relative flex items-center justify-center pt-24 pb-20 overflow-hidden bg-transparent">
        {/* Elite Background Ambience */}
        <div className="absolute inset-0 w-full h-full bg-grid-zinc-200/40 dark:bg-grid-white/[0.02] z-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)] pointer-events-none" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-zinc-200/20 dark:bg-zinc-800/10 blur-[120px] -z-10" />

      <div className="text-center relative z-10 w-full max-w-4xl px-6">
        <motion.div
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
           className="space-y-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-zinc-200 dark:border-zinc-800 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-sm shadow-soft">
             <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-zinc-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-zinc-500"></span>
             </span>
             <span className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-500">Now with Neural Parse 2.1</span>
             <ChevronRight className="h-3 w-3 text-zinc-300" />
          </div>

          <h1 className="text-5xl md:text-7xl font-black leading-[1.05] tracking-tight text-zinc-900 dark:text-zinc-50">
            Intelligent synthesis for <br className="hidden md:block" />
            <span className="text-zinc-400 dark:text-zinc-600">modern academics.</span>
          </h1>

          <div className="w-full max-w-2xl mx-auto">
            <p className="text-lg md:text-xl text-muted-foreground/80 font-medium leading-relaxed">
              Elevate your research workflow. Stop deconstructing complex PDFs manually and let our neural engine synthesize professional pathways in seconds.
            </p>
          </div>

          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-4">
             <button className="h-14 px-10 rounded-2xl bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 font-bold shadow-premium hover:scale-[0.98] transition-all">
                Get Started Free
             </button>
             <button className="h-14 px-10 rounded-2xl border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-300 font-bold hover:bg-zinc-50 dark:hover:bg-zinc-100/5 transition-all">
                View Demo
             </button>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

