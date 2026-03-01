import "@testing-library/jest-dom/vitest";
import { afterEach, vi } from "vitest";

// Global cleanup to prevent mock leaks between tests
afterEach(() => {
	vi.restoreAllMocks();
});

// Restore real timers if any test used fake timers
afterEach(() => {
	vi.useRealTimers();
});
