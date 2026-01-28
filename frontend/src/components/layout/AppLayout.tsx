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
  HelpCircle
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
      "flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all duration-200 group relative",
      active 
        ? "bg-primary/10 text-primary shadow-sm" 
        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
    )}
  >
    {active && (
      <motion.div 
        layoutId="activeNav"
        className="absolute left-0 w-1 h-6 bg-primary rounded-r-full"
      />
    )}
    <span className={cn("transition-transform group-hover:scale-110", active && "scale-110")}>
      {icon}
    </span>
    {label}
  </Link>
);

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { to: '/dashboard', icon: <LayoutDashboard className="h-4 w-4" />, label: 'Overview' },
    { to: '/uploads', icon: <FileText className="h-4 w-4" />, label: 'My Documents' },
  ];

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-background font-inter selection:bg-primary/20 selection:text-primary">
      {/* Dynamic Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand-500/5 blur-[120px]" />
        <div className="absolute inset-0 bg-noise opacity-[0.03]" />
      </div>

      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex w-72 flex-col m-4 mr-0 rounded-2xl glass-card overflow-hidden">
        <div className="p-8">
          <Link to="/" className="flex items-center gap-3 font-bold text-2xl tracking-tight group">
            <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-primary-foreground shadow-lg shadow-primary/20 group-hover:rotate-12 transition-transform">
              <BookOpen className="h-6 w-6" />
            </div>
            <span className="text-gradient">HomeworkAI</span>
          </Link>
        </div>
        
        <nav className="flex-1 px-4 space-y-2 mt-4">
          <div className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest px-4 mb-2">Main Menu</div>
          {navItems.map((item) => (
            <NavItem 
              key={item.to}
              to={item.to}
              icon={item.icon}
              label={item.label}
              active={location.pathname === item.to}
            />
          ))}
          
          <Separator className="my-6 opacity-20 mx-4" />
          
          <div className="text-[10px] font-bold text-muted-foreground/50 uppercase tracking-widest px-4 mb-2">Preferences</div>
          <div className="px-4 py-2 flex items-center justify-between glass-card rounded-xl border-none mx-2">
            <span className="text-xs font-medium text-muted-foreground">Dark Mode</span>
            <ThemeToggle />
          </div>
        </nav>

        <div className="p-4 mt-auto">
          <div className="glass-card rounded-xl p-4 bg-gradient-to-br from-primary/5 to-transparent border-white/5">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-10 w-10 rounded-full bg-primary/20 flex items-center justify-center text-primary ring-2 ring-primary/10 ring-offset-2 ring-offset-background">
                <User className="h-5 w-5" />
              </div>
              <div className="flex-1 overflow-hidden">
                <p className="text-sm font-semibold truncate leading-none mb-1">{user?.name || 'User'}</p>
                <p className="text-[10px] text-muted-foreground truncate opacity-70">{user?.email}</p>
              </div>
            </div>
            <Button 
              variant="secondary" 
              size="sm"
              className="w-full justify-start gap-3 rounded-lg bg-background/50 hover:bg-destructive/10 hover:text-destructive transition-all border-none h-9"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              <span className="text-xs">Sign Out</span>
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Mobile Header */}
        <header className="md:hidden h-16 glass-card border-x-0 border-t-0 flex items-center justify-between px-4 z-40">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsMobileMenuOpen(true)}
            className="rounded-xl"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <Link to="/" className="font-bold text-lg text-gradient">HomeworkAI</Link>
          <ThemeToggle />
        </header>

        {/* Action Header - Desktop */}
        <header className="hidden md:flex h-20 items-center justify-between px-10">
          <div className="flex-1">
            <h2 className="text-lg font-medium text-muted-foreground/80">
              Welcome back, <span className="text-foreground font-bold">{user?.name?.split(' ')[0] || 'Scholar'}</span>
            </h2>
          </div>
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/5 group">
              <Settings className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Button>
            <Button variant="ghost" size="icon" className="rounded-xl hover:bg-primary/5 group">
              <HelpCircle className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
            </Button>
            <Separator orientation="vertical" className="h-6 mx-2 opacity-20" />
            <div className="h-10 w-10 rounded-xl glass-card overflow-hidden flex items-center justify-center group cursor-pointer hover:border-primary/30 transition-colors">
              <User className="h-5 w-5 group-hover:text-primary transition-colors" />
            </div>
          </div>
        </header>

        {/* Scrolling Content */}
        <main className="flex-1 overflow-y-auto px-4 md:px-10 pb-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="max-w-6xl mx-auto pt-4"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile Drawer */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setIsMobileMenuOpen(false)}
            />
            <motion.aside 
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-80 bg-neutral-900 border-r border-white/5 md:hidden p-6 flex flex-col shadow-2xl"
            >
              <div className="flex items-center justify-between mb-10">
                <span className="font-bold text-xl text-white">HomeworkAI</span>
                <Button variant="ghost" size="icon" onClick={() => setIsMobileMenuOpen(false)} className="rounded-xl text-white">
                  <X className="h-6 w-6" />
                </Button>
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

