import { storedTheme, THEME_STORAGE_KEY } from "./theme";

function stubMatchMedia(matches: boolean) {
  Object.defineProperty(window, "matchMedia", {
    configurable: true,
    writable: true,
    value: jest.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: jest.fn(),
      removeListener: jest.fn(),
      addEventListener: jest.fn(),
      removeEventListener: jest.fn(),
      dispatchEvent: jest.fn(),
    })),
  });
}

describe("storedTheme", () => {
  const originalMatchMedia = window.matchMedia;

  beforeEach(() => {
    localStorage.clear();
    stubMatchMedia(false);
  });

  afterEach(() => {
    localStorage.clear();
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: originalMatchMedia,
    });
  });

  test("uses stored light theme over OS preference", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "light");
    stubMatchMedia(false);

    expect(storedTheme()).toBe("light");
    expect(window.matchMedia).not.toHaveBeenCalled();
  });

  test("uses stored dark theme over OS preference", () => {
    localStorage.setItem(THEME_STORAGE_KEY, "dark");
    stubMatchMedia(true);

    expect(storedTheme()).toBe("dark");
    expect(window.matchMedia).not.toHaveBeenCalled();
  });

  test("uses light OS preference when no theme is stored", () => {
    stubMatchMedia(true);

    expect(storedTheme()).toBe("light");
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-color-scheme: light)",
    );
  });

  test("falls back to dark when no theme is stored and light OS preference does not match", () => {
    stubMatchMedia(false);

    expect(storedTheme()).toBe("dark");
    expect(window.matchMedia).toHaveBeenCalledWith(
      "(prefers-color-scheme: light)",
    );
  });

  test("falls back to dark when matchMedia is unavailable", () => {
    Object.defineProperty(window, "matchMedia", {
      configurable: true,
      writable: true,
      value: undefined,
    });

    expect(storedTheme()).toBe("dark");
  });
});
