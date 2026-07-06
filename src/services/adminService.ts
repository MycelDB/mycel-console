import { invoke } from "@tauri-apps/api/core";
import type { LoginInput, OperatorSession } from "../types/auth";
import type { ListSpacesInput, ListSpacesResponse } from "../types/spaces";
import type {
  CreateUserInput,
  DeleteUserInput,
  DisableUserInput,
  ListUsersInput,
  ListUsersResponse,
  SetUserPasswordInput,
  UserInfo,
} from "../types/users";

export async function login(input: LoginInput): Promise<OperatorSession> {
  return invoke<OperatorSession>("admin_login", { input });
}

export async function logout(): Promise<void> {
  await invoke<void>("admin_logout");
}

export async function whoAmI(): Promise<OperatorSession | null> {
  return invoke<OperatorSession | null>("admin_whoami");
}

export async function listUsers(input: ListUsersInput = {}): Promise<ListUsersResponse> {
  return invoke<ListUsersResponse>("admin_list_users", { input });
}

export async function listSpaces(input: ListSpacesInput = {}): Promise<ListSpacesResponse> {
  return invoke<ListSpacesResponse>("admin_list_spaces", { input });
}

export async function createUser(input: CreateUserInput): Promise<UserInfo> {
  return invoke<UserInfo>("admin_create_user", { input });
}

export async function disableUser(input: DisableUserInput): Promise<UserInfo> {
  return invoke<UserInfo>("admin_disable_user", { input });
}

export async function enableUser(userId: string): Promise<UserInfo> {
  return invoke<UserInfo>("admin_enable_user", { userId });
}

export async function deleteUser(input: DeleteUserInput): Promise<UserInfo> {
  return invoke<UserInfo>("admin_delete_user", { input });
}

export async function setUserPassword(input: SetUserPasswordInput): Promise<UserInfo> {
  return invoke<UserInfo>("admin_set_user_password", { input });
}
