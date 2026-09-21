"use client";
import Link from "next/link";
import { motion, useReducedMotion } from "motion/react";
import { ArrowUpRight } from "lucide-react";

const MotionLink = motion.create(Link);
const spring = { type: "spring", stiffness: 420, damping: 24 } as const;

export function AcademyNavLink({ label, href, current, onNavigate }: { label: string; href: string; current?: boolean; onNavigate?: () => void }) {
  const reduced = useReducedMotion();
  return <MotionLink
    href={href}
    className="academy-nav-highlight"
    aria-current={current ? "page" : undefined}
    onClick={onNavigate}
    initial="rest"
    animate="rest"
    whileHover="active"
    whileFocus="active"
    whileTap={reduced ? undefined : { scale: 0.96 }}
    transition={spring}
  >
    {label}
    <motion.span
      className="academy-nav-arrow"
      aria-hidden="true"
      variants={{ rest: { rotate: 0, x: 0 }, active: reduced ? { rotate: 45 } : { rotate: 45, x: 3 } }}
      transition={reduced ? { duration: 0 } : spring}
    >
      <ArrowUpRight size={16} strokeWidth={2.25} />
    </motion.span>
  </MotionLink>;
}
