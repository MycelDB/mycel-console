import {
  Button,
  PrincipalLabel,
  ResourceIdText,
  Text,
  themeClasses,
  TableHead,
} from "../../../components/typography";
import type { PrincipalInfo } from "../../../types/users";
import {
  isPrincipalActive,
  isPrincipalDeleted,
  isPrincipalDisabled,
  principalIdOf,
} from "../../../types/users";
import { UserStateBadge } from "./UserStateBadge";

export type UserTableProps = {
  users: PrincipalInfo[];
  onDisableUser?: (user: PrincipalInfo) => void;
  onEnableUser?: (user: PrincipalInfo) => void;
  onDeleteUser?: (user: PrincipalInfo) => void;
  onSetPassword?: (user: PrincipalInfo) => void;
  actionLoadingUserId?: string;
};

export function UserTable({
  users,
  onDisableUser,
  onEnableUser,
  onDeleteUser,
  onSetPassword,
  actionLoadingUserId = "",
}: UserTableProps) {
  if (users.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 dark:border-slate-700 dark:bg-slate-900/40 p-8 text-center">
        <Text as="p" className={`font-medium ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}>
          No principals found
        </Text>
        <Text intent="muted" size="sm" className="mt-2">
          Adjust filters or refresh after creating principals.
        </Text>
      </div>
    );
  }

  return (
    <div
      className={`overflow-hidden rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.panel}`}
    >
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-950/40">
          <tr>
            <TableHead className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
              Principal
            </TableHead>
            <TableHead className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
              Identifier
            </TableHead>
            <TableHead className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
              State
            </TableHead>
            <TableHead className={`px-4 py-3 text-left text-xs font-medium uppercase tracking-wide ${themeClasses.text.parts.mutedLight}`}>
              Actions
            </TableHead>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {users.map((user) => {
            const principalId = principalIdOf(user);
            return (
              <tr
                key={principalId}
                className="hover:bg-slate-100 dark:hover:bg-slate-800/40"
              >
                <td className="px-4 py-3">
                  <PrincipalLabel
                    principalId={principalId}
                    username={user.username}
                    displayName={user.displayName}
                    link
                    showId={false}
                  />
                </td>
                <td className="px-4 py-3">
                  <ResourceIdText value={principalId} />
                </td>
                <td className="px-4 py-3">
                  <UserStateBadge state={user.state} />
                </td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {isPrincipalActive(user) && onDisableUser && (
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => onDisableUser(user)}
                        disabled={actionLoadingUserId === principalId}
                      >
                        {actionLoadingUserId === principalId
                          ? "Working…"
                          : "Disable"}
                      </Button>
                    )}
                    {isPrincipalDisabled(user) && onEnableUser && (
                      <button
                        className="rounded px-2 py-1 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                        onClick={() => onEnableUser(user)}
                        disabled={actionLoadingUserId === principalId}
                      >
                        {actionLoadingUserId === principalId
                          ? "Working…"
                          : "Enable"}
                      </button>
                    )}
                    {!isPrincipalDeleted(user) && onSetPassword && (
                      <button
                        className="rounded px-2 py-1 text-sky-700 hover:bg-sky-50 dark:text-sky-300 dark:hover:bg-sky-950/50"
                        onClick={() => onSetPassword(user)}
                        disabled={actionLoadingUserId === principalId}
                      >
                        Set password
                      </button>
                    )}
                    {!isPrincipalDeleted(user) && onDeleteUser && (
                      <button
                        className="rounded px-2 py-1 text-red-700 hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/50"
                        onClick={() => onDeleteUser(user)}
                        disabled={actionLoadingUserId === principalId}
                      >
                        Delete
                      </button>
                    )}
                    {isPrincipalDeleted(user) && (
                      <span className={`${themeClasses.text.parts.mutedLight}`}>No actions</span>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
