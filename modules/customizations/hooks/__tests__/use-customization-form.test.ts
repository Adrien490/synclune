import { renderHook, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";

// ============================================================================
// localStorage mock (jsdom-compatible)
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

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockSendCustomizationRequest, mockSetFieldValue, mockStoreSubscribe, mockFormState } =
	vi.hoisted(() => ({
		mockSendCustomizationRequest: vi.fn(),
		mockSetFieldValue: vi.fn(),
		mockStoreSubscribe: vi.fn(),
		mockFormState: {
			values: {
				firstName: "",
				email: "",
				phone: "",
				productTypeLabel: "",
				details: "",
				inspirationMedias: [] as Array<{ url: string; blurDataUrl?: string; altText?: string }>,
				website: "",
			},
		},
	}));

// Mock the server action
vi.mock("../../actions/send-customization-request", () => ({
	sendCustomizationRequest: mockSendCustomizationRequest,
}));

// Mock TanStack Form utilities
vi.mock("@tanstack/react-form-nextjs", () => ({
	mergeForm: vi.fn((_base, _server) => _base),
	useTransform: vi.fn((fn, _deps) => fn),
}));

// Mock useAppForm to return a controllable form object
vi.mock("@/shared/components/forms", () => ({
	useAppForm: () => ({
		setFieldValue: mockSetFieldValue,
		store: { subscribe: mockStoreSubscribe },
		state: mockFormState,
	}),
}));

// Mock withCallbacks to pass through the action
vi.mock("@/shared/utils/with-callbacks", () => ({
	withCallbacks: (action: unknown, _callbacks: unknown) => action,
}));

// Mock createToastCallbacks to capture the onSuccess callback
const mockOnSuccessRef = vi.hoisted(() => ({
	current: null as ((result: { message?: string }) => void) | null,
}));
vi.mock("@/shared/utils/create-toast-callbacks", () => ({
	createToastCallbacks: (opts: { onSuccess?: (result: { message?: string }) => void }) => {
		mockOnSuccessRef.current = opts.onSuccess ?? null;
		return {};
	},
}));

// Mock useActionState
let mockActionStateValue: [unknown, unknown, boolean] = [undefined, vi.fn(), false];

vi.mock("react", async () => {
	const actual = await vi.importActual("react");
	return {
		...actual,
		useActionState: () => mockActionStateValue,
	};
});

// Mock form options
vi.mock("../../constants/customization-form-options", () => ({
	CUSTOMIZATION_DEFAULT_VALUES: {
		firstName: "",
		email: "",
		phone: "",
		productTypeLabel: "",
		details: "",
		inspirationMedias: [],
		rgpdConsent: false,
		website: "",
	},
	CUSTOMIZATION_FORM_OPTIONS: {
		defaultValues: {
			firstName: "",
			email: "",
			phone: "",
			productTypeLabel: "",
			details: "",
			inspirationMedias: [],
			website: "",
		},
	},
}));

import { useCustomizationForm } from "../use-customization-form";

// ============================================================================
// Helpers
// ============================================================================

const DRAFT_KEY = "synclune-customization-draft";

function setDraft(data: Record<string, unknown>) {
	localStorageMock.setItem(DRAFT_KEY, JSON.stringify(data));
}

// ============================================================================
// Tests: useCustomizationForm
// ============================================================================

describe("useCustomizationForm", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		localStorageMock.clear();
		mockActionStateValue = [undefined, vi.fn(), false];
		// Reset form state values
		mockFormState.values = {
			firstName: "",
			email: "",
			phone: "",
			productTypeLabel: "",
			details: "",
			inspirationMedias: [],
			website: "",
		};
		// Default: subscribe returns a Subscription object (TanStack Store 0.9.1 API)
		mockStoreSubscribe.mockReturnValue({ unsubscribe: vi.fn() });
	});

	// ──────────── Basic return shape ────────────

	it("returns form, state, action, and isPending", () => {
		const { result } = renderHook(() => useCustomizationForm());

		expect(result.current).toHaveProperty("form");
		expect(result.current).toHaveProperty("state");
		expect(result.current).toHaveProperty("action");
		expect(result.current).toHaveProperty("isPending");
	});

	it("returns isPending false by default", () => {
		const { result } = renderHook(() => useCustomizationForm());

		expect(result.current.isPending).toBe(false);
	});

	it("returns isPending true when action is in progress", () => {
		mockActionStateValue = [undefined, vi.fn(), true];

		const { result } = renderHook(() => useCustomizationForm());

		expect(result.current.isPending).toBe(true);
	});

	// ──────────── Draft restoration from localStorage ────────────

	it("restores firstName from draft on mount", () => {
		setDraft({ firstName: "Marie" });

		renderHook(() => useCustomizationForm());

		expect(mockSetFieldValue).toHaveBeenCalledWith("firstName", "Marie");
	});

	it("restores email from draft on mount", () => {
		setDraft({ email: "marie@example.com" });

		renderHook(() => useCustomizationForm());

		expect(mockSetFieldValue).toHaveBeenCalledWith("email", "marie@example.com");
	});

	it("restores phone from draft on mount", () => {
		setDraft({ phone: "+33612345678" });

		renderHook(() => useCustomizationForm());

		expect(mockSetFieldValue).toHaveBeenCalledWith("phone", "+33612345678");
	});

	it("restores details from draft on mount", () => {
		setDraft({ details: "Bracelet avec gravure" });

		renderHook(() => useCustomizationForm());

		expect(mockSetFieldValue).toHaveBeenCalledWith("details", "Bracelet avec gravure");
	});

	it("restores productTypeLabel from draft on mount", () => {
		setDraft({ productTypeLabel: "Collier" });

		renderHook(() => useCustomizationForm());

		expect(mockSetFieldValue).toHaveBeenCalledWith("productTypeLabel", "Collier");
	});

	// ──────────── Draft priority over userInfo ────────────

	it("prefers draft firstName over userInfo", () => {
		setDraft({ firstName: "Draft Name" });

		renderHook(() =>
			useCustomizationForm({
				userInfo: { firstName: "Session Name", email: "session@example.com" },
			}),
		);

		expect(mockSetFieldValue).toHaveBeenCalledWith("firstName", "Draft Name");
	});

	it("prefers draft email over userInfo", () => {
		setDraft({ email: "draft@example.com" });

		renderHook(() =>
			useCustomizationForm({
				userInfo: { firstName: "Session Name", email: "session@example.com" },
			}),
		);

		expect(mockSetFieldValue).toHaveBeenCalledWith("email", "draft@example.com");
	});

	// ──────────── UserInfo fallback when no draft ────────────

	it("uses userInfo firstName when no draft exists", () => {
		renderHook(() =>
			useCustomizationForm({
				userInfo: { firstName: "Session Name", email: "session@example.com" },
			}),
		);

		expect(mockSetFieldValue).toHaveBeenCalledWith("firstName", "Session Name");
	});

	it("uses userInfo email when no draft exists", () => {
		renderHook(() =>
			useCustomizationForm({
				userInfo: { firstName: "Session Name", email: "session@example.com" },
			}),
		);

		expect(mockSetFieldValue).toHaveBeenCalledWith("email", "session@example.com");
	});

	// ──────────── No restoration when empty ────────────

	it("does not set fields when no draft and no userInfo", () => {
		renderHook(() => useCustomizationForm());

		expect(mockSetFieldValue).not.toHaveBeenCalled();
	});

	it("does not restore from invalid JSON in localStorage", () => {
		localStorageMock.setItem(DRAFT_KEY, "not-valid-json");

		renderHook(() => useCustomizationForm());

		expect(mockSetFieldValue).not.toHaveBeenCalled();
	});

	// ──────────── Draft persistence (subscribe) ────────────

	it("subscribes to form store for draft persistence", () => {
		renderHook(() => useCustomizationForm());

		expect(mockStoreSubscribe).toHaveBeenCalled();
	});

	it("unsubscribes from store on unmount", () => {
		const mockUnsubscribe = vi.fn();
		mockStoreSubscribe.mockReturnValue({ unsubscribe: mockUnsubscribe });

		const { unmount } = renderHook(() => useCustomizationForm());
		unmount();

		expect(mockUnsubscribe).toHaveBeenCalled();
	});

	it("saves draft to localStorage when store subscriber fires", () => {
		let storeCallback: (() => void) | undefined;
		mockStoreSubscribe.mockImplementation((cb: () => void) => {
			storeCallback = cb;
			return { unsubscribe: vi.fn() };
		});
		mockFormState.values = {
			firstName: "Marie",
			email: "marie@test.com",
			phone: "",
			productTypeLabel: "",
			details: "",
			inspirationMedias: [],
			website: "",
		};

		renderHook(() => useCustomizationForm());

		act(() => {
			storeCallback?.();
		});

		const saved = localStorageMock.getItem(DRAFT_KEY);
		expect(saved).not.toBeNull();
		const parsed = JSON.parse(saved!);
		expect(parsed.firstName).toBe("Marie");
		expect(parsed.email).toBe("marie@test.com");
	});

	it("excludes website from saved draft", () => {
		let storeCallback: (() => void) | undefined;
		mockStoreSubscribe.mockImplementation((cb: () => void) => {
			storeCallback = cb;
			return { unsubscribe: vi.fn() };
		});
		mockFormState.values = {
			firstName: "Test",
			email: "test@test.com",
			phone: "",
			productTypeLabel: "",
			details: "",
			inspirationMedias: [],
			website: "bot-value",
		};

		renderHook(() => useCustomizationForm());

		act(() => {
			storeCallback?.();
		});

		const saved = localStorageMock.getItem(DRAFT_KEY);
		expect(saved).not.toBeNull();
		const parsed = JSON.parse(saved!);
		expect(parsed).not.toHaveProperty("website");
	});

	it("removes draft from localStorage when form has no meaningful content", () => {
		localStorageMock.setItem(DRAFT_KEY, JSON.stringify({ firstName: "Old" }));

		let storeCallback: (() => void) | undefined;
		mockStoreSubscribe.mockImplementation((cb: () => void) => {
			storeCallback = cb;
			return { unsubscribe: vi.fn() };
		});
		// All fields are empty
		mockFormState.values = {
			firstName: "",
			email: "",
			phone: "",
			productTypeLabel: "",
			details: "",
			inspirationMedias: [],
			website: "",
		};

		renderHook(() => useCustomizationForm());

		act(() => {
			storeCallback?.();
		});

		expect(localStorageMock.getItem(DRAFT_KEY)).toBeNull();
	});

	// ──────────── Draft restoration runs only once ────────────

	it("restores draft only on first render, not on re-render", () => {
		setDraft({ firstName: "Marie" });

		const { rerender } = renderHook(() => useCustomizationForm());

		// First render sets the value
		expect(mockSetFieldValue).toHaveBeenCalledTimes(1);

		// Clear to detect extra calls
		mockSetFieldValue.mockClear();

		// Re-render should not restore again
		rerender();
		expect(mockSetFieldValue).not.toHaveBeenCalled();
	});

	// ──────────── onSuccess clears draft ────────────

	it("clears draft from localStorage on success", () => {
		setDraft({ firstName: "Marie", email: "marie@test.com" });

		renderHook(() => useCustomizationForm());

		// Simulate success callback
		expect(mockOnSuccessRef.current).toBeDefined();
		act(() => {
			mockOnSuccessRef.current?.({ message: "Demande envoyée" });
		});

		expect(localStorageMock.getItem(DRAFT_KEY)).toBeNull();
	});

	it("calls onSuccess option with message on success", () => {
		const onSuccess = vi.fn();

		renderHook(() => useCustomizationForm({ onSuccess }));

		act(() => {
			mockOnSuccessRef.current?.({ message: "Demande envoyée" });
		});

		expect(onSuccess).toHaveBeenCalledWith("Demande envoyée");
	});
});
