import { cva, type VariantProps } from "class-variance-authority";
import { twMerge } from "tailwind-merge";
import type { ElementType, HTMLAttributes } from "react";
import { themeClasses } from "./themeClasses";

const textVariants = cva("", {
  variants: {
    intent: {
      primary: themeClasses.text.primary,
      muted: themeClasses.text.muted,
      subtle: themeClasses.text.subtle,
      danger: themeClasses.text.danger,
      inverse: themeClasses.text.inverse,
    },
    size: {
      xs: "text-xs",
      sm: "text-sm",
      md: "text-base",
      lg: "text-lg",
    },
  },
  defaultVariants: {
    intent: "primary",
    size: "md",
  },
});

type TextProps = HTMLAttributes<HTMLElement> &
  VariantProps<typeof textVariants> & {
    as?: ElementType;
  };

export function Text({ as: Component = "p", intent, size, className, ...props }: TextProps) {
  return <Component className={twMerge(textVariants({ intent, size }), className)} {...props} />;
}
