import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import type { FormHTMLAttributes } from "react";
import { themeClasses } from "./themeClasses";

const formVariants = cva("", {
  variants: {
    surface: {
      card: `rounded-xl border shadow-xl ${themeClasses.border.default} ${themeClasses.surface.panel}`,
      none: "",
    },
  },
  defaultVariants: {
    surface: "card",
  },
});

type FormProps = FormHTMLAttributes<HTMLFormElement> &
  VariantProps<typeof formVariants>;

export function Form({ surface, className, ...props }: FormProps) {
  return <form className={twMerge(formVariants({ surface }), className)} {...props} />;
}
