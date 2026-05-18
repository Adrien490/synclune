import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { act, cleanup, render, screen } from "@testing-library/react";

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

import { ShortcutKbd } from "../shortcut-kbd";

function setUserAgent(value: string) {
	Object.defineProperty(globalThis.navigator, "userAgent", {
		value,
		configurable: true,
	});
}

describe("ShortcutKbd", () => {
	const originalUserAgent = globalThis.navigator.userAgent;

	beforeEach(() => {
		setUserAgent("Mozilla/5.0 (X11; Linux x86_64)");
	});

	afterEach(() => {
		cleanup();
		setUserAgent(originalUserAgent);
	});

	it("renders Ctrl on non-Mac platforms", async () => {
		setUserAgent("Mozilla/5.0 (Windows NT 10.0; Win64; x64)");
		await act(async () => {
			render(<ShortcutKbd keyLabel="K" />);
		});
		expect(screen.getByText("Ctrl")).toBeInTheDocument();
		expect(screen.queryByText("⌘")).not.toBeInTheDocument();
	});

	it("renders ⌘ on Mac after client effect", async () => {
		setUserAgent(
			"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Version/17.0 Safari/605.1.15",
		);
		await act(async () => {
			render(<ShortcutKbd keyLabel="K" />);
		});
		expect(screen.getByText("⌘")).toBeInTheDocument();
		expect(screen.queryByText("Ctrl")).not.toBeInTheDocument();
	});

	it("renders ⌘ on iOS user agents (iPad/iPhone)", async () => {
		setUserAgent(
			"Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1",
		);
		await act(async () => {
			render(<ShortcutKbd keyLabel="K" />);
		});
		expect(screen.getByText("⌘")).toBeInTheDocument();
	});

	it("renders the provided keyLabel verbatim", async () => {
		setUserAgent("Mozilla/5.0 (X11; Linux x86_64)");
		await act(async () => {
			render(<ShortcutKbd keyLabel="Enter" />);
		});
		expect(screen.getByText("Enter")).toBeInTheDocument();
	});

	it("hides the platform glyph from assistive tech via aria-hidden", async () => {
		setUserAgent("Mozilla/5.0 (Windows NT 10.0)");
		await act(async () => {
			render(<ShortcutKbd keyLabel="K" />);
		});
		const glyph = screen.getByText("Ctrl");
		expect(glyph).toHaveAttribute("aria-hidden", "true");
	});

	it("applies a custom className alongside its base classes", async () => {
		await act(async () => {
			render(<ShortcutKbd keyLabel="K" className="custom-class" />);
		});
		const kbd = screen.getByText("K").closest("kbd");
		expect(kbd?.className).toContain("custom-class");
		expect(kbd?.className).toContain("font-mono");
	});
});
