import { InferencePage, type InferencePageProps } from "../../inference";

export function AccessPage(props: Omit<InferencePageProps, "section">) {
  return <InferencePage {...props} section="access" />;
}
