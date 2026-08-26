import { render, screen } from "@testing-library/react";
import { Alert } from "./Alert";

test("renders an error alert with default icon", () => {
  render(<Alert>Something failed</Alert>);

  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("❌");
  expect(alert).toHaveTextContent("Something failed");
});

test("can hide the variant icon", () => {
  render(<Alert icon={false}>Quiet message</Alert>);

  expect(screen.getByRole("alert")).toHaveTextContent("Quiet message");
  expect(screen.getByRole("alert")).not.toHaveTextContent("❌");
});

test("renders warning variant as an alert", () => {
  render(<Alert variant="warning">Session expired</Alert>);

  const alert = screen.getByRole("alert");
  expect(alert).toHaveTextContent("⚠️");
  expect(alert).toHaveTextContent("Session expired");
});

test("renders status variants with status role", () => {
  render(<Alert variant="success">Saved</Alert>);

  expect(screen.getByRole("status")).toHaveTextContent("✅");
  expect(screen.getByRole("status")).toHaveTextContent("Saved");
});
