import { render, screen } from "@testing-library/react";
import { RoleBundleHelp } from "./RoleBundleHelp";

test("explains that capabilities remain daemon authoritative", () => {
  render(<RoleBundleHelp roles={["inference_admin"]} />);

  expect(screen.getByRole("heading", { name: /role bundle guide/i })).toBeInTheDocument();
  expect(screen.getByText(/daemon remains authoritative/i)).toBeInTheDocument();
  expect(screen.getAllByText("Inference admin").length).toBeGreaterThan(0);
  expect(screen.getByText("inference.catalog.manage")).toBeInTheDocument();
  expect(screen.getByText(/from role inference_admin/i)).toBeInTheDocument();
});

test("lists typical role bundles even without current roles", () => {
  render(<RoleBundleHelp />);

  expect(screen.getByText("Basic principal")).toBeInTheDocument();
  expect(screen.getByText("Auditor/read-only operator")).toBeInTheDocument();
  expect(screen.queryByText(/matching bundle/i)).not.toBeInTheDocument();
});
