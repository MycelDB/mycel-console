import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { LexicalSearchPage } from "./LexicalSearchPage";
import type { LexicalSearchInput, LexicalSearchResponse } from "../../../types/lexical";

const emptySearchResponse: LexicalSearchResponse = {
  results: [],
  nextPageToken: "",
  freshness: null,
  warnings: [],
};

function renderSearchPage(
  lexicalSearchService = jest
    .fn<Promise<LexicalSearchResponse>, [LexicalSearchInput]>()
    .mockResolvedValue(emptySearchResponse),
) {
  render(
    <LexicalSearchPage
      listSpacesService={jest.fn().mockResolvedValue({
        spaces: [{ spaceId: "space-1", name: "Main", state: "SPACE_STATE_ACTIVE" }],
        nextPageToken: "",
      })}
      listDomainsService={jest.fn().mockResolvedValue({
        domains: [{ domainId: "domain-1", spaceId: "space-1", key: "default", name: "Default", description: "", state: "DOMAIN_STATE_ACTIVE", isDefault: true, system: false }],
        nextPageToken: "",
      })}
      lexicalSearchService={lexicalSearchService}
    />,
  );
  return lexicalSearchService;
}

test("lexical mode sends its query through the lexical channel", async () => {
  const search = renderSearchPage();
  const lexicalQuery = await screen.findByLabelText("Lexical query");
  await userEvent.type(lexicalQuery, '"raft recovery"');
  await userEvent.click(screen.getByRole("button", { name: "Search" }));

  await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
  expect(search).toHaveBeenCalledWith(expect.objectContaining({
    mode: "lexical",
    lexicalQuery: '"raft recovery"',
    semanticQuery: undefined,
  }));
});

test("hybrid mode requires and sends distinct channel queries", async () => {
  const search = renderSearchPage();
  const lexicalQuery = await screen.findByLabelText("Lexical query");
  expect(screen.getByRole("heading", { name: "Search" })).toBeInTheDocument();
  await userEvent.selectOptions(screen.getByLabelText("Mode"), "hybrid");
  expect(screen.getByLabelText("Semantic weight")).toBeInTheDocument();
  expect(screen.getByLabelText("Semantic rule ID")).toBeInTheDocument();
  expect(screen.getByLabelText("Embedding binding key")).toBeInTheDocument();
  const semanticQuery = screen.getByLabelText("Semantic query");
  const submit = screen.getByRole("button", { name: "Search" });

  await userEvent.type(lexicalQuery, '"raft" OR "recovery"');
  expect(submit).toBeDisabled();
  await userEvent.type(semanticQuery, "how does raft recover?");
  expect(submit).toBeEnabled();
  await userEvent.click(submit);

  await waitFor(() => expect(search).toHaveBeenCalledTimes(1));
  expect(search).toHaveBeenCalledWith(expect.objectContaining({
    mode: "hybrid",
    lexicalQuery: '"raft" OR "recovery"',
    semanticQuery: "how does raft recover?",
  }));
});
