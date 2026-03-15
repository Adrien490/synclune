import type React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup, act } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockInstallPrompt, mockCookieStore } = vi.hoisted(() => ({
	mockInstallPrompt: {
		shouldShowBanner: true,
		dismiss: vi.fn(),
		markInstalled: vi.fn(),
		recordVisit: vi.fn(),
	},
	mockCookieStore: {
		bannerVisible: false,
		hasConsented: true,
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("motion/react", () => {
	const { forwardRef: fRef } = require("react");
	return {
		AnimatePresence: ({ children }: { children: unknown }) => children,
		m: {
			div: fRef(
				(
					{
						children,
						initial: _i,
						animate: _a,
						exit: _e,
						transition: _t,
						...props
					}: Record<string, unknown> & { children?: unknown },
					ref: unknown,
				) => {
					const { createElement } = require("react");
					return createElement("div", { ref, ...props }, children);
				},
			),
		},
		useReducedMotion: () => false,
	};
});

vi.mock("@/shared/components/animations/motion.config", () => ({
	MOTION_CONFIG: { duration: { slow: 0.3 }, easing: { easeOut: [0, 0, 0.2, 1] } },
}));

vi.mock("@/shared/hooks/use-install-prompt", () => ({
	useInstallPrompt: () => mockInstallPrompt,
}));

vi.mock("@/shared/providers/cookie-consent-store-provider", () => ({
	useCookieConsentStore: (selector: (s: { bannerVisible: boolean }) => unknown) =>
		selector({ bannerVisible: mockCookieStore.bannerVisible }),
	useHasConsented: () => mockCookieStore.hasConsented,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		...props
	}: React.ButtonHTMLAttributes<HTMLButtonElement> & { ref?: unknown }) => {
		const { ref: _ref, variant: _v, size: _s, ...htmlProps } = props as Record<string, unknown>;
		return (
			<button onClick={onClick} {...(htmlProps as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
				{children}
			</button>
		);
	},
}));

vi.mock("@/shared/components/logo", () => ({
	Logo: () => <div data-testid="logo" />,
}));

vi.mock("@radix-ui/react-focus-scope", () => ({
	FocusScope: ({ children }: { children: unknown }) => <>{children}</>,
}));

vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) => args.filter(Boolean).join(" "),
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { InstallPromptBanner } from "../install-prompt-banner";

const defaultInitialState = {
	visitCount: 3,
	dismissCount: 0,
	permanentlyDismissed: false,
};

describe("InstallPromptBanner", () => {
	let _addEventListenerSpy: ReturnType<typeof vi.spyOn>;
	const eventHandlers = new Map<string, EventListener>();

	beforeEach(() => {
		vi.clearAllMocks();
		mockInstallPrompt.shouldShowBanner = true;
		mockCookieStore.bannerVisible = false;
		mockCookieStore.hasConsented = true;
		eventHandlers.clear();

		// Mock matchMedia for standalone detection
		Object.defineProperty(window, "matchMedia", {
			writable: true,
			value: vi.fn(() => ({ matches: false })),
		});

		// Capture event listeners
		_addEventListenerSpy = vi
			.spyOn(window, "addEventListener")
			.mockImplementation((type: string, handler: EventListenerOrEventListenerObject) => {
				if (typeof handler === "function") {
					eventHandlers.set(type, handler);
				}
			});
		vi.spyOn(window, "removeEventListener").mockImplementation(() => {});
		vi.spyOn(document, "addEventListener").mockImplementation(
			(type: string, handler: EventListenerOrEventListenerObject) => {
				if (typeof handler === "function") {
					eventHandlers.set(`doc:${type}`, handler);
				}
			},
		);
		vi.spyOn(document, "removeEventListener").mockImplementation(() => {});
	});

	afterEach(cleanup);

	function triggerBeforeInstallPrompt() {
		const promptFn = vi.fn().mockResolvedValue(undefined);
		const userChoicePromise = Promise.resolve({ outcome: "accepted" as const, platform: "" });
		const event = {
			preventDefault: vi.fn(),
			prompt: promptFn,
			userChoice: userChoicePromise,
		};
		act(() => {
			eventHandlers.get("beforeinstallprompt")?.(event as unknown as Event);
		});
		return { promptFn, userChoicePromise, event };
	}

	// ============================================================================
	// VISIBILITY CONDITIONS
	// ============================================================================

	it("returns null when shouldShowBanner is false", () => {
		mockInstallPrompt.shouldShowBanner = false;
		render(<InstallPromptBanner initialState={defaultInitialState} />);
		triggerBeforeInstallPrompt();
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});

	it("returns null when standalone mode is detected", async () => {
		(window.matchMedia as ReturnType<typeof vi.fn>).mockReturnValue({ matches: true });
		render(<InstallPromptBanner initialState={defaultInitialState} />);
		// Flush queueMicrotask used for setIsStandalone
		await act(async () => {
			await Promise.resolve();
		});
		triggerBeforeInstallPrompt();
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});

	it("returns null when cookie banner is not resolved", () => {
		mockCookieStore.bannerVisible = true;
		mockCookieStore.hasConsented = false;
		render(<InstallPromptBanner initialState={defaultInitialState} />);
		triggerBeforeInstallPrompt();
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});

	it("returns null when no deferredPrompt and not iOS", () => {
		// Don't trigger beforeinstallprompt, not iOS
		render(<InstallPromptBanner initialState={defaultInitialState} />);
		expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
	});

	// ============================================================================
	// VISIBLE RENDERING
	// ============================================================================

	it("renders when all conditions are met with deferredPrompt", () => {
		render(<InstallPromptBanner initialState={defaultInitialState} />);
		triggerBeforeInstallPrompt();
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();
	});

	// ============================================================================
	// NON-iOS BUTTONS
	// ============================================================================

	it("shows Installer and Plus tard buttons on non-iOS", () => {
		render(<InstallPromptBanner initialState={defaultInitialState} />);
		triggerBeforeInstallPrompt();
		expect(screen.getByText("Installer")).toBeInTheDocument();
		expect(screen.getByText("Plus tard")).toBeInTheDocument();
	});

	it("calls dismiss when 'Plus tard' is clicked", () => {
		render(<InstallPromptBanner initialState={defaultInitialState} />);
		triggerBeforeInstallPrompt();
		fireEvent.click(screen.getByText("Plus tard"));
		expect(mockInstallPrompt.dismiss).toHaveBeenCalled();
	});

	it("calls prompt and markInstalled on install", async () => {
		render(<InstallPromptBanner initialState={defaultInitialState} />);
		const { promptFn, userChoicePromise } = triggerBeforeInstallPrompt();

		await act(async () => {
			fireEvent.click(screen.getByText("Installer"));
			await userChoicePromise;
		});

		expect(promptFn).toHaveBeenCalled();
		expect(mockInstallPrompt.markInstalled).toHaveBeenCalled();
	});

	// ============================================================================
	// RECORD VISIT
	// ============================================================================

	it("calls recordVisit on mount", () => {
		render(<InstallPromptBanner initialState={defaultInitialState} />);
		expect(mockInstallPrompt.recordVisit).toHaveBeenCalled();
	});

	// ============================================================================
	// APP INSTALLED EVENT
	// ============================================================================

	it("calls markInstalled on appinstalled event", () => {
		render(<InstallPromptBanner initialState={defaultInitialState} />);
		act(() => {
			eventHandlers.get("appinstalled")?.(new Event("appinstalled"));
		});
		expect(mockInstallPrompt.markInstalled).toHaveBeenCalled();
	});

	// ============================================================================
	// ACCESSIBILITY
	// ============================================================================

	it("has correct a11y attributes on alertdialog", () => {
		render(<InstallPromptBanner initialState={defaultInitialState} />);
		triggerBeforeInstallPrompt();
		const dialog = screen.getByRole("alertdialog");
		expect(dialog).toHaveAttribute("aria-modal", "true");
		expect(dialog).toHaveAttribute("aria-label", "Installer l'application");
		expect(dialog).toHaveAttribute("aria-describedby", "install-description");
	});

	// ============================================================================
	// ESCAPE KEY
	// ============================================================================

	it("dismisses on Escape key", () => {
		render(<InstallPromptBanner initialState={defaultInitialState} />);
		triggerBeforeInstallPrompt();
		act(() => {
			const handler = eventHandlers.get("doc:keydown");
			handler?.(new KeyboardEvent("keydown", { key: "Escape" }));
		});
		expect(mockInstallPrompt.dismiss).toHaveBeenCalled();
	});
});
