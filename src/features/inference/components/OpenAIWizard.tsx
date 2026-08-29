import { Button, Text, themeClasses } from "../../../components/typography";
import { Field } from "./InferenceFormControls";

export type OpenAIWizardForm = {
  spaceId: string;
  domainId: string;
  profileKey: string;
  credentialKey: string;
  secretValue: string;
  modelRef: string;
  operation: string;
  purpose: string;
};

export function OpenAIWizard({
  form,
  setForm,
  loading,
  onClose,
  onSubmit,
}: {
  form: OpenAIWizardForm;
  setForm: (
    value: OpenAIWizardForm | ((current: OpenAIWizardForm) => OpenAIWizardForm),
  ) => void;
  loading: boolean;
  onClose: () => void;
  onSubmit: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        className={`w-full max-w-2xl rounded-xl border ${themeClasses.border.default} ${themeClasses.surface.elevated} p-6 shadow-xl`}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <Text
              as="h3"
              className={`font-semibold ${themeClasses.text.parts.primaryLight} ${themeClasses.text.parts.darkPrimary}`}
            >
              Configure OpenAI
            </Text>
            <Text intent="muted" size="sm" className="mt-1">
              Creates a credential from a pasted API key, grant, policy, and
              automation profile. The API key is never stored in package
              metadata or displayed after submission.
            </Text>
          </div>
          <Button variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <Field
            label="Space ID"
            value={form.spaceId}
            onChange={(spaceId) =>
              setForm((current) => ({ ...current, spaceId }))
            }
          />
          <Field
            label="Domain ID"
            value={form.domainId}
            onChange={(domainId) =>
              setForm((current) => ({ ...current, domainId }))
            }
          />
          <Field
            label="Profile key"
            value={form.profileKey}
            onChange={(profileKey) =>
              setForm((current) => ({ ...current, profileKey }))
            }
          />
          <Field
            label="Credential key"
            value={form.credentialKey}
            onChange={(credentialKey) =>
              setForm((current) => ({ ...current, credentialKey }))
            }
          />
          <Field
            label="OpenAI API key"
            type="password"
            value={form.secretValue}
            onChange={(secretValue) =>
              setForm((current) => ({ ...current, secretValue }))
            }
          />
          <Field
            label="Model ref"
            value={form.modelRef}
            onChange={(modelRef) =>
              setForm((current) => ({ ...current, modelRef }))
            }
          />
          <Field
            label="Operation"
            value={form.operation}
            onChange={(operation) =>
              setForm((current) => ({ ...current, operation }))
            }
          />
          <Field
            label="Purpose"
            value={form.purpose}
            onChange={(purpose) =>
              setForm((current) => ({ ...current, purpose }))
            }
          />
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSubmit}
            disabled={loading || !form.secretValue.trim()}
          >
            {loading ? "Configuring…" : "Create OpenAI setup"}
          </Button>
        </div>
      </div>
    </div>
  );
}
