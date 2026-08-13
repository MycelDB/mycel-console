export const DEFAULT_CLUSTER_ADDR = "127.0.0.1:19091";

export type LoginInput = {
  addr: string;
  username: string;
  password: string;
};

export type PrincipalSession = {
  addr: string;
  principalId: string;
  username: string;
};

export type ConnectionDiagnosticCheck = {
  id: string;
  label: string;
  status: "pass" | "warn" | "fail" | string;
  detail: string;
};

export type ConnectionDiagnosticsResponse = {
  addr: string;
  checks: ConnectionDiagnosticCheck[];
};
