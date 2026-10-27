import { useEffect, useId, useMemo, useState } from "react";
import {
  Button,
  Input,
  themeClasses,
} from "../../../components/typography";
import type { PrincipalInfo } from "../../../types/users";
import { isPrincipalActive } from "../../../types/users";

export type PrincipalOwnerSelectorProps = {
  principals: PrincipalInfo[];
  selectedPrincipal: PrincipalInfo | null;
  query: string;
  loading: boolean;
  loadingMore: boolean;
  error: string;
  hasMore: boolean;
  onQueryChange: (query: string) => void;
  onSelect: (principal: PrincipalInfo) => void;
  onClear: () => void;
  onLoadMore: () => void;
  onRetry: () => void;
  onUseManualFallback: () => void;
};

export function PrincipalOwnerSelector({
  principals,
  selectedPrincipal,
  query,
  loading,
  loadingMore,
  error,
  hasMore,
  onQueryChange,
  onSelect,
  onClear,
  onLoadMore,
  onRetry,
  onUseManualFallback,
}: PrincipalOwnerSelectorProps) {
  const inputId = useId();
  const listboxId = `${inputId}-listbox`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const activePrincipals = useMemo(
    () => principals.filter(isPrincipalActive),
    [principals],
  );
  const filteredPrincipals = useMemo(
    () => filterPrincipals(activePrincipals, selectedPrincipal ? "" : query),
    [activePrincipals, query, selectedPrincipal],
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [query, principals, selectedPrincipal]);

  function moveActive(delta: number) {
    if (filteredPrincipals.length === 0) return;
    setActiveIndex((current) =>
      (current + delta + filteredPrincipals.length) % filteredPrincipals.length,
    );
  }

  function selectActive() {
    const principal = filteredPrincipals[activeIndex];
    if (!principal) return;
    onSelect(principal);
    setOpen(false);
  }

  return (
    <div className="space-y-2">
      <div className="space-y-1">
        <label
          htmlFor={inputId}
          className={`block text-sm font-medium ${themeClasses.text.parts.bodyLight} ${themeClasses.text.parts.darkStrong}`}
        >
          Owner principal
        </label>
        <div className="relative">
          <Input
            id={inputId}
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={open}
            aria-controls={listboxId}
            aria-activedescendant={
              open && filteredPrincipals[activeIndex]
                ? principalOptionId(listboxId, filteredPrincipals[activeIndex])
                : undefined
            }
            className={selectedPrincipal ? "pr-10 text-sm" : "text-sm"}
            value={selectedPrincipal?.username || query}
            readOnly={Boolean(selectedPrincipal)}
            title={
              selectedPrincipal
                ? `Principal ID: ${selectedPrincipal.principalId}`
                : undefined
            }
            onClick={() => setOpen(true)}
            onFocus={() => setOpen(true)}
            onChange={(event) => {
              if (selectedPrincipal) return;
              onQueryChange(event.target.value);
              setOpen(true);
            }}
            onKeyDown={(event) => {
              if (event.key === "ArrowDown") {
                event.preventDefault();
                setOpen(true);
                moveActive(1);
              } else if (event.key === "ArrowUp") {
                event.preventDefault();
                setOpen(true);
                moveActive(-1);
              } else if (event.key === "Enter" && open) {
                event.preventDefault();
                selectActive();
              } else if (event.key === "Escape") {
                setOpen(false);
              }
            }}
            placeholder="Search username"
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
          />
          {selectedPrincipal && (
            <button
              type="button"
              aria-label="Clear owner"
              title="Clear owner"
              className={`absolute inset-y-1 right-1 flex w-8 items-center justify-center rounded-md text-lg leading-none ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted} ${themeClasses.interactive.secondary} ${themeClasses.text.hover.primary} ${themeClasses.focus.ring}`}
              onMouseDown={(event) => event.preventDefault()}
              onClick={() => {
                setOpen(false);
                onClear();
              }}
            >
              <span aria-hidden="true">×</span>
            </button>
          )}
        </div>
      </div>

      {selectedPrincipal && !open ? null : loading ? (
        <CatalogMessage>Loading owner principals…</CatalogMessage>
      ) : error ? (
        <CatalogMessage intent="error">
          <span>Principal catalog failed: {error}</span>
          <span className="flex flex-wrap gap-2">
            <Button variant="secondary" onClick={onRetry}>
              Retry principal catalog
            </Button>
            <Button variant="secondary" onClick={onUseManualFallback}>
              Use manual username instead
            </Button>
          </span>
        </CatalogMessage>
      ) : activePrincipals.length === 0 ? (
        <CatalogMessage>
          No active owner principals are available in the catalog.
        </CatalogMessage>
      ) : (
        <>
          {open && filteredPrincipals.length > 0 && (
            <ul
              id={listboxId}
              role="listbox"
              aria-label="Owner principal results"
              className={`max-h-64 overflow-y-auto rounded-lg border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-1 shadow-lg`}
            >
              {filteredPrincipals.map((principal, index) => (
                <li
                  id={principalOptionId(listboxId, principal)}
                  key={principal.principalId}
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`cursor-pointer rounded-md px-3 py-2 hover:bg-slate-100 dark:hover:bg-slate-800 ${index === activeIndex ? "bg-slate-100 dark:bg-slate-800" : ""}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSelect(principal);
                    setOpen(false);
                  }}
                >
                  <PrincipalOptionContent principal={principal} />
                </li>
              ))}
            </ul>
          )}
          {!selectedPrincipal && query.trim() && filteredPrincipals.length === 0 && (
            <CatalogMessage>
              No matches among the {activePrincipals.length} loaded active principal
              {activePrincipals.length === 1 ? "" : "s"}.
              {hasMore && " More principals have not been loaded yet."}
            </CatalogMessage>
          )}
          <div className={`text-xs ${themeClasses.text.parts.mutedLight} ${themeClasses.text.parts.darkMuted}`}>
            {filteredPrincipals.length} match
            {filteredPrincipals.length === 1 ? "" : "es"} among {activePrincipals.length}{" "}
            loaded active principal{activePrincipals.length === 1 ? "" : "s"}.
            {hasMore && " The catalog is partially loaded."}
          </div>
          {hasMore && (
            <Button variant="secondary" onClick={onLoadMore} disabled={loadingMore}>
              {loadingMore ? "Loading more principals…" : "Load more principals"}
            </Button>
          )}
        </>
      )}
    </div>
  );
}

function PrincipalOptionContent({ principal }: { principal: PrincipalInfo }) {
  return (
    <div className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
      {principal.username || principal.displayName || "Name not reported"}
    </div>
  );
}

function CatalogMessage({
  children,
  intent = "neutral",
}: {
  children: React.ReactNode;
  intent?: "neutral" | "error";
}) {
  return (
    <div
      role={intent === "error" ? "alert" : "status"}
      className={`flex flex-col gap-2 rounded-lg border p-3 text-sm ${
        intent === "error"
          ? "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200"
          : `border-slate-200 bg-slate-50 ${themeClasses.text.parts.subtleLight} dark:border-slate-800 dark:bg-slate-900/40 ${themeClasses.text.parts.darkMuted}`
      }`}
    >
      {children}
    </div>
  );
}

function filterPrincipals(principals: PrincipalInfo[], query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return principals;
  return principals.filter((principal) =>
    String(principal.username || principal.displayName || "")
      .toLowerCase()
      .includes(needle),
  );
}

function principalOptionId(listboxId: string, principal: PrincipalInfo) {
  return `${listboxId}-${principal.principalId.replace(/[^a-zA-Z0-9_-]/g, "-")}`;
}
