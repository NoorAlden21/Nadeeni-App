export const spring = { type: "spring", stiffness: 400, damping: 25 };

export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: "easeOut" } },
};

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08 } },
};

export const press = {
  whileHover: { scale: 1.02 },
  whileTap: { scale: 0.97, y: 3 },
  transition: spring,
};
