import { useState, useEffect, useRef } from 'react';
import { BorderBeam } from './BorderBeam';
import { useNavigate } from 'react-router-dom';

export function FileUpload() {
  const navigate = useNavigate();
  const [isUploaded, setIsUploaded] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const mouseRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];

    const resize = () => {
      canvas.width = container.offsetWidth;
      canvas.height = container.offsetHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      size: number;
      color: string;

      constructor() {
        this.x = Math.random() * canvas!.width;
        this.y = Math.random() * canvas!.height;
        this.vx = (Math.random() - 0.5) * 0.5;
        this.vy = (Math.random() - 0.5) * 0.5;
        this.size = Math.random() * 2 + 1;
        this.color = `rgba(249, 115, 22, ${Math.random() * 0.3 + 0.1})`; 
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        if (this.x < 0 || this.x > canvas!.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas!.height) this.vy *= -1;

        const dx = mouseRef.current.x - this.x;
        const dy = mouseRef.current.y - this.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const maxDistance = 100;

        if (distance < maxDistance) {
          const forceDirectionX = dx / distance;
          const forceDirectionY = dy / distance;
          const force = (maxDistance - distance) / maxDistance;
          const directionX = forceDirectionX * force * 0.5;
          const directionY = forceDirectionY * force * 0.5;

          this.vx -= directionX;
          this.vy -= directionY;
        }
      }

      draw() {
        if (!ctx) return;
        ctx.fillStyle = this.color;
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    const initParticles = () => {
      particles = [];
      const particleCount = Math.floor((canvas.width * canvas.height) / 8000); 
      for (let i = 0; i < particleCount; i++) {
        particles.push(new Particle());
      }
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(particle => {
        particle.update();
        particle.draw();
      });
      animationFrameId = requestAnimationFrame(animate);
    };

    resize();
    initParticles();
    animate();

    window.addEventListener('resize', resize);
    
    const handleMouseMove = (e: MouseEvent) => {
        const rect = container.getBoundingClientRect();
        mouseRef.current = {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };
    container.addEventListener('mousemove', handleMouseMove);
    container.addEventListener('mouseleave', () => { mouseRef.current = { x: -9999, y: -9999 }; });

    return () => {
      window.removeEventListener('resize', resize);
      container.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsUploaded(true);
    setTimeout(() => {
    }, 1000);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleClick = () => {
      if(!isUploaded) navigate('/login');
  };

  return (
    <div 
      ref={containerRef}
      onClick={handleClick}
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      className="group relative flex flex-col items-center justify-center h-64 md:h-96 p-8 md:p-16 border-2 border-dashed border-primary/30 rounded-[2.5rem] bg-card/50 backdrop-blur-xl border-white/5 cursor-pointer transition-all duration-500 shadow-premium hover:border-primary/60 hover:bg-primary/[0.02] w-full overflow-hidden"
    >
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 z-0 pointer-events-none opacity-40"
      />

      {!isUploaded && (
        <BorderBeam 
            size={350}
            duration={12}
            delay={9}
            colorFrom="hsl(var(--primary))" 
            colorTo="hsl(var(--primary) / 0.5)"
        />
      )}

      <div className="w-20 h-20 md:w-24 md:h-24 mb-6 md:mb-8 rounded-[2rem] bg-primary/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-6 transition-all duration-500 relative z-10 shadow-inner">
        <span className="material-symbols-outlined text-4xl md:text-5xl text-primary">
          {isUploaded ? 'check_circle' : 'cloud_upload'}
        </span>
      </div>
      
      <h3 className="text-xl md:text-2xl font-bold text-foreground mb-3 relative z-10 text-center tracking-tight">
        {isUploaded ? 'File Uploaded!' : 'Drag & drop assignment PDF here'}
      </h3>
      
      <p className="text-muted-foreground/70 text-sm md:text-base mb-8 md:mb-10 relative z-10 text-center font-medium max-w-xs leading-relaxed">
        {isUploaded ? 'Preparing your neural workspace...' : 'Securely process PDFs and images with advanced OCR & AI.'}
      </p>
      
      {!isUploaded && (
        <button className="px-10 py-4 rounded-2xl bg-primary text-primary-foreground font-black text-sm hover:shadow-[0_20px_40px_rgba(249,115,22,0.3)] hover:scale-[1.05] transition-all duration-300 relative z-10 uppercase tracking-widest">
          Choose File
        </button>
      )}
    </div>
  );
}
