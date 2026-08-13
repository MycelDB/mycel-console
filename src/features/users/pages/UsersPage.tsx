import { useCallback, useEffect, useMemo, useState } from "react";
import { Button, ErrorBox, H2, Text } from "../../../components/typography";
import { isPrincipalDeleted, principalIdOf } from "../../../types/users";
import {
  createUser as defaultCreateUser,
  deleteUser as defaultDeleteUser,
  disableUser as defaultDisableUser,
  enableUser as defaultEnableUser,
  listUsers as defaultListUsers,
  setUserPassword as defaultSetUserPassword,
} from "../../../services/adminService";
import type {
  CreateUserInput,
  DeleteUserInput,
  DisableUserInput,
  ListUsersInput,
  ListUsersResponse,
  SetUserPasswordInput,
  UserInfo,
} from "../../../types/users";
import { CreateUserModal } from "../components/CreateUserModal";
import { DeleteUserDialog } from "../components/DeleteUserDialog";
import { DisableUserDialog } from "../components/DisableUserDialog";
import { SetUserPasswordDialog } from "../components/SetUserPasswordDialog";
import { UserFilters, type UserFiltersValue } from "../components/UserFilters";
import { UserTable } from "../components/UserTable";

const defaultFilters: UserFiltersValue = {
  query: "",
  state: "all",
  includeDisabled: true,
  includeDeleted: false,
};

export type UsersPageProps = {
  listUsersService?: (input: ListUsersInput) => Promise<ListUsersResponse>;
  createUserService?: (input: CreateUserInput) => Promise<UserInfo>;
  disableUserService?: (input: DisableUserInput) => Promise<UserInfo>;
  enableUserService?: (userId: string) => Promise<UserInfo>;
  deleteUserService?: (input: DeleteUserInput) => Promise<UserInfo>;
  setUserPasswordService?: (input: SetUserPasswordInput) => Promise<UserInfo>;
};

export function UsersPage({
  listUsersService = defaultListUsers,
  createUserService = defaultCreateUser,
  disableUserService = defaultDisableUser,
  enableUserService = defaultEnableUser,
  deleteUserService = defaultDeleteUser,
  setUserPasswordService = defaultSetUserPassword,
}: UsersPageProps) {
  const [filters, setFilters] = useState<UserFiltersValue>(defaultFilters);
  const [users, setUsers] = useState<UserInfo[]>([]);
  const [nextPageToken, setNextPageToken] = useState("");
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [disableUser, setDisableUser] = useState<UserInfo | null>(null);
  const [deleteUser, setDeleteUser] = useState<UserInfo | null>(null);
  const [passwordUser, setPasswordUser] = useState<UserInfo | null>(null);
  const [actionLoadingUserId, setActionLoadingUserId] = useState("");

  const loadUsers = useCallback(
    async ({ append = false, pageToken = "" }: { append?: boolean; pageToken?: string } = {}) => {
      setError("");
      if (append) setLoadingMore(true);
      else setLoading(true);

      try {
        const response = await listUsersService({
          pageSize: 100,
          pageToken,
          includeDisabled: filters.includeDisabled,
          includeDeleted: filters.includeDeleted,
        });
        setUsers((current) => (append ? [...current, ...response.users] : response.users));
        setNextPageToken(response.nextPageToken);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load users");
      } finally {
        if (append) setLoadingMore(false);
        else setLoading(false);
      }
    },
    [filters.includeDeleted, filters.includeDisabled, listUsersService],
  );

  useEffect(() => {
    void loadUsers();
  }, [loadUsers]);

  function replaceUser(updatedUser: UserInfo) {
    const updatedPrincipalId = principalIdOf(updatedUser);
    setUsers((current) => current.map((user) => (principalIdOf(user) === updatedPrincipalId ? updatedUser : user)));
  }

  function removeOrReplaceDeletedUser(updatedUser: UserInfo) {
    const updatedPrincipalId = principalIdOf(updatedUser);
    if (isPrincipalDeleted(updatedUser) && !filters.includeDeleted) {
      setUsers((current) => current.filter((user) => principalIdOf(user) !== updatedPrincipalId));
      return;
    }
    replaceUser(updatedUser);
  }

  async function handleEnableUser(user: UserInfo) {
    setError("");
    setActionLoadingUserId(principalIdOf(user));
    try {
      const updated = await enableUserService(principalIdOf(user));
      replaceUser(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Enable user failed");
    } finally {
      setActionLoadingUserId("");
    }
  }

  const filteredUsers = useMemo(() => {
    const query = filters.query.trim().toLowerCase();
    return users.filter((user) => {
      if (!filters.includeDisabled && (user.state === "PRINCIPAL_STATE_DISABLED" || user.state === "USER_STATE_DISABLED")) return false;
      if (!filters.includeDeleted && isPrincipalDeleted(user)) return false;
      if (filters.state !== "all") {
        const legacyState = String(filters.state).replace("PRINCIPAL_STATE_", "USER_STATE_");
        if (user.state !== filters.state && user.state !== legacyState) return false;
      }
      if (query && !user.username.toLowerCase().includes(query)) return false;
      return true;
    });
  }, [filters, users]);

  return (
    <section className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Text
            as="p"
            size="sm"
            className="font-medium uppercase tracking-[0.3em] text-cyan-300"
          >
            Principals
          </Text>
          <H2 className="mt-2 text-slate-900 dark:text-slate-100">Principal Management</H2>
          <Text intent="muted" className="mt-2 max-w-2xl text-slate-600 dark:text-slate-400">
            Inspect human principals and prepare for principal lifecycle operations.
          </Text>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => void loadUsers()} disabled={loading || loadingMore}>
            Refresh
          </Button>
          <Button variant="secondary" onClick={() => setCreateOpen(true)}>
            Create principal
          </Button>
        </div>
      </div>

      <UserFilters value={filters} onChange={setFilters} />

      {error && <ErrorBox>{error}</ErrorBox>}

      {!loading && (
        <Text intent="muted" size="sm" className="text-slate-600 dark:text-slate-400">
          Showing {filteredUsers.length} of {users.length} loaded principal{users.length === 1 ? "" : "s"}.
        </Text>
      )}

      {loading ? (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 p-8 text-center">
          <Text intent="muted" className="text-slate-600 dark:text-slate-400">
            Loading principals…
          </Text>
        </div>
      ) : (
        <>
          <UserTable
            users={filteredUsers}
            onDisableUser={setDisableUser}
            onEnableUser={(user) => void handleEnableUser(user)}
            onDeleteUser={setDeleteUser}
            onSetPassword={setPasswordUser}
            actionLoadingUserId={actionLoadingUserId}
          />
          {nextPageToken && (
            <div className="flex justify-center">
              <Button
                variant="secondary"
                onClick={() => void loadUsers({ append: true, pageToken: nextPageToken })}
                disabled={loadingMore}
              >
                {loadingMore ? "Loading more…" : "Load more"}
              </Button>
            </div>
          )}
        </>
      )}
      <CreateUserModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onCreate={createUserService}
        onCreated={() => void loadUsers()}
      />
      <DisableUserDialog
        user={disableUser}
        onClose={() => setDisableUser(null)}
        onDisable={disableUserService}
        onDisabled={replaceUser}
      />
      <DeleteUserDialog
        user={deleteUser}
        onClose={() => setDeleteUser(null)}
        onDelete={deleteUserService}
        onDeleted={removeOrReplaceDeletedUser}
      />
      <SetUserPasswordDialog
        user={passwordUser}
        onClose={() => setPasswordUser(null)}
        onSetPassword={setUserPasswordService}
        onPasswordSet={replaceUser}
      />
    </section>
  );
}
