
import { motion } from "framer-motion";
import { cn } from "../lib/utils";

export const TextGenerateEffect = ({
  words,
  className,
}: {
  words: string;
  className?: string;
}) => {
  const wordsArray = words.split(" ");
  
  const container = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };
  
  const item = {
    hidden: { opacity: 0 },
    show: { opacity: 1 },
  };

  return (
    <div className={cn("font-bold", className)}>
      <div className="mt-4">
        <motion.div 
            variants={container}
            initial="hidden"
            animate="show"
            className="text-gray-600 text-lg md:text-xl leading-relaxed tracking-wide"
        >
            {wordsArray.map((word, idx) => {
              return (
                <motion.span
                  key={word + idx}
                  variants={item}
                >
                  {word}{" "}
                </motion.span>
              );
            })}
        </motion.div>
      </div>
    </div>
  );
};
