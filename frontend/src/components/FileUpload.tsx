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
        this.color = `rgba(249, 115, 22, ${Math.random() * 0.3 + 0.1})`; // Orange/Amber
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce off walls
        if (this.x < 0 || this.x > canvas!.width) this.vx *= -1;
        if (this.y < 0 || this.y > canvas!.height) this.vy *= -1;

        // Mouse interaction (gentle repel)
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
      const particleCount = Math.floor((canvas.width * canvas.height) / 8000); // Responsive count
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
    
    // Mouse relative to container
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
        // navigate('/login'); 
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
      className="group relative flex flex-col items-center justify-center h-64 md:h-96 p-8 md:p-16 border-2 border-dashed border-orange-500/50 rounded-lg bg-white dark:bg-neutral-900/50 dark:backdrop-blur-md dark:border-neutral-800 cursor-pointer transition-all duration-300 shadow-sm hover:shadow-md hover:border-amber-500 hover:bg-brand-primary/5 dark:hover:bg-neutral-800/50 w-full overflow-hidden"
    >
      {/* Particle Canvas */}
      <canvas 
        ref={canvasRef}
        className="absolute inset-0 z-0 pointer-events-none"
      />

      {/* Border Beam - Only show if not uploaded */}
      {!isUploaded && (
        <BorderBeam 
            size={250}
            duration={12}
            delay={9}
            colorFrom="#f97316" 
            colorTo="#f59e0b"
        />
      )}

      {/* Content */}
      <div className="w-16 h-16 md:w-20 md:h-20 mb-4 md:mb-6 rounded-full bg-orange-50 flex items-center justify-center group-hover:scale-110 transition-transform duration-300 relative z-10">
        <span className="material-symbols-outlined text-4xl md:text-5xl bg-accent-gradient text-transparent bg-clip-text">
          {isUploaded ? 'check_circle' : 'cloud_upload'}
        </span>
      </div>
      
      <h3 className="text-lg md:text-xl font-bold text-brand-text-primary dark:text-gray-100 mb-2 relative z-10 text-center">
        {isUploaded ? 'File Uploaded!' : 'Drag & drop assignment PDF here'}
      </h3>
      
      <p className="text-brand-text-secondary text-xs md:text-sm mb-6 md:mb-8 relative z-10 text-center">
        {isUploaded ? 'Redirecting...' : 'Supported formats: PDF, DOCX (Max 20MB)'}
      </p>
      
      {!isUploaded && (
        <button className="px-6 py-2.5 md:px-8 md:py-3 rounded bg-brand-text-primary text-white font-semibold text-xs md:text-sm hover:shadow-[0_4px_14px_0_rgba(249,115,22,0.39)] hover:scale-[1.02] hover:text-orange-400 transition-all duration-300 relative z-10">
          Browse Files
        </button>
      )}
    </div>
  );
}
