import { Text } from "../../../components/typography";
import type { UserInfo } from "../../../types/users";
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
      <div className="rounded-xl border border-dashed border-slate-700 bg-slate-900/40 p-8 text-center">
        <Text as="p" className="font-medium text-slate-100">
          No users found
        </Text>
        <Text intent="muted" size="sm" className="mt-2 text-slate-400">
          Adjust filters or refresh after creating users.
        </Text>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border border-slate-800 bg-slate-900/70">
      <table className="min-w-full divide-y divide-slate-800">
        <thead className="bg-slate-950/40">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Username</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">User ID</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">State</th>
            <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wide text-slate-500">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-800">
          {users.map((user) => (
            <tr key={user.userId} className="hover:bg-slate-800/40">
              <td className="px-4 py-3 font-medium text-slate-100">{user.username}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-400">{user.userId}</td>
              <td className="px-4 py-3"><UserStateBadge state={user.state} /></td>
              <td className="px-4 py-3 text-sm">
                <div className="flex flex-wrap gap-2">
                  {user.state === "USER_STATE_ACTIVE" && onDisableUser && (
                    <button
                      className="rounded px-2 py-1 text-amber-300 hover:bg-amber-950/50"
                      onClick={() => onDisableUser(user)}
                      disabled={actionLoadingUserId === user.userId}
                    >
                      {actionLoadingUserId === user.userId ? "Working…" : "Disable"}
                    </button>
                  )}
                  {user.state === "USER_STATE_DISABLED" && onEnableUser && (
                    <button
                      className="rounded px-2 py-1 text-emerald-300 hover:bg-emerald-950/50"
                      onClick={() => onEnableUser(user)}
                      disabled={actionLoadingUserId === user.userId}
                    >
                      {actionLoadingUserId === user.userId ? "Working…" : "Enable"}
                    </button>
                  )}
                  {user.state !== "USER_STATE_DELETED" && onSetPassword && (
                    <button
                      className="rounded px-2 py-1 text-sky-300 hover:bg-sky-950/50"
                      onClick={() => onSetPassword(user)}
                      disabled={actionLoadingUserId === user.userId}
                    >
                      Set password
                    </button>
                  )}
                  {user.state !== "USER_STATE_DELETED" && onDeleteUser && (
                    <button
                      className="rounded px-2 py-1 text-red-300 hover:bg-red-950/50"
                      onClick={() => onDeleteUser(user)}
                      disabled={actionLoadingUserId === user.userId}
                    >
                      Delete
                    </button>
                  )}
                  {user.state === "USER_STATE_DELETED" && <span className="text-slate-500">No actions</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
