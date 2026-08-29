import { readdirSync, readFileSync, statSync } from "fs";
import { join, relative } from "path";

const forbiddenDarkImportantBackground = "dark:" + "!bg-";
const forbiddenSkyTabPill = "bg-" + "sky-100";

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) return sourceFiles(path);
    if (/\.(ts|tsx)$/.test(entry)) return [path];
    return [];
  });
}

function offendersMatching(
  pattern: RegExp,
  options: { allowThemeClasses?: boolean } = {},
) {
  const root = join(process.cwd(), "src");
  return sourceFiles(root).flatMap((path) => {
    if (path.endsWith("themeClasses.guard.test.ts")) return [];
    if (options.allowThemeClasses && path.endsWith("themeClasses.ts"))
      return [];
    return readFileSync(path, "utf8")
      .split("\n")
      .flatMap((line, index) =>
        pattern.test(line)
          ? [`${relative(process.cwd(), path)}:${index + 1}`]
          : [],
      );
  });
}

test("surface backgrounds do not use dark important background overrides", () => {
  expect(
    offendersMatching(new RegExp(forbiddenDarkImportantBackground)),
  ).toEqual([]);
});

test("grey text colour utilities are centralized in themeClasses", () => {
  expect(offendersMatching(/text-slate-/, { allowThemeClasses: true })).toEqual(
    [],
  );
});

test("focus ring utilities are centralized in themeClasses", () => {
  expect(
    offendersMatching(/focus(?:-visible)?:ring-/, { allowThemeClasses: true }),
  ).toEqual([]);
});

test("old sky filled-pill tab backgrounds are not used", () => {
  expect(offendersMatching(new RegExp(forbiddenSkyTabPill))).toEqual([]);
});
