import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { DashboardPage } from "./DashboardPage";

const session = {
  addr: "127.0.0.1:9091",
  operatorId: "operator-1",
  username: "operator",
};

test("renders dashboard cards and shortcuts", () => {
  render(
    <MemoryRouter>
      <DashboardPage session={session} />
    </MemoryRouter>,
  );

  expect(screen.getByText("127.0.0.1:9091")).toBeInTheDocument();
  expect(screen.getByText("operator")).toBeInTheDocument();
  expect(screen.getByText("Connected")).toBeInTheDocument();
  expect(screen.getByText(/no alarms available yet/i)).toBeInTheDocument();
  expect(screen.getByRole("link", { name: /manage users/i })).toHaveAttribute("href", "/users");
});
