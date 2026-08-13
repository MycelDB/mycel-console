import { Link } from "react-router-dom";
import { Text } from "../../../components/typography";
import type { UserInfo } from "../../../types/users";
import { isPrincipalActive, isPrincipalDeleted, isPrincipalDisabled, principalIdOf } from "../../../types/users";
import { UserStateBadge } from "./UserStateBadge";

export type UserTableProps = {
  users: UserInfo[];
  onDisableUser?: (user: UserInfo) => void;
  onEnableUser?: (user: UserInfo) => void;
  onDeleteUser?: (user: UserInfo) => void;
  onSetPassword?: (user: UserInfo) => void;
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
        <Text as="p" className="font-medium text-slate-900 dark:text-slate-100">
          No principals found
        </Text>
        <Text intent="muted" size="sm" className="mt-2 text-slate-600 dark:text-slate-400">
          Adjust filters or refresh after creating principals.
        </Text>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70">
      <table className="min-w-full divide-y divide-slate-200 dark:divide-slate-800">
        <thead className="bg-slate-50 dark:bg-slate-950/40">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Username</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Principal ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">State</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
          {users.map((user) => {
            const principalId = principalIdOf(user);
            return (
              <tr key={principalId} className="hover:bg-slate-100 dark:hover:bg-slate-800/40">
                <td className="px-4 py-3 font-medium">
                  <Link className="text-sky-700 hover:text-sky-900 dark:text-sky-300 dark:hover:text-sky-100" to={`/principals/${encodeURIComponent(principalId)}`}>
                    {user.username}
                  </Link>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-400">{principalId}</td>
                <td className="px-4 py-3"><UserStateBadge state={user.state} /></td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex flex-wrap gap-2">
                    {isPrincipalActive(user) && onDisableUser && (
                      <button
                        className="rounded px-2 py-1 text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/50"
                        onClick={() => onDisableUser(user)}
                        disabled={actionLoadingUserId === principalId}
                      >
                        {actionLoadingUserId === principalId ? "Working…" : "Disable"}
                      </button>
                    )}
                    {isPrincipalDisabled(user) && onEnableUser && (
                      <button
                        className="rounded px-2 py-1 text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                        onClick={() => onEnableUser(user)}
                        disabled={actionLoadingUserId === principalId}
                      >
                        {actionLoadingUserId === principalId ? "Working…" : "Enable"}
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
                    {isPrincipalDeleted(user) && <span className="text-slate-500">No actions</span>}
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
