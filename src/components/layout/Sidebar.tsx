import { NavLink } from "react-router-dom";
import { Text } from "../typography";

const navItems = [
  { label: "Dashboard", to: "/dashboard" },
  { label: "Users", to: "/users" },
  { label: "Spaces", to: "/spaces" },
  { label: "Domains", to: "/domains" },
  { label: "Operators", to: "/operators" },
  { label: "Semantic", to: "/semantic" },
  { label: "Maintenance", to: "/maintenance" },
  { label: "Inference", to: "/inference" },
  { label: "Settings", to: "/settings" },
];

export function Sidebar() {
  return (
    <aside className="h-full w-64 shrink-0 border-r border-slate-800 bg-slate-900/80 p-4">
      <Text
        as="p"
        size="sm"
        className="font-medium uppercase tracking-[0.3em] text-cyan-300"
      >
        Mycel Admin
      </Text>
      <nav className="mt-8 space-y-2" aria-label="Main navigation">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            className={({ isActive }) =>
              [
                "block rounded-md px-3 py-2 text-sm font-medium transition",
                isActive
                  ? "bg-sky-950 text-sky-100"
                  : "text-slate-300 hover:bg-slate-800 hover:text-slate-100",
              ].join(" ")
            }
            to={item.to}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>
    </aside>
  );
}
