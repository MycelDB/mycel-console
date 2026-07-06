import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import type { InputHTMLAttributes } from "react";
import { themeClasses } from "./themeClasses";

const inputVariants = cva(
  `rounded-md ${themeClasses.form.input} ${themeClasses.border.input} ${themeClasses.focus.ring}`,
  {
    variants: {
      fit: {
        full: "w-full",
        auto: "",
      },
      inputSize: {
        sm: "px-2 py-1 text-sm",
        md: "px-3 py-2",
      },
    },
    defaultVariants: {
      fit: "full",
      inputSize: "md",
    },
  },
);

type InputProps = InputHTMLAttributes<HTMLInputElement> &
  VariantProps<typeof inputVariants>;

export function Input({ fit, inputSize, className, ...props }: InputProps) {
  return <input className={twMerge(inputVariants({ fit, inputSize }), className)} {...props} />;
}
