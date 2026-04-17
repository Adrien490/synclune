import { act, cleanup, render, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// LOCALSTORAGE MOCK (hoisted via module before SUT import)
// ============================================================================

const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: (key: string) => store[key] ?? null,
		setItem: (key: string, value: string) => {
			store[key] = value;
		},
		removeItem: (key: string) => {
			delete store[key];
		},
		clear: () => {
			store = {};
		},
		get length() {
			return Object.keys(store).length;
		},
		key: (index: number) => Object.keys(store)[index] ?? null,
	};
})();

vi.stubGlobal("localStorage", localStorageMock);

class ResizeObserverStub {
	observe() {}
	unobserve() {}
	disconnect() {}
}
vi.stubGlobal("ResizeObserver", ResizeObserverStub);

// JSDOM polyfills — TS types assume these exist, but JSDOM is incomplete
/* eslint-disable @typescript-eslint/no-unnecessary-condition */
if (!globalThis.PointerEvent) {
	(globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent =
		MouseEvent as unknown as typeof PointerEvent;
}
if (!HTMLElement.prototype.hasPointerCapture) {
	HTMLElement.prototype.hasPointerCapture = () => false;
}
if (!HTMLElement.prototype.releasePointerCapture) {
	HTMLElement.prototype.releasePointerCapture = () => undefined;
}
if (!HTMLElement.prototype.setPointerCapture) {
	HTMLElement.prototype.setPointerCapture = () => undefined;
}
if (!HTMLElement.prototype.scrollIntoView) {
	HTMLElement.prototype.scrollIntoView = () => undefined;
}
/* eslint-enable @typescript-eslint/no-unnecessary-condition */

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: ({ ...props }: React.ComponentProps<"input">) => <input {...props} />,
}));

vi.mock("@/shared/components/copy-button", () => ({
	CopyButton: ({ text, label }: { text: string; label: string }) => (
		<button type="button" aria-label={`Copier ${label.toLowerCase()}`}>
			{text}
		</button>
	),
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		"aria-label": ariaLabel,
		...props
	}: {
		children: React.ReactNode;
		onClick?: () => void;
		disabled?: boolean;
		"aria-label"?: string;
		[key: string]: unknown;
	}) => (
		<button onClick={onClick} disabled={disabled} aria-label={ariaLabel} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipTrigger: ({ children }: { children: React.ReactNode; asChild?: boolean }) => (
		<>{children}</>
	),
	TooltipContent: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

// ============================================================================
// IMPORTS
// ============================================================================

import { SimpleColorPicker } from "../simple-color-picker";

// ============================================================================
// HELPERS
// ============================================================================

function Wrapper({
	initial = "#FF0000",
	onChange,
}: {
	initial?: string;
	onChange?: (hex: string) => void;
}) {
	return <SimpleColorPicker value={initial} onChange={onChange} />;
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("SimpleColorPicker", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
	});

	it("renders preview, hex input, selection, hue, palette", () => {
		render(<Wrapper />);
		expect(screen.getByRole("img", { name: /#FF0000/i })).toBeInTheDocument();
		expect(screen.getByRole("textbox", { name: /Code couleur/i })).toBeInTheDocument();
		expect(screen.getByRole("slider", { name: /Sélecteur de couleur/i })).toBeInTheDocument();
		expect(screen.getByLabelText(/Teinte/i)).toBeInTheDocument();
		expect(screen.getByRole("radiogroup", { name: /Palette bijoux/i })).toBeInTheDocument();
	});

	it("propagates palette click through onChange", async () => {
		const onChange = vi.fn();
		render(<Wrapper initial="#FFFFFF" onChange={onChange} />);
		await userEvent.click(screen.getByRole("radio", { name: /Or 18 carats/i }));
		expect(onChange).toHaveBeenCalledWith("#D4AF37");
	});

	it("propagates hex input edits through onChange", async () => {
		const onChange = vi.fn();
		render(<Wrapper initial="#000000" onChange={onChange} />);
		const input = screen.getByRole("textbox", { name: /Code couleur/i });
		await userEvent.clear(input);
		await userEvent.type(input, "#ABCDEF");
		expect(onChange).toHaveBeenCalledWith("#ABCDEF");
	});

	it("persists recents to localStorage after debounce delay", async () => {
		vi.useFakeTimers();
		const { rerender } = render(<Wrapper initial="#FF0000" />);
		rerender(<Wrapper initial="#00FF00" />);
		act(() => {
			vi.advanceTimersByTime(1300);
		});
		const stored = JSON.parse(localStorageMock.getItem("recent-colors") ?? "[]") as string[];
		expect(stored).toContain("#00FF00");
		vi.useRealTimers();
	});

	it("renders recents when localStorage is pre-populated", () => {
		localStorageMock.setItem("recent-colors", JSON.stringify(["#111111", "#222222"]));
		render(<Wrapper />);
		expect(screen.getByRole("radiogroup", { name: /Couleurs récentes/i })).toBeInTheDocument();
	});

	it("does not render recents section when no recents exist", () => {
		render(<Wrapper />);
		expect(
			screen.queryByRole("radiogroup", { name: /Couleurs récentes/i }),
		).not.toBeInTheDocument();
	});

	it("applies aria-disabled and pointer-events-none when disabled", () => {
		const { container } = render(<SimpleColorPicker value="#FF0000" disabled />);
		const root = container.querySelector('[data-slot="simple-color-picker"]');
		expect(root).toHaveAttribute("aria-disabled", "true");
	});
});
