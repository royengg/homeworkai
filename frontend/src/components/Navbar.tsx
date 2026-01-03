import { useNavigate } from 'react-router-dom';
import { ShimmerButton } from './ShimmerButton';
import { ThemeToggle } from './ThemeToggle';

export function Navbar() {
  const navigate = useNavigate();

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[92%] md:w-full md:max-w-2xl mx-auto border border-gray-200 bg-white/50 dark:bg-black/40 dark:backdrop-blur-md dark:border-white/10 backdrop-blur-md rounded-full px-4 py-3 md:px-8 md:py-4 flex justify-between items-center shadow-sm transition-all duration-300">
      <div className="flex items-center gap-2 text-brand-text-primary dark:text-white cursor-pointer">
        <span className="material-symbols-outlined text-2xl font-bold bg-accent-gradient text-transparent bg-clip-text">
          edit
        </span>
        <h1 className="text-xl font-bold tracking-tight">HomeworkAI</h1>
      </div>
      
      {/* CTA */}
      <div className="flex items-center gap-4">
        <ThemeToggle />
        <ShimmerButton 
            onClick={() => navigate('/login')}
            className="!px-6 !py-2.5 !text-sm !h-auto hover:border-orange-500 hover:shadow-[0_0_20px_-5px_rgba(249,115,22,0.5)]"
        >
          Get Started
        </ShimmerButton>
      </div>
    </nav>
  );
}
