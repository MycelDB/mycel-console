import { twMerge } from "tailwind-merge";
import type { HTMLAttributes } from "react";
import { themeClasses } from "./themeClasses";

type MainProps = HTMLAttributes<HTMLElement>;

export function Main({ className, ...props }: MainProps) {
  return (
    <main
      className={twMerge(`min-h-screen ${themeClasses.surface.app} ${themeClasses.text.primary}`, className)}
      {...props}
    />
  );
}
