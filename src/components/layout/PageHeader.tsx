import type { ReactNode } from "react";
import { Text, TextLink } from "../typography";

export interface PageHeaderProps {
  eyebrow: string;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  badge?: ReactNode;
  backLink?: {
    to: string;
    label: string;
  };
  className?: string;
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
  badge,
  backLink,
  className = "",
}: PageHeaderProps) {
  return (
    <div
      className={`flex flex-wrap items-start justify-between gap-4 ${className}`.trim()}
    >
      <div>
        {backLink ? (
          <TextLink to={backLink.to}>{backLink.label}</TextLink>
        ) : null}
        <Text
          as="p"
          intent="muted"
          size="sm"
          className={`${backLink ? "mt-4 " : ""}font-medium uppercase tracking-[0.3em]`}
        >
          {eyebrow}
        </Text>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <Text
            as="h1"
            intent="primary"
            className="text-3xl font-semibold tracking-tight"
          >
            {title}
          </Text>
          {badge}
        </div>
        {description ? (
          <Text as="p" intent="subtle" size="sm" className="mt-2 max-w-3xl">
            {description}
          </Text>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
