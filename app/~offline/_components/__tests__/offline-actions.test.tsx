import { cleanup, render, screen, fireEvent, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		size: _size,
		...props
	}: React.ButtonHTMLAttributes<HTMLButtonElement> & { size?: string }) => (
		<button onClick={onClick} {...props}>
			{children}
		</button>
	),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { OfflineActions } from "../offline-actions";

// ============================================================================
// TESTS
// ============================================================================

describe("OfflineActions", () => {
	// Capture event listeners registered on window so we can trigger them manually
	const windowListeners = new Map<string, EventListener>();

	beforeEach(() => {
		vi.clearAllMocks();
		windowListeners.clear();

		// Spy on window event listener registration
		vi.spyOn(window, "addEventListener").mockImplementation(
			(type: string, handler: EventListenerOrEventListenerObject) => {
				if (typeof handler === "function") {
					windowListeners.set(type, handler);
				}
			},
		);
		vi.spyOn(window, "removeEventListener").mockImplementation(() => {});

		// Default: device is online
		Object.defineProperty(navigator, "onLine", {
			value: true,
			writable: true,
			configurable: true,
		});

		// Mock window.location.reload so tests don't actually reload.
		// jsdom marks location.reload as non-configurable, so we replace the whole
		// location object with a plain object that has a mock reload function.
		Object.defineProperty(window, "location", {
			value: { ...window.location, reload: vi.fn() },
			writable: true,
			configurable: true,
		});
	});

	afterEach(cleanup);

	// --------------------------------------------------------------------------
	// Rendering
	// --------------------------------------------------------------------------

	describe("initial rendering", () => {
		it("renders the retry button", () => {
			render(<OfflineActions />);
			expect(screen.getByRole("button", { name: "Réessayer" })).toBeInTheDocument();
		});

		it("does not show the still-offline message by default", () => {
			render(<OfflineActions />);
			expect(
				screen.queryByText("Toujours hors ligne... Vérifiez votre connexion."),
			).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Retry when online
	// --------------------------------------------------------------------------

	describe("retry when online", () => {
		it("calls window.location.reload when device is online", () => {
			Object.defineProperty(navigator, "onLine", {
				value: true,
				writable: true,
				configurable: true,
			});

			render(<OfflineActions />);
			fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

			expect(window.location.reload).toHaveBeenCalledTimes(1);
		});

		it("does not show the still-offline message when online", () => {
			Object.defineProperty(navigator, "onLine", {
				value: true,
				writable: true,
				configurable: true,
			});

			render(<OfflineActions />);
			fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

			expect(
				screen.queryByText("Toujours hors ligne... Vérifiez votre connexion."),
			).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Retry when offline
	// --------------------------------------------------------------------------

	describe("retry when offline", () => {
		it("shows the still-offline message when device is offline", () => {
			Object.defineProperty(navigator, "onLine", {
				value: false,
				writable: true,
				configurable: true,
			});

			render(<OfflineActions />);
			fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

			expect(
				screen.getByText("Toujours hors ligne... Vérifiez votre connexion."),
			).toBeInTheDocument();
		});

		it("does not call reload when device is offline", () => {
			Object.defineProperty(navigator, "onLine", {
				value: false,
				writable: true,
				configurable: true,
			});

			render(<OfflineActions />);
			fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

			expect(window.location.reload).not.toHaveBeenCalled();
		});

		it("the still-offline message has role=status for screen readers", () => {
			Object.defineProperty(navigator, "onLine", {
				value: false,
				writable: true,
				configurable: true,
			});

			render(<OfflineActions />);
			fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

			expect(screen.getByRole("status")).toBeInTheDocument();
		});

		it("message disappears after 3 seconds", () => {
			vi.useFakeTimers();
			Object.defineProperty(navigator, "onLine", {
				value: false,
				writable: true,
				configurable: true,
			});

			render(<OfflineActions />);
			fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

			// Message is visible immediately after clicking
			expect(
				screen.getByText("Toujours hors ligne... Vérifiez votre connexion."),
			).toBeInTheDocument();

			// Advance time by 3 seconds
			act(() => {
				vi.advanceTimersByTime(3000);
			});

			expect(
				screen.queryByText("Toujours hors ligne... Vérifiez votre connexion."),
			).not.toBeInTheDocument();
		});

		it("message is still visible at 2999ms (before timeout fires)", () => {
			vi.useFakeTimers();
			Object.defineProperty(navigator, "onLine", {
				value: false,
				writable: true,
				configurable: true,
			});

			render(<OfflineActions />);
			fireEvent.click(screen.getByRole("button", { name: "Réessayer" }));

			act(() => {
				vi.advanceTimersByTime(2999);
			});

			expect(
				screen.getByText("Toujours hors ligne... Vérifiez votre connexion."),
			).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Auto-reload on online event
	// --------------------------------------------------------------------------

	describe("auto-reload on online event", () => {
		it("registers a listener for the online event on mount", () => {
			render(<OfflineActions />);
			expect(window.addEventListener).toHaveBeenCalledWith("online", expect.any(Function));
		});

		it("calls window.location.reload when the online event fires", () => {
			render(<OfflineActions />);

			act(() => {
				windowListeners.get("online")?.(new Event("online"));
			});

			expect(window.location.reload).toHaveBeenCalledTimes(1);
		});
	});

	// --------------------------------------------------------------------------
	// Cleanup listener on unmount
	// --------------------------------------------------------------------------

	describe("cleanup on unmount", () => {
		it("removes the online event listener when the component unmounts", () => {
			const { unmount } = render(<OfflineActions />);

			unmount();

			expect(window.removeEventListener).toHaveBeenCalledWith("online", expect.any(Function));
		});

		it("passes the same handler reference to both addEventListener and removeEventListener", () => {
			const { unmount } = render(<OfflineActions />);

			const addedHandler = (window.addEventListener as ReturnType<typeof vi.fn>).mock.calls.find(
				(args: unknown[]) => args[0] === "online",
			)?.[1];

			unmount();

			const removedHandler = (
				window.removeEventListener as ReturnType<typeof vi.fn>
			).mock.calls.find((args: unknown[]) => args[0] === "online")?.[1];

			expect(addedHandler).toBeDefined();
			expect(addedHandler).toBe(removedHandler);
		});
	});
});
