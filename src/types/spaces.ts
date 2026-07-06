export type SpaceState =
  | "SPACE_STATE_UNSPECIFIED"
  | "SPACE_STATE_ACTIVE"
  | "SPACE_STATE_ARCHIVED";

export type SpaceInfo = {
  spaceId: string;
  name: string;
  state?: SpaceState | string;
};

export type ListSpacesInput = {
  pageSize?: number;
  pageToken?: string;
  includeArchived?: boolean;
};

export type ListSpacesResponse = {
  spaces: SpaceInfo[];
  nextPageToken: string;
};
