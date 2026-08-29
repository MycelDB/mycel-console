import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import {
  EnumBadge,
  formatEnumLabel,
  PrincipalLabel,
  ResourceIdText,
  SpaceLabel,
} from "./ResourceLabels";

test("formatEnumLabel converts protobuf-style enum names to product labels", () => {
  expect(formatEnumLabel("SPACE_STATE_ARCHIVED")).toBe("Archived");
  expect(formatEnumLabel("SEARCH_INDEX_STATE_DEGRADED")).toBe("Degraded");
  expect(formatEnumLabel("semantic.embedding")).toBe("Semantic Embedding");
  expect(formatEnumLabel("third_party")).toBe("Third Party");
});

test("ResourceIdText shortens long IDs but keeps the exact value available", () => {
  render(<ResourceIdText value="principal-1234567890abcdef" />);

  expect(screen.getByTitle("principal-1234567890abcdef")).toHaveTextContent(
    "principal-…90abcdef",
  );
});

test("resource labels prefer names while keeping IDs as secondary metadata", () => {
  render(
    <MemoryRouter>
      <SpaceLabel spaceId="sp_1234567890abcdef" name="Research" link />
      <PrincipalLabel
        principalId="prn_1234567890abcdef"
        username="martin"
        displayName="Martin"
        link
      />
      <EnumBadge value="SEMANTIC_RULE_STATE_ACTIVE" />
    </MemoryRouter>,
  );

  expect(screen.getByRole("link", { name: "Research" })).toHaveAttribute(
    "href",
    "/spaces/sp_1234567890abcdef",
  );
  expect(screen.getByRole("link", { name: "Martin" })).toHaveAttribute(
    "href",
    "/principals/prn_1234567890abcdef",
  );
  expect(screen.getByText("Active")).toBeInTheDocument();
  expect(
    screen.queryByText("SEMANTIC_RULE_STATE_ACTIVE"),
  ).not.toBeInTheDocument();
});
