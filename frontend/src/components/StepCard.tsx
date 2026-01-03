import { motion } from 'framer-motion';
// @ts-ignore
import { Tilt } from 'react-tilt';

interface StepCardProps {
  number: string;
  title: string;
  description: string;
}

export function StepCard({ number, title, description }: StepCardProps) {
  const defaultOptions = {
    max: 15,
    scale: 1.05,
    speed: 1000,
    glare: true,
    "max-glare": 0.1,
  };

  return (
    <Tilt options={defaultOptions} className="h-full">
      <motion.div 
        initial={{ y: 0 }}
        className="flex flex-col p-8 rounded-lg bg-transparent border border-gray-200 transition-colors h-full hover:bg-white/80 dark:hover:bg-neutral-900/50 hover:shadow-xl dark:border-neutral-800 dark:hover:shadow-[0_0_30px_-5px_rgba(249,115,22,0.3)] hover:border-transparent duration-300"
      >
        <span className="text-5xl font-bold bg-accent-gradient text-transparent bg-clip-text opacity-90 mb-4 font-space">
          {number}
        </span>
        <h3 className="text-xl font-bold text-brand-text-primary dark:text-neutral-200 mb-2">
          {title}
        </h3>
        <p className="text-brand-text-secondary dark:text-neutral-400 leading-relaxed">
          {description}
        </p>
      </motion.div>
    </Tilt>
  );
}
