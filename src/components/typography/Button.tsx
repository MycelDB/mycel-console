import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes } from "react";
import { themeClasses } from "./themeClasses";

export const buttonVariants = cva(
  "transition disabled:cursor-not-allowed disabled:opacity-60",
  {
    variants: {
      variant: {
        primary: `rounded-md px-4 py-2 font-medium ${themeClasses.interactive.primary}`,
        secondary: `rounded-md border px-3 py-2 text-sm font-medium ${themeClasses.border.input} ${themeClasses.text.primary} ${themeClasses.interactive.secondary}`,
        danger: "rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-100 dark:border-red-900 dark:bg-red-950/40 dark:text-red-300 dark:hover:bg-red-950/70",
      },
    },
    defaultVariants: { variant: "primary" },
  },
);

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  VariantProps<typeof buttonVariants>;

export function Button({ variant, className, ...props }: ButtonProps) {
  return <button className={twMerge(buttonVariants({ variant }), className)} {...props} />;
}
