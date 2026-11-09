import { cva } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex w-fit items-center rounded-full px-2.5 py-0.5 text-xs font-bold whitespace-nowrap",
  {
    variants: {
      variant: {
        default: "bg-burgundy text-on-primary",
        secondary: "bg-wash text-gold-deep ring-1 ring-gold/50",
      },
    },
    defaultVariants: {
      variant: "secondary",
    },
  },
);

function Badge({ className, variant, ...props }) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
