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
