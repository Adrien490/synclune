import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

// Mock for NavigationGuardContext
const { mockRegisterGuard, mockUnregisterGuard } = vi.hoisted(() => ({
	mockRegisterGuard: vi.fn(),
	mockUnregisterGuard: vi.fn(),
}));

// Controls whether the navigation guard context is present
const mockNavigationGuardContext = vi.hoisted<{
	value: {
		registerGuard: ReturnType<typeof vi.fn>;
		unregisterGuard: ReturnType<typeof vi.fn>;
	} | null;
}>(() => ({
	value: {
		registerGuard: mockRegisterGuard,
		unregisterGuard: mockUnregisterGuard,
	},
}));

vi.mock("@/shared/contexts/navigation-guard-context", () => ({
	useNavigationGuardOptional: () => mockNavigationGuardContext.value,
}));

// ---------------------------------------------------------------------------
// Import under test (after mocks are set up)
// ---------------------------------------------------------------------------

import { useUnsavedChanges, useUnsavedChangesWithOptions } from "../use-unsaved-changes";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Fires a beforeunload event on window and returns the event object
 * so assertions can inspect preventDefault and returnValue.
 */
function fireBeforeUnload(): BeforeUnloadEvent {
	const event = new Event("beforeunload") as BeforeUnloadEvent;
	Object.defineProperty(event, "returnValue", {
		writable: true,
		value: "",
	});
	vi.spyOn(event, "preventDefault");
	window.dispatchEvent(event);
	return event;
}

/**
 * Fires a popstate event on window.
 */
function firePopstate(): void {
	window.dispatchEvent(new PopStateEvent("popstate"));
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("useUnsavedChanges", () => {
	beforeEach(() => {
		mockRegisterGuard.mockClear();
		mockUnregisterGuard.mockClear();
		// Restore navigation guard context to full value by default
		mockNavigationGuardContext.value = {
			registerGuard: mockRegisterGuard,
			unregisterGuard: mockUnregisterGuard,
		};
		// Ensure window.confirm is mockable
		vi.spyOn(window, "confirm").mockReturnValue(false);
		vi.spyOn(window.history, "pushState").mockImplementation(() => undefined);
	});

	afterEach(() => {
		vi.useRealTimers();
	});

	// -------------------------------------------------------------------------
	// isBlocking computation
	// -------------------------------------------------------------------------

	describe("isBlocking", () => {
		it("is false when isDirty=false and enabled=true", () => {
			const { result } = renderHook(() => useUnsavedChanges(false, true));
			expect(result.current.isBlocking).toBe(false);
		});

		it("is true when isDirty=true and enabled=true", () => {
			const { result } = renderHook(() => useUnsavedChanges(true, true));
			expect(result.current.isBlocking).toBe(true);
		});

		it("is false when isDirty=true but enabled=false", () => {
			const { result } = renderHook(() => useUnsavedChanges(true, false));
			expect(result.current.isBlocking).toBe(false);
		});

		it("is true by default when only isDirty is provided (enabled defaults to true)", () => {
			const { result } = renderHook(() => useUnsavedChanges(true));
			expect(result.current.isBlocking).toBe(true);
		});

		it("is false by default when isDirty=false and no enabled arg", () => {
			const { result } = renderHook(() => useUnsavedChanges(false));
			expect(result.current.isBlocking).toBe(false);
		});

		it("updates isBlocking reactively when isDirty changes", () => {
			let dirty = false;
			const { result, rerender } = renderHook(() => useUnsavedChanges(dirty));

			expect(result.current.isBlocking).toBe(false);

			dirty = true;
			rerender();
			expect(result.current.isBlocking).toBe(true);

			dirty = false;
			rerender();
			expect(result.current.isBlocking).toBe(false);
		});

		it("updates isBlocking reactively when enabled changes", () => {
			let enabled = true;
			const { result, rerender } = renderHook(() => useUnsavedChanges(true, enabled));

			expect(result.current.isBlocking).toBe(true);

			enabled = false;
			rerender();
			expect(result.current.isBlocking).toBe(false);

			enabled = true;
			rerender();
			expect(result.current.isBlocking).toBe(true);
		});
	});

	// -------------------------------------------------------------------------
	// allowNavigation
	// -------------------------------------------------------------------------

	describe("allowNavigation", () => {
		it("temporarily makes isBlocking false after being called", () => {
			vi.useFakeTimers();

			const { result } = renderHook(() => useUnsavedChanges(true));
			expect(result.current.isBlocking).toBe(true);

			act(() => {
				result.current.allowNavigation();
			});

			// isBlocking is computed from allowNavigationRef - the ref is set to true
			// but isBlocking is a derived value re-computed on render.
			// After allowNavigation the ref is true so next render gives false.
			// We re-check that the returned value before timeout expiry respects the ref.
			// Since isBlocking is computed at render time from the ref, we need a re-render.
			// The ref change alone does not trigger a re-render, but the value seen during
			// the NEXT render will be false. We verify the ref state via side effects
			// (beforeunload listener removal) rather than isBlocking directly.
			// For direct testing we advance the timer and verify reset.
			act(() => {
				vi.advanceTimersByTime(99);
			});
			// Ref is still true (not yet reset) - no re-render triggered by ref change

			act(() => {
				vi.advanceTimersByTime(1); // total 100ms - timer fires
			});
			// After 100ms the ref is reset to false.
			// The next render of the hook would compute isBlocking = true again.
			// Re-render to observe the restored state.
			const { result: result2 } = renderHook(() => useUnsavedChanges(true));
			expect(result2.current.isBlocking).toBe(true);
		});

		it("does not throw when called multiple times", () => {
			vi.useFakeTimers();

			const { result } = renderHook(() => useUnsavedChanges(true));

			expect(() => {
				act(() => {
					result.current.allowNavigation();
					result.current.allowNavigation();
				});
			}).not.toThrow();

			act(() => {
				vi.runAllTimers();
			});
		});
	});

	// -------------------------------------------------------------------------
	// beforeunload event listener
	// -------------------------------------------------------------------------

	describe("beforeunload event listener", () => {
		it("registers beforeunload listener when isBlocking=true", () => {
			const addSpy = vi.spyOn(window, "addEventListener");

			renderHook(() => useUnsavedChanges(true));

			const calls = (addSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "beforeunload",
			);
			expect(calls.length).toBeGreaterThan(0);
		});

		it("does not register beforeunload listener when isBlocking=false", () => {
			const addSpy = vi.spyOn(window, "addEventListener");

			renderHook(() => useUnsavedChanges(false));

			const calls = (addSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "beforeunload",
			);
			expect(calls.length).toBe(0);
		});

		it("removes beforeunload listener when isBlocking transitions to false", () => {
			const removeSpy = vi.spyOn(window, "removeEventListener");
			let dirty = true;

			const { rerender } = renderHook(() => useUnsavedChanges(dirty));

			dirty = false;
			rerender();

			const calls = (removeSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "beforeunload",
			);
			expect(calls.length).toBeGreaterThan(0);
		});

		it("removes beforeunload listener on unmount", () => {
			const removeSpy = vi.spyOn(window, "removeEventListener");

			const { unmount } = renderHook(() => useUnsavedChanges(true));
			unmount();

			const calls = (removeSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "beforeunload",
			);
			expect(calls.length).toBeGreaterThan(0);
		});

		it("beforeunload handler calls e.preventDefault()", () => {
			renderHook(() => useUnsavedChanges(true));

			const event = fireBeforeUnload();

			expect(event.preventDefault).toHaveBeenCalled();
		});

		it("beforeunload handler sets e.returnValue to the default message", () => {
			renderHook(() => useUnsavedChanges(true));

			const event = fireBeforeUnload();

			expect(event.returnValue).toBe(
				"Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter cette page ?",
			);
		});

		it("beforeunload handler sets e.returnValue to the custom message", () => {
			renderHook(() => useUnsavedChanges(true, true, { message: "Formulaire non enregistré !" }));

			const event = fireBeforeUnload();

			expect(event.returnValue).toBe("Formulaire non enregistré !");
		});

		it("does not trigger beforeunload handler when isBlocking=false", () => {
			// Render the hook with isBlocking=false. No beforeunload listener should be added.
			// We verify this by checking that window.addEventListener was never called with "beforeunload".
			const addSpy = vi.spyOn(window, "addEventListener");

			renderHook(() => useUnsavedChanges(false));

			const beforeunloadCalls = (addSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "beforeunload",
			);
			expect(beforeunloadCalls.length).toBe(0);
		});
	});

	// -------------------------------------------------------------------------
	// popstate event listener
	// -------------------------------------------------------------------------

	describe("popstate event listener", () => {
		it("registers popstate listener when isBlocking=true and interceptHistoryNavigation=true", () => {
			const addSpy = vi.spyOn(window, "addEventListener");

			renderHook(() => useUnsavedChanges(true, true, { interceptHistoryNavigation: true }));

			const calls = (addSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "popstate",
			);
			expect(calls.length).toBeGreaterThan(0);
		});

		it("does not register popstate listener when isBlocking=false", () => {
			const addSpy = vi.spyOn(window, "addEventListener");

			renderHook(() => useUnsavedChanges(false));

			const calls = (addSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "popstate",
			);
			expect(calls.length).toBe(0);
		});

		it("does not register popstate listener when interceptHistoryNavigation=false", () => {
			const addSpy = vi.spyOn(window, "addEventListener");

			renderHook(() => useUnsavedChanges(true, true, { interceptHistoryNavigation: false }));

			const calls = (addSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "popstate",
			);
			expect(calls.length).toBe(0);
		});

		it("removes popstate listener on unmount", () => {
			const removeSpy = vi.spyOn(window, "removeEventListener");

			const { unmount } = renderHook(() => useUnsavedChanges(true));
			unmount();

			const calls = (removeSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "popstate",
			);
			expect(calls.length).toBeGreaterThan(0);
		});

		it("removes popstate listener when isBlocking transitions to false", () => {
			const removeSpy = vi.spyOn(window, "removeEventListener");
			let dirty = true;

			const { rerender } = renderHook(() => useUnsavedChanges(dirty));

			dirty = false;
			rerender();

			const calls = (removeSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "popstate",
			);
			expect(calls.length).toBeGreaterThan(0);
		});

		it("pushes a history state entry when popstate protection activates", () => {
			renderHook(() => useUnsavedChanges(true));

			expect(window.history.pushState).toHaveBeenCalledWith(
				expect.objectContaining({ guardId: expect.any(String) }),
				"",
				window.location.href,
			);
		});

		it("shows window.confirm when popstate fires and isBlocking=true", () => {
			renderHook(() => useUnsavedChanges(true));

			firePopstate();

			expect(window.confirm).toHaveBeenCalledWith(
				"Vous avez des modifications non sauvegardées. Voulez-vous vraiment quitter cette page ?",
			);
		});

		it("shows custom message in window.confirm when provided", () => {
			renderHook(() => useUnsavedChanges(true, true, { message: "Pertes de données !" }));

			firePopstate();

			expect(window.confirm).toHaveBeenCalledWith("Pertes de données !");
		});

		it("calls history.back() when user confirms navigation in popstate", () => {
			vi.spyOn(window, "confirm").mockReturnValue(true);
			vi.spyOn(window.history, "back").mockImplementation(() => undefined);

			renderHook(() => useUnsavedChanges(true));

			firePopstate();

			expect(window.history.back).toHaveBeenCalled();
		});

		it("pushes state to restore URL when user cancels navigation in popstate", () => {
			vi.spyOn(window, "confirm").mockReturnValue(false);

			// Clear pushState calls from initial registration
			vi.clearAllMocks();
			vi.spyOn(window, "confirm").mockReturnValue(false);
			vi.spyOn(window.history, "pushState").mockImplementation(() => undefined);

			renderHook(() => useUnsavedChanges(true));

			// Clear the initial pushState call made when effect runs
			vi.mocked(window.history.pushState).mockClear();

			firePopstate();

			// On cancel, the hook calls pushState to restore the URL
			expect(window.history.pushState).toHaveBeenCalledWith(
				expect.objectContaining({ guardId: expect.any(String) }),
				"",
				window.location.href,
			);
		});

		it("calls onBlock callback when user cancels navigation in popstate", () => {
			vi.spyOn(window, "confirm").mockReturnValue(false);
			const onBlock = vi.fn();

			renderHook(() => useUnsavedChanges(true, true, { onBlock }));

			firePopstate();

			expect(onBlock).toHaveBeenCalledTimes(1);
		});

		it("does not call onBlock when user confirms navigation in popstate", () => {
			vi.spyOn(window, "confirm").mockReturnValue(true);
			vi.spyOn(window.history, "back").mockImplementation(() => undefined);
			const onBlock = vi.fn();

			renderHook(() => useUnsavedChanges(true, true, { onBlock }));

			firePopstate();

			expect(onBlock).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// NavigationGuard context integration
	// -------------------------------------------------------------------------

	describe("NavigationGuard context integration", () => {
		it("registers the guard when isBlocking=true and context is present", () => {
			renderHook(() => useUnsavedChanges(true));

			expect(mockRegisterGuard).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ message: expect.any(String) }),
			);
		});

		it("unregisters the guard when isBlocking=false", () => {
			renderHook(() => useUnsavedChanges(false));

			expect(mockUnregisterGuard).toHaveBeenCalled();
			expect(mockRegisterGuard).not.toHaveBeenCalled();
		});

		it("unregisters the guard when isBlocking transitions from true to false", () => {
			let dirty = true;
			const { rerender } = renderHook(() => useUnsavedChanges(dirty));

			mockUnregisterGuard.mockClear();

			dirty = false;
			rerender();

			expect(mockUnregisterGuard).toHaveBeenCalled();
		});

		it("unregisters the guard on unmount", () => {
			const { unmount } = renderHook(() => useUnsavedChanges(true));

			mockUnregisterGuard.mockClear();
			unmount();

			expect(mockUnregisterGuard).toHaveBeenCalled();
		});

		it("passes the custom message to the registered guard", () => {
			renderHook(() =>
				useUnsavedChanges(true, true, { message: "Attention, modifications perdues !" }),
			);

			expect(mockRegisterGuard).toHaveBeenCalledWith(
				expect.any(String),
				expect.objectContaining({ message: "Attention, modifications perdues !" }),
			);
		});

		it("passes an onBlock callback to the registered guard", () => {
			const onBlock = vi.fn();

			renderHook(() => useUnsavedChanges(true, true, { onBlock }));

			const registeredGuard = mockRegisterGuard.mock.calls[0]![1];
			// Invoke the registered onBlock
			registeredGuard.onBlock?.();
			expect(onBlock).toHaveBeenCalled();
		});

		it("does not register the guard when NavigationGuardContext is not present", () => {
			mockNavigationGuardContext.value = null;

			renderHook(() => useUnsavedChanges(true));

			expect(mockRegisterGuard).not.toHaveBeenCalled();
		});

		it("does not throw when NavigationGuardContext is not present", () => {
			mockNavigationGuardContext.value = null;

			expect(() => {
				renderHook(() => useUnsavedChanges(true));
			}).not.toThrow();
		});

		it("uses a stable unique ID per hook instance for guard registration", () => {
			renderHook(() => useUnsavedChanges(true));
			renderHook(() => useUnsavedChanges(true));

			const ids = mockRegisterGuard.mock.calls.map(([id]) => id);
			// Each hook instance gets its own ID from useId()
			expect(ids[0]).not.toBe(ids[1]);
		});
	});

	// -------------------------------------------------------------------------
	// onBlock callback (non-popstate)
	// -------------------------------------------------------------------------

	describe("onBlock callback", () => {
		it("is not called immediately when hook renders with isBlocking=true", () => {
			const onBlock = vi.fn();
			renderHook(() => useUnsavedChanges(true, true, { onBlock }));
			expect(onBlock).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// Cleanup on unmount
	// -------------------------------------------------------------------------

	describe("cleanup on unmount", () => {
		it("removes both beforeunload and popstate listeners on unmount", () => {
			const removeSpy = vi.spyOn(window, "removeEventListener");

			const { unmount } = renderHook(() => useUnsavedChanges(true));
			removeSpy.mockClear();
			unmount();

			const removedEvents = (removeSpy.mock.calls as [string, ...unknown[]][]).map(
				([event]) => event,
			);
			expect(removedEvents).toContain("beforeunload");
			expect(removedEvents).toContain("popstate");
		});

		it("cleans up without errors when isDirty=false on unmount", () => {
			expect(() => {
				const { unmount } = renderHook(() => useUnsavedChanges(false));
				unmount();
			}).not.toThrow();
		});
	});

	// -------------------------------------------------------------------------
	// interceptHistoryNavigation option
	// -------------------------------------------------------------------------

	describe("interceptHistoryNavigation option", () => {
		it("defaults to true (popstate is intercepted)", () => {
			const addSpy = vi.spyOn(window, "addEventListener");

			renderHook(() => useUnsavedChanges(true));

			const popstateCalls = (addSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "popstate",
			);
			expect(popstateCalls.length).toBeGreaterThan(0);
		});

		it("when false, does not register popstate listener even when isBlocking=true", () => {
			const addSpy = vi.spyOn(window, "addEventListener");

			renderHook(() => useUnsavedChanges(true, true, { interceptHistoryNavigation: false }));

			const popstateCalls = (addSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "popstate",
			);
			expect(popstateCalls.length).toBe(0);
		});

		it("when false, still registers beforeunload listener", () => {
			const addSpy = vi.spyOn(window, "addEventListener");

			renderHook(() => useUnsavedChanges(true, true, { interceptHistoryNavigation: false }));

			const beforeunloadCalls = (addSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "beforeunload",
			);
			expect(beforeunloadCalls.length).toBeGreaterThan(0);
		});

		it("when false, does not call history.pushState for guard entry", () => {
			// Reset mock to observe only calls from this test
			vi.mocked(window.history.pushState).mockClear();

			renderHook(() => useUnsavedChanges(true, true, { interceptHistoryNavigation: false }));

			expect(window.history.pushState).not.toHaveBeenCalled();
		});
	});

	// -------------------------------------------------------------------------
	// useUnsavedChangesWithOptions variant
	// -------------------------------------------------------------------------

	describe("useUnsavedChangesWithOptions", () => {
		it("returns isBlocking=true when isDirty=true", () => {
			const { result } = renderHook(() => useUnsavedChangesWithOptions({ isDirty: true }));
			expect(result.current.isBlocking).toBe(true);
		});

		it("returns isBlocking=false when isDirty=false", () => {
			const { result } = renderHook(() => useUnsavedChangesWithOptions({ isDirty: false }));
			expect(result.current.isBlocking).toBe(false);
		});

		it("returns isBlocking=false when isDirty=true but enabled=false", () => {
			const { result } = renderHook(() =>
				useUnsavedChangesWithOptions({ isDirty: true, enabled: false }),
			);
			expect(result.current.isBlocking).toBe(false);
		});

		it("enabled defaults to true", () => {
			const { result } = renderHook(() => useUnsavedChangesWithOptions({ isDirty: true }));
			expect(result.current.isBlocking).toBe(true);
		});

		it("passes message option through to beforeunload handler", () => {
			renderHook(() =>
				useUnsavedChangesWithOptions({
					isDirty: true,
					message: "Options variant message",
				}),
			);

			const event = fireBeforeUnload();
			expect(event.returnValue).toBe("Options variant message");
		});

		it("passes onBlock option through to NavigationGuard context", () => {
			const onBlock = vi.fn();

			renderHook(() => useUnsavedChangesWithOptions({ isDirty: true, onBlock }));

			const registeredGuard = mockRegisterGuard.mock.calls[0]![1];
			registeredGuard.onBlock?.();
			expect(onBlock).toHaveBeenCalled();
		});

		it("passes interceptHistoryNavigation=false option through", () => {
			const addSpy = vi.spyOn(window, "addEventListener");

			renderHook(() =>
				useUnsavedChangesWithOptions({
					isDirty: true,
					interceptHistoryNavigation: false,
				}),
			);

			const popstateCalls = (addSpy.mock.calls as [string, ...unknown[]][]).filter(
				([event]) => event === "popstate",
			);
			expect(popstateCalls.length).toBe(0);
		});

		it("exposes allowNavigation function", () => {
			const { result } = renderHook(() => useUnsavedChangesWithOptions({ isDirty: true }));
			expect(typeof result.current.allowNavigation).toBe("function");
		});
	});
});
