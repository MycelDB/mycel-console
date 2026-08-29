import { render, screen } from "@testing-library/react";
import { ModelEndpointTable } from "./ModelEndpointTable";

test("renders endpoint rows", () => {
  render(
    <ModelEndpointTable
      endpoints={[
        {
          modelEndpointId: "ep1",
          key: "openai",
          name: "OpenAI",
          connectorType: "openai-compatible",
          endpointUrl: "https://api.openai.com/v1",
          networkClass: "external_https",
          privacyClass: "third_party",
          authModes: ["api_key"],
          operations: ["embeddings"],
          enabled: true,
        },
      ]}
    />,
  );
  expect(screen.getByText("openai")).toBeInTheDocument();
  expect(screen.getByText("Openai Compatible")).toBeInTheDocument();
  expect(screen.getByText("Embeddings")).toBeInTheDocument();
  expect(screen.getByText("Third Party")).toBeInTheDocument();
  expect(screen.getByText("https://api.openai.com/v1")).toBeInTheDocument();
});

test("renders endpoint empty state", () => {
  render(<ModelEndpointTable endpoints={[]} />);
  expect(screen.getByText(/no model endpoints/i)).toBeInTheDocument();
});
