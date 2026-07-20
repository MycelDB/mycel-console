import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImportInferencePackageModal } from "./ImportInferencePackageModal";

test("does not render when closed", () => {
  render(<ImportInferencePackageModal open={false} loading={false} onClose={jest.fn()} onImport={jest.fn()} />);

  expect(screen.queryByText(/import inference package json/i)).not.toBeInTheDocument();
});

test("imports valid pasted JSON", async () => {
  const onImport = jest.fn().mockResolvedValue(undefined);
  render(<ImportInferencePackageModal open loading={false} onClose={jest.fn()} onImport={onImport} />);

  fireEvent.change(screen.getByLabelText(/or paste package json/i), {
    target: { value: JSON.stringify({ name: "standard-openai-chat", version: "2026-06" }) },
  });
  await userEvent.click(screen.getByRole("button", { name: /^import package$/i }));

  await waitFor(() =>
    expect(onImport).toHaveBeenCalledWith({
      name: "standard-openai-chat",
      version: "2026-06",
      source: "",
      model_endpoints: [],
      models: [],
      vector_stores: [],
      model_endpoint_capabilities: [],
    }),
  );
});

test("uses selected file name as source fallback", async () => {
  const onImport = jest.fn().mockResolvedValue(undefined);
  render(<ImportInferencePackageModal open loading={false} onClose={jest.fn()} onImport={onImport} />);

  const file = new File([JSON.stringify({ name: "pkg", version: "1" })], "pkg.json", {
    type: "application/json",
  });
  await userEvent.upload(screen.getByLabelText(/package json file/i), file);
  await userEvent.click(screen.getByRole("button", { name: /^import package$/i }));

  await waitFor(() => expect(onImport).toHaveBeenCalledWith(expect.objectContaining({ source: "pkg.json" })));
});

test("validates JSON syntax", async () => {
  render(<ImportInferencePackageModal open loading={false} onClose={jest.fn()} onImport={jest.fn()} />);

  fireEvent.change(screen.getByLabelText(/or paste package json/i), { target: { value: "not json" } });
  await userEvent.click(screen.getByRole("button", { name: /^import package$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/unexpected token|invalid/i);
});

test("validates required name and version", async () => {
  render(<ImportInferencePackageModal open loading={false} onClose={jest.fn()} onImport={jest.fn()} />);

  fireEvent.change(screen.getByLabelText(/or paste package json/i), { target: { value: JSON.stringify({ name: "pkg" }) } });
  await userEvent.click(screen.getByRole("button", { name: /^import package$/i }));

  expect(await screen.findByRole("alert")).toHaveTextContent(/package version is required/i);
});

test("invokes close callback", async () => {
  const onClose = jest.fn();
  render(<ImportInferencePackageModal open loading={false} onClose={onClose} onImport={jest.fn()} />);

  await userEvent.click(screen.getByRole("button", { name: /cancel/i }));

  expect(onClose).toHaveBeenCalledTimes(1);
});
