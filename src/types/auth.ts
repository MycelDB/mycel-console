export const DEFAULT_CLUSTER_ADDR = "127.0.0.1:9091";

export type LoginInput = {
  addr: string;
  username: string;
  password: string;
};

export type OperatorSession = {
  addr: string;
  operatorId: string;
  username: string;
};
