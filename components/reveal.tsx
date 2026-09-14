"use client";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
export function Reveal({
  children,
  className,
  delay = 0,
  from = "bottom",
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  from?: "top" | "bottom";
}) {
  const reduced = useReducedMotion();
  return (
    <motion.div
      className={`reveal ${className ?? ""}`}
      initial={{
        opacity: 0,
        transform: `translateY(${from === "top" ? -50 : 24}px)`,
      }}
      whileInView={{ opacity: 1, transform: "translateY(0px)" }}
      viewport={{ once: true, amount: 0.1 }}
      transition={{
        duration: reduced ? 0 : 0.65,
        delay: reduced ? 0 : delay,
        ease: [0.23, 1, 0.32, 1],
      }}
    >
      {children}
    </motion.div>
  );
}
