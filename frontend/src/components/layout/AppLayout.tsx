import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FileText, 
  LogOut, 
  BookOpen,
  Menu,
  X,
  User,
  Settings,
  HelpCircle,
  ChevronRight,
  Bell
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/Button';
import { Separator } from '@/components/ui/Separator';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/ThemeToggle';
import { motion, AnimatePresence } from 'framer-motion';

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
  active?: boolean;
  onClick?: () => void;
}

const NavItem = ({ to, icon, label, active, onClick }: NavItemProps) => (
  <Link
    to={to}
    onClick={onClick}
    className={cn(
      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group relative",
      active 
        ? "text-[#1c1b19] dark:text-[#f7f3ee]" 
        : "text-[#3b3a37] dark:text-[#cfc8be] hover:text-[#1c1b19] hover:bg-[#f7f3ee] dark:hover:text-[#f7f3ee] dark:hover:bg-[#1a1a1a]"
    )}
  >
    {active && (
      <motion.div 
        layoutId="activeNavIndicator"
        className="absolute left-[-12px] w-1 h-5 bg-[#1c1b19] rounded-r-full"
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
      />
    )}
    <span className={cn("transition-colors", active ? "text-[#1c1b19] dark:text-[#f7f3ee]" : "text-[#3b3a37] dark:text-[#cfc8be] group-hover:text-[#1c1b19] dark:group-hover:text-[#f7f3ee]")}>
      {icon}
    </span>
    <span className="flex-1">{label}</span>
    {active && <ChevronRight className="h-3 w-3 opacity-50" />}
  </Link>
);

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Dashboard' },
    { to: '/uploads', icon: <FileText className="h-4 w-4" />, label: 'Archive' },
    { to: '/settings', icon: <Settings className="h-4 w-4" />, label: 'Settings' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-[#f7f3ee] dark:bg-[#0b0b0b] text-[#1c1b19] dark:text-[#f7f3ee] font-editorial selection:bg-[#1c1b19] selection:text-[#f7f3ee]">
      {/* Background Ambience */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute inset-0 bg-paper opacity-60 dark:opacity-0" />
        <div className="absolute top-0 left-1/4 w-[500px] h-[500px] rounded-full bg-[#f1e6d9] blur-[140px] dark:bg-[#1b1b1b]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] rounded-full bg-[#e8dfd4] blur-[140px] dark:bg-[#111111]" />
      </div>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-64 flex-col border-r border-[#1c1b19] dark:border-[#262626] bg-white/70 dark:bg-[#0e0e0e] relative z-50">
        <div className="h-16 flex items-center px-6 border-b border-[#1c1b19] dark:border-[#262626]">
          <Link to="/" className="flex items-center gap-2.5 font-bold text-lg tracking-tight group">
            <div className="w-8 h-8 rounded-full border border-[#1c1b19] dark:border-[#2a2a2a] flex items-center justify-center text-[#1c1b19] dark:text-[#f7f3ee] transition-transform group-hover:scale-95">
              <BookOpen className="h-4 w-4" />
            </div>
            <span className="font-bold">HomeworkAI</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-3 space-y-1 mt-6">
          <div className="text-[10px] font-mono-alt uppercase tracking-[0.3em] px-3 mb-2 flex items-center justify-between text-[#3b3a37] dark:text-[#9b948a]">
            Navigation
          </div>
          {navItems.map((item) => (
            <NavItem 
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to}
            />
          ))}
          
          <Separator className="my-6 opacity-50 mx-3" />
          
          <div className="text-[10px] font-mono-alt uppercase tracking-[0.3em] px-3 mb-2 text-[#3b3a37] dark:text-[#9b948a]">Systems</div>
        </nav>

        <div className="p-4 border-t border-[#1c1b19] dark:border-[#262626]">
            <div className="flex items-center gap-3 px-2 py-2 group cursor-pointer">
              <div className="h-8 w-8 rounded-full border border-[#1c1b19] dark:border-[#262626] flex items-center justify-center text-[#1c1b19] dark:text-[#f7f3ee]">
                <User className="h-4 w-4" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-xs font-semibold truncate">{user?.name || 'User'}</p>
                <p className="text-[10px] text-[#3b3a37] dark:text-[#9b948a] truncate tracking-tight">{user?.email}</p>
              </div>
              <button 
                onClick={handleLogout}
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-md hover:bg-[#f7f3ee] dark:hover:bg-[#1a1a1a]"
              >
                <LogOut className="h-3 w-3 text-[#3b3a37] dark:text-[#c8c2b8]" />
              </button>
            </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-14 border-b border-[#1c1b19] dark:border-[#2a2a2a] bg-white/80 dark:bg-[#121212] backdrop-blur-md flex items-center justify-between px-4 z-50">
          <button 
            onClick={() => setIsMobileMenuOpen(true)}
            className="p-2 -ml-2 text-[#3b3a37] dark:text-[#b9b3aa]"
          >
            <Menu className="h-5 w-5" />
          </button>
          <Link to="/" className="font-bold text-sm tracking-tight">HomeworkAI</Link>
          <div className="h-8 w-8 rounded-full border border-[#1c1b19] dark:border-[#2a2a2a]" />
        </header>

        {/* Action Header - Desktop */}
        <header className="hidden md:flex h-16 items-center justify-between px-8 border-b border-[#1c1b19] dark:border-[#262626] bg-white/70 dark:bg-[#0f0f0f] backdrop-blur-sm">
          <div className="flex items-center gap-2 text-xs font-mono-alt text-[#3b3a37] dark:text-[#9b948a]">
             <span>Workspace</span>
             <ChevronRight className="h-3 w-3 opacity-50" />
             <span className="font-semibold uppercase tracking-wider">{location.pathname.split('/').pop() || 'Personal'}</span>
           </div>
           <div className="flex items-center gap-3">
             <ThemeToggle />
             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-[#3b3a37] dark:text-[#c8c2b8] hover:text-[#1c1b19]">
                <Bell className="h-4 w-4" />
             </Button>
             <div className="h-4 w-px bg-[#1c1b19] dark:bg-[#262626] mx-1" />
             <Button variant="ghost" size="icon" className="h-9 w-9 rounded-lg text-[#3b3a37] dark:text-[#c8c2b8] hover:text-[#1c1b19]">
                <HelpCircle className="h-4 w-4" />
             </Button>
           </div>
        </header>

        {/* Scrolling Content */}
        <main className="flex-1 overflow-y-auto px-6 md:px-10 pb-20 pt-8 scrollbar-hide">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
            className="max-w-5xl mx-auto"
          >
            {children}
          </motion.div>
        </main>

        {/* Bottom Shade */}
        <div className="fixed bottom-0 right-0 left-64 h-32 bg-gradient-to-t from-[#f7f3ee] dark:from-[#0b0b0b] to-transparent pointer-events-none" />
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[60] bg-black/40 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 30, stiffness: 300 }}
              className="fixed inset-y-0 left-0 z-[70] w-72 bg-white dark:bg-[#121212] p-6 flex flex-col"
            >
              <div className="flex items-center justify-between mb-8">
                <span className="font-bold text-lg">HomeworkAI</span>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="h-5 w-5" />
                </button>
              </div>
              
              <nav className="flex-1 space-y-2">
                {navItems.map((item) => (
                  <NavItem 
                    key={item.to}
                    to={item.to}
                    icon={item.icon}
                    label={item.label}
                    active={location.pathname === item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                ))}
              </nav>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </div>
  );
};
