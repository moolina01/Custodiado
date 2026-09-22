import "@testing-library/jest-dom/vitest";

// jsdom has no ResizeObserver — components/custodio/Navbar.tsx (rendered by
// every page that uses it, including the panel/admin views under test)
// uses one to track its own height. A no-op stub is enough: nothing here
// asserts on layout measurements.
if (typeof globalThis.ResizeObserver === "undefined") {
  globalThis.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
