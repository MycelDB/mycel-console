import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  Field,
  MultiSelectChecklist,
  SelectField,
  uniqueOptions,
} from "./InferenceFormControls";

test("Field renders an input and forwards value changes", async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();

  render(<Field label="Credential key" value="" onChange={onChange} />);

  await user.type(screen.getByLabelText("Credential key"), "cred");
  expect(onChange).toHaveBeenCalled();
  expect(onChange).toHaveBeenLastCalledWith("d");
});

test("SelectField renders options and forwards selection changes", async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();

  render(
    <SelectField
      label="Endpoint"
      value=""
      onChange={onChange}
      placeholder="Choose endpoint"
      options={[{ value: "endpoint_1", label: "Primary endpoint" }]}
    />,
  );

  await user.selectOptions(screen.getByLabelText("Endpoint"), "endpoint_1");
  expect(onChange).toHaveBeenCalledWith("endpoint_1");
});

test("MultiSelectChecklist renders choices, empty state, and forwards toggles", async () => {
  const user = userEvent.setup();
  const onToggle = jest.fn();
  const { rerender } = render(
    <MultiSelectChecklist
      label="Model refs"
      values={[]}
      options={[{ value: "model_a", label: "Model A", hint: "chat" }]}
      emptyText="No models"
      onToggle={onToggle}
    />,
  );

  await user.click(screen.getByLabelText("Model refs: Model A"));
  expect(onToggle).toHaveBeenCalledWith("model_a", true);

  rerender(
    <MultiSelectChecklist
      label="Model refs"
      values={[]}
      options={[]}
      emptyText="No models"
      onToggle={onToggle}
    />,
  );
  expect(screen.getByText("No models")).toBeInTheDocument();
});

test("uniqueOptions keeps the last option for each value", () => {
  expect(
    uniqueOptions([
      { value: "one", label: "One" },
      { value: "one", label: "Duplicate" },
      { value: "two", label: "Two" },
    ]),
  ).toEqual([
    { value: "one", label: "Duplicate" },
    { value: "two", label: "Two" },
  ]);
});
