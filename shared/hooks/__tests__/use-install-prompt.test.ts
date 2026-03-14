import type React from "react";
import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockSetInstallPrompt, mockFormAction, mockStartTransition } = vi.hoisted(() => ({
	mockSetInstallPrompt: vi.fn(),
	mockFormAction: vi.fn(),
	mockStartTransition: vi.fn((cb: () => void) => cb()),
}));

// Mock the server action — returns a pending promise so it never settles and
// does not trigger optimistic-state rollback during synchronous tests.
vi.mock("@/shared/actions/set-install-prompt", () => ({
	setInstallPrompt: mockSetInstallPrompt,
}));

// Mock React hooks that are hard to exercise directly in jsdom.
// - useTransition: expose startTransition as a synchronous pass-through so we
//   can assert on dispatched actions without awaiting async work.
// - useActionState: expose a controllable formAction and isPending flag.
// - useOptimistic: behave like useState so optimistic updates are reflected
//   synchronously in the hook's return value.
vi.mock("react", async (importOriginal) => {
	const actual = (await importOriginal()) as typeof React;
	return {
		...actual,
		useTransition: () => [false, mockStartTransition],
		useActionState: (_action: unknown, _initial: unknown) => [undefined, mockFormAction, false],
		useOptimistic: (initial: boolean) => {
			// Keep a mutable reference so setOptimisticVisible calls are reflected.
			// We return a tuple like useState would, but the setter is captured so
			// the hook can update it optimistically within the same render cycle.
			let value = initial;
			const setter = (next: boolean) => {
				value = next;
			};
			// Expose the current value through closure; the hook reads it once per
			// render and we need it to be the post-setter value inside the same act().
			// We use a getter trick via Object.defineProperty on the tuple array.
			const tuple = [value, setter] as [boolean, (v: boolean) => void];
			Object.defineProperty(tuple, 0, {
				get: () => value,
				enumerable: true,
			});
			return tuple;
		},
	};
});

// ============================================================================
// Import under test (after mocks are set up)
// ============================================================================

import { useInstallPrompt } from "../use-install-prompt";
import { INSTALL_PROMPT_MIN_VISITS } from "@/shared/constants/install-prompt";
import type { InstallPromptState } from "@/shared/data/get-install-prompt-state";

// ============================================================================
// Fixtures
// ============================================================================

function makeState(overrides: Partial<InstallPromptState> = {}): InstallPromptState {
	return {
		visitCount: 0,
		dismissCount: 0,
		permanentlyDismissed: false,
		...overrides,
	};
}

/** State that satisfies the minimum-visits threshold. */
const eligibleState = makeState({ visitCount: INSTALL_PROMPT_MIN_VISITS });

/** State below the minimum-visits threshold. */
const ineligibleState = makeState({ visitCount: INSTALL_PROMPT_MIN_VISITS - 1 });

/** State where the user has permanently dismissed. */
const permanentlyDismissedState = makeState({
	visitCount: INSTALL_PROMPT_MIN_VISITS,
	permanentlyDismissed: true,
});

// ============================================================================
// Tests
// ============================================================================

describe("useInstallPrompt", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockStartTransition.mockImplementation((cb: () => void) => cb());
	});

	// --------------------------------------------------------------------------
	// Return value shape
	// --------------------------------------------------------------------------

	describe("return value shape", () => {
		it("returns all expected properties", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			expect(result.current).toHaveProperty("shouldShowBanner");
			expect(result.current).toHaveProperty("dismiss");
			expect(result.current).toHaveProperty("markInstalled");
			expect(result.current).toHaveProperty("recordVisit");
			expect(result.current).toHaveProperty("isPending");
		});

		it("exposes dismiss, markInstalled and recordVisit as functions", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			expect(typeof result.current.dismiss).toBe("function");
			expect(typeof result.current.markInstalled).toBe("function");
			expect(typeof result.current.recordVisit).toBe("function");
		});
	});

	// --------------------------------------------------------------------------
	// shouldShowBanner — initial state
	// --------------------------------------------------------------------------

	describe("shouldShowBanner — initial state", () => {
		it("is true when visitCount meets the minimum and not permanently dismissed", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			expect(result.current.shouldShowBanner).toBe(true);
		});

		it("is false when visitCount is below the minimum", () => {
			const { result } = renderHook(() => useInstallPrompt(ineligibleState));

			expect(result.current.shouldShowBanner).toBe(false);
		});

		it("is false when permanently dismissed even if visitCount is sufficient", () => {
			const { result } = renderHook(() => useInstallPrompt(permanentlyDismissedState));

			expect(result.current.shouldShowBanner).toBe(false);
		});

		it(`is false when visitCount is exactly one below ${INSTALL_PROMPT_MIN_VISITS}`, () => {
			const state = makeState({ visitCount: INSTALL_PROMPT_MIN_VISITS - 1 });
			const { result } = renderHook(() => useInstallPrompt(state));

			expect(result.current.shouldShowBanner).toBe(false);
		});

		it(`is true when visitCount is exactly ${INSTALL_PROMPT_MIN_VISITS}`, () => {
			const state = makeState({ visitCount: INSTALL_PROMPT_MIN_VISITS });
			const { result } = renderHook(() => useInstallPrompt(state));

			expect(result.current.shouldShowBanner).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// isPending — initial state
	// --------------------------------------------------------------------------

	describe("isPending", () => {
		it("is false initially (no transition or action pending)", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			expect(result.current.isPending).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// dismiss
	// --------------------------------------------------------------------------

	describe("dismiss", () => {
		it("hides the banner immediately after calling dismiss", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			act(() => {
				result.current.dismiss();
			});

			expect(result.current.shouldShowBanner).toBe(false);
		});

		it("dispatches the dismiss action via formAction", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			act(() => {
				result.current.dismiss();
			});

			expect(mockFormAction).toHaveBeenCalledOnce();
			const formData: FormData = mockFormAction.mock.calls[0]![0];
			expect(formData.get("action")).toBe("dismiss");
		});

		it("calls startTransition when dismissing", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			act(() => {
				result.current.dismiss();
			});

			expect(mockStartTransition).toHaveBeenCalledOnce();
		});

		it("keeps banner hidden on a second dismiss call", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			act(() => {
				result.current.dismiss();
			});
			act(() => {
				result.current.dismiss();
			});

			expect(result.current.shouldShowBanner).toBe(false);
		});

		it("banner remains hidden even if dismiss is called on an already-hidden banner", () => {
			const { result } = renderHook(() => useInstallPrompt(ineligibleState));

			act(() => {
				result.current.dismiss();
			});

			expect(result.current.shouldShowBanner).toBe(false);
		});
	});

	// --------------------------------------------------------------------------
	// markInstalled
	// --------------------------------------------------------------------------

	describe("markInstalled", () => {
		it("hides the banner immediately after calling markInstalled", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			act(() => {
				result.current.markInstalled();
			});

			expect(result.current.shouldShowBanner).toBe(false);
		});

		it("dispatches the install action via formAction", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			act(() => {
				result.current.markInstalled();
			});

			expect(mockFormAction).toHaveBeenCalledOnce();
			const formData: FormData = mockFormAction.mock.calls[0]![0];
			expect(formData.get("action")).toBe("install");
		});

		it("calls startTransition when marking as installed", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			act(() => {
				result.current.markInstalled();
			});

			expect(mockStartTransition).toHaveBeenCalledOnce();
		});

		it("does not call dismiss action when using markInstalled", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			act(() => {
				result.current.markInstalled();
			});

			const formData: FormData = mockFormAction.mock.calls[0]![0];
			expect(formData.get("action")).not.toBe("dismiss");
		});
	});

	// --------------------------------------------------------------------------
	// recordVisit
	// --------------------------------------------------------------------------

	describe("recordVisit", () => {
		it("dispatches the visit action via formAction", () => {
			const { result } = renderHook(() => useInstallPrompt(ineligibleState));

			act(() => {
				result.current.recordVisit();
			});

			expect(mockFormAction).toHaveBeenCalledOnce();
			const formData: FormData = mockFormAction.mock.calls[0]![0];
			expect(formData.get("action")).toBe("visit");
		});

		it("calls startTransition when recording a visit", () => {
			const { result } = renderHook(() => useInstallPrompt(ineligibleState));

			act(() => {
				result.current.recordVisit();
			});

			expect(mockStartTransition).toHaveBeenCalledOnce();
		});

		it("does not change shouldShowBanner synchronously on a visit when banner is hidden", () => {
			const { result } = renderHook(() => useInstallPrompt(ineligibleState));

			act(() => {
				result.current.recordVisit();
			});

			// Banner visibility is driven by server state, not by the visit dispatch.
			expect(result.current.shouldShowBanner).toBe(false);
		});

		it("does not hide the banner when visiting with an eligible state", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			act(() => {
				result.current.recordVisit();
			});

			expect(result.current.shouldShowBanner).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// Action isolation — each function dispatches only one formAction call
	// --------------------------------------------------------------------------

	describe("action isolation", () => {
		it("dismiss dispatches exactly one formAction call", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			act(() => {
				result.current.dismiss();
			});

			expect(mockFormAction).toHaveBeenCalledTimes(1);
		});

		it("markInstalled dispatches exactly one formAction call", () => {
			const { result } = renderHook(() => useInstallPrompt(eligibleState));

			act(() => {
				result.current.markInstalled();
			});

			expect(mockFormAction).toHaveBeenCalledTimes(1);
		});

		it("recordVisit dispatches exactly one formAction call", () => {
			const { result } = renderHook(() => useInstallPrompt(ineligibleState));

			act(() => {
				result.current.recordVisit();
			});

			expect(mockFormAction).toHaveBeenCalledTimes(1);
		});
	});
});
