import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { OpenAIWizard, type OpenAIWizardForm } from "./OpenAIWizard";

const emptyForm: OpenAIWizardForm = {
  spaceId: "space_1",
  domainId: "domain_1",
  profileKey: "assistant",
  credentialKey: "openai-main",
  secretValue: "",
  modelRef: "gpt-4o-mini",
  operation: "chat",
  purpose: "summaries",
};

function WizardHarness({ onSubmit }: { onSubmit: () => void }) {
  const [form, setForm] = useState(emptyForm);
  return (
    <OpenAIWizard
      form={form}
      setForm={setForm}
      loading={false}
      onClose={jest.fn()}
      onSubmit={onSubmit}
    />
  );
}

test("renders controlled fields and enables submit after an API key is entered", async () => {
  const user = userEvent.setup();
  const onSubmit = jest.fn();

  render(<WizardHarness onSubmit={onSubmit} />);

  expect(
    screen.getByRole("heading", { name: "Configure OpenAI" }),
  ).toBeInTheDocument();
  expect(
    screen.getByRole("button", { name: "Create OpenAI setup" }),
  ).toBeDisabled();

  await user.type(screen.getByLabelText("OpenAI API key"), "sk-test");
  expect(
    screen.getByRole("button", { name: "Create OpenAI setup" }),
  ).toBeEnabled();

  await user.click(screen.getByRole("button", { name: "Create OpenAI setup" }));
  expect(onSubmit).toHaveBeenCalledTimes(1);
});

test("fires close callbacks", async () => {
  const user = userEvent.setup();
  const onClose = jest.fn();

  render(
    <OpenAIWizard
      form={{ ...emptyForm, secretValue: "sk-test" }}
      setForm={jest.fn()}
      loading={false}
      onClose={onClose}
      onSubmit={jest.fn()}
    />,
  );

  await user.click(screen.getByRole("button", { name: "Close" }));
  expect(onClose).toHaveBeenCalledTimes(1);
});
