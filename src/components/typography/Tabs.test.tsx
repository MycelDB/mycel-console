import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { Tabs, type TabItem } from "./Tabs";

type DemoTab = "one" | "two" | "three";
const tabs: TabItem<DemoTab>[] = [
  { id: "one", label: "One" },
  { id: "two", label: "Two" },
  { id: "three", label: "Three" },
];

function ControlledTabs({ onChange }: { onChange: (tab: DemoTab) => void }) {
  const [active, setActive] = useState<DemoTab>("one");
  return (
    <Tabs
      tabs={tabs}
      active={active}
      ariaLabel="Demo sections"
      onChange={(tab) => {
        setActive(tab);
        onChange(tab);
      }}
    />
  );
}

test("renders a tablist with the selected tab marked", () => {
  render(
    <Tabs
      tabs={tabs}
      active="two"
      ariaLabel="Demo sections"
      onChange={jest.fn()}
    />,
  );

  expect(
    screen.getByRole("tablist", { name: "Demo sections" }),
  ).toBeInTheDocument();
  expect(screen.getByRole("tab", { name: "Two" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
  expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
    "aria-selected",
    "false",
  );
});

test("fires onChange on click and arrow-key navigation", async () => {
  const user = userEvent.setup();
  const onChange = jest.fn();
  render(<ControlledTabs onChange={onChange} />);

  await user.click(screen.getByRole("tab", { name: "Three" }));
  expect(onChange).toHaveBeenLastCalledWith("three");
  expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await user.keyboard("{ArrowRight}");
  expect(onChange).toHaveBeenLastCalledWith("one");
  expect(screen.getByRole("tab", { name: "One" })).toHaveAttribute(
    "aria-selected",
    "true",
  );

  await user.keyboard("{ArrowLeft}");
  expect(onChange).toHaveBeenLastCalledWith("three");
  expect(screen.getByRole("tab", { name: "Three" })).toHaveAttribute(
    "aria-selected",
    "true",
  );
});
