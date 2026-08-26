import type { ReactNode } from "react";
import { Link } from "react-router-dom";

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

export function PageHeader({ eyebrow, title, description, actions, badge, backLink, className = "" }: PageHeaderProps) {
  return (
    <div className={`flex flex-wrap items-start justify-between gap-4 ${className}`.trim()}>
      <div>
        {backLink ? (
          <Link className="text-sm font-medium text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to={backLink.to}>
            {backLink.label}
          </Link>
        ) : null}
        <p className={`${backLink ? "mt-4 " : ""}text-sm font-medium uppercase tracking-[0.3em] text-slate-500 dark:text-slate-400`}>
          {eyebrow}
        </p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          {badge}
        </div>
        {description ? <p className="mt-2 max-w-3xl text-sm text-slate-600 dark:text-slate-400">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap gap-2">{actions}</div> : null}
    </div>
  );
}
