import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockAction, mockIsPending } = vi.hoisted(() => ({
	mockAction: vi.fn(),
	mockIsPending: { value: false },
}));

vi.mock("@/modules/auth/hooks/use-resend-verification-email", () => ({
	useResendVerificationEmail: vi.fn(({ onSuccess }: { onSuccess?: () => void }) => ({
		action: mockAction,
		isPending: mockIsPending.value,
		_onSuccess: onSuccess,
	})),
}));

vi.mock("@/shared/constants/storage-keys", () => ({
	getResendVerificationCooldownKey: (email: string) => `resend-cooldown-${email}`,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		disabled,
		onClick,
		type,
		variant,
		size,
	}: {
		children: React.ReactNode;
		disabled?: boolean;
		onClick?: () => void;
		type?: string;
		variant?: string;
		size?: string;
	}) => (
		<button
			disabled={disabled}
			onClick={onClick}
			type={type as "button" | "submit" | "reset" | undefined}
			data-variant={variant}
			data-size={size}
		>
			{children}
		</button>
	),
}));

vi.mock("lucide-react", () => ({
	LoaderCircle: () => <svg data-testid="icon-loader" />,
	Mail: () => <svg data-testid="icon-mail" />,
}));

// ============================================================================
// localStorage MOCK
// ============================================================================

const localStorageMock = (() => {
	let store: Record<string, string> = {};
	return {
		getItem: vi.fn((key: string) => store[key] ?? null),
		setItem: vi.fn((key: string, value: string) => {
			store[key] = value;
		}),
		removeItem: vi.fn((key: string) => {
			delete store[key];
		}),
		clear: vi.fn(() => {
			store = {};
		}),
	};
})();

Object.defineProperty(global, "localStorage", {
	value: localStorageMock,
	writable: true,
});

import { ResendVerificationButton } from "../resend-verification-button";

// ============================================================================
// TESTS
// ============================================================================

afterEach(() => {
	cleanup();
	vi.clearAllMocks();
	mockIsPending.value = false;
	localStorageMock.clear();
});

beforeEach(() => {
	mockIsPending.value = false;
});

describe("ResendVerificationButton", () => {
	// ─── Rendering ────────────────────────────────────────────────────────────

	it("renders the resend email button in idle state", () => {
		render(<ResendVerificationButton email="user@example.com" />);
		expect(screen.getByRole("button")).toBeInTheDocument();
	});

	it("shows mail icon and 'Renvoyer l'email' text in idle state", () => {
		render(<ResendVerificationButton email="user@example.com" />);
		expect(screen.getByTestId("icon-mail")).toBeInTheDocument();
		expect(screen.getByRole("button").textContent).toContain("Renvoyer");
	});

	it("button is enabled when not pending and no cooldown", () => {
		render(<ResendVerificationButton email="user@example.com" />);
		expect(screen.getByRole("button")).not.toBeDisabled();
	});

	// ─── Pending state ────────────────────────────────────────────────────────

	it("shows loader icon when isPending is true", () => {
		mockIsPending.value = true;
		render(<ResendVerificationButton email="user@example.com" />);
		expect(screen.getByTestId("icon-loader")).toBeInTheDocument();
	});

	it("shows 'Envoi...' text when isPending is true", () => {
		mockIsPending.value = true;
		render(<ResendVerificationButton email="user@example.com" />);
		expect(screen.getByRole("button").textContent).toContain("Envoi...");
	});

	it("disables button when isPending is true", () => {
		mockIsPending.value = true;
		render(<ResendVerificationButton email="user@example.com" />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	// ─── Cooldown from localStorage ───────────────────────────────────────────

	it("shows cooldown remaining when localStorage has recent cooldown", () => {
		const key = `resend-cooldown-user@example.com`;
		// Set a start time 10 seconds ago → 50s remaining
		localStorageMock.getItem.mockReturnValue(String(Date.now() - 10_000));
		render(<ResendVerificationButton email="user@example.com" />);
		const text = screen.getByRole("button").textContent ?? "";
		expect(text).toContain("Renvoyer dans");
		expect(text).toContain("s");
	});

	it("disables button when cooldown is active from localStorage", () => {
		localStorageMock.getItem.mockReturnValue(String(Date.now() - 5_000));
		render(<ResendVerificationButton email="user@example.com" />);
		expect(screen.getByRole("button")).toBeDisabled();
	});

	it("does not show cooldown when localStorage has expired entry", () => {
		// 90 seconds ago → 0s remaining (expired)
		localStorageMock.getItem.mockReturnValue(String(Date.now() - 90_000));
		render(<ResendVerificationButton email="user@example.com" />);
		expect(screen.getByRole("button")).not.toBeDisabled();
	});

	it("shows idle state when localStorage returns null (no stored cooldown)", () => {
		localStorageMock.getItem.mockReturnValue(null);
		render(<ResendVerificationButton email="user@example.com" />);
		expect(screen.getByRole("button")).not.toBeDisabled();
		expect(screen.getByTestId("icon-mail")).toBeInTheDocument();
	});
});
