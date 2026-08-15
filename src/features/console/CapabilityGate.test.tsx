import { render, screen } from "@testing-library/react";
import { capability, completeCapabilities, unknownCapabilities } from "./capabilities";
import { CapabilityGate } from "./CapabilityGate";
import { FeatureUnavailable } from "./FeatureUnavailable";

test("renders children when requirements are met", () => {
  render(
    <CapabilityGate state={completeCapabilities([capability("space.read")])} requirements={[{ capability: "space.read" }]}>
      <p>Allowed feature</p>
    </CapabilityGate>,
  );

  expect(screen.getByText("Allowed feature")).toBeInTheDocument();
});

test("hides children when fallback is hide", () => {
  const { container } = render(
    <CapabilityGate state={unknownCapabilities()} requirements={[{ capability: "access.read" }]}>
      <p>Hidden feature</p>
    </CapabilityGate>,
  );

  expect(screen.queryByText("Hidden feature")).not.toBeInTheDocument();
  expect(container).toBeEmptyDOMElement();
});

test("renders unavailable state when fallback is disabled", () => {
  render(
    <CapabilityGate
      state={unknownCapabilities()}
      requirements={[{ capability: "access.read" }]}
      fallback="disabled"
      unavailableTitle="Access unavailable"
    >
      <p>Disabled feature</p>
    </CapabilityGate>,
  );

  expect(screen.getByText("Access unavailable")).toBeInTheDocument();
  expect(screen.getByText("access.read")).toBeInTheDocument();
  expect(screen.queryByText("Disabled feature")).not.toBeInTheDocument();
});

test("renders children for readonly fallback so pages can gate actions internally", () => {
  render(
    <CapabilityGate state={unknownCapabilities()} requirements={[{ capability: "space.write" }]} fallback="readonly">
      <p>Read-only page</p>
    </CapabilityGate>,
  );

  expect(screen.getByText("Read-only page")).toBeInTheDocument();
});

test("FeatureUnavailable describes readonly mode", () => {
  render(<FeatureUnavailable availability="readonly" title="Read-only" />);

  expect(screen.getByText("Read-only")).toBeInTheDocument();
  expect(screen.getByText(/mutation actions are not available/i)).toBeInTheDocument();
});
