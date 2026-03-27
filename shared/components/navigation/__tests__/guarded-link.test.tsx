import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";

// ============================================================================
// HOISTED MOCKS
// ============================================================================

const { mockRouter, mockNavigationGuardRef } = vi.hoisted(() => ({
	mockRouter: {
		push: vi.fn(),
		replace: vi.fn(),
		prefetch: vi.fn(),
		back: vi.fn(),
		forward: vi.fn(),
		refresh: vi.fn(),
	},
	mockNavigationGuardRef: {
		value: null as {
			hasActiveGuards: ReturnType<typeof vi.fn>;
			requestNavigation: ReturnType<typeof vi.fn>;
		} | null,
	},
}));

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("next/link", () => {
	const { createElement, forwardRef } = require("react");
	return {
		// eslint-disable-next-line react/display-name
		default: forwardRef(
			(
				{
					href,
					children,
					onNavigate,
					onClick: _onClick,
					...props
				}: {
					href: string;
					children: unknown;
					onNavigate?: (e: { preventDefault: () => void }) => void;
					onClick?: () => void;
				},
				ref: unknown,
			) =>
				createElement(
					"a",
					{
						ref,
						href:
							typeof href === "string" ? href : ((href as { pathname?: string }).pathname ?? ""),
						"data-testid": "guarded-link",
						onClick: (e: MouseEvent) => {
							onNavigate?.(e);
						},
						...props,
					},
					children,
				),
		),
	};
});

vi.mock("next/navigation", () => ({
	useRouter: () => mockRouter,
}));

vi.mock("@/shared/contexts/navigation-guard-context", () => ({
	useNavigationGuardOptional: () => mockNavigationGuardRef.value,
}));

// ============================================================================
// IMPORT AFTER MOCKS
// ============================================================================

import { GuardedLink } from "../guarded-link";

// ============================================================================
// SETUP
// ============================================================================

beforeEach(() => {
	vi.clearAllMocks();
	mockRouter.push = vi.fn();
	mockNavigationGuardRef.value = null;
});

afterEach(cleanup);

// ============================================================================
// TESTS
// ============================================================================

describe("GuardedLink", () => {
	// ============================================================================
	// RENDERING
	// ============================================================================

	describe("rendering", () => {
		it("renders children", () => {
			render(<GuardedLink href="/products">Voir les produits</GuardedLink>);

			expect(screen.getByText("Voir les produits")).toBeInTheDocument();
		});

		it("renders as a link with the correct href", () => {
			render(<GuardedLink href="/products">Produits</GuardedLink>);

			const link = screen.getByTestId("guarded-link");
			expect(link).toBeInTheDocument();
			expect(link).toHaveAttribute("href", "/products");
		});
	});

	// ============================================================================
	// WITHOUT NAVIGATION GUARD CONTEXT
	// ============================================================================

	describe("without navigation guard context", () => {
		it("navigation proceeds when no guard context is present", () => {
			mockNavigationGuardRef.value = null;
			render(<GuardedLink href="/products">Produits</GuardedLink>);

			const link = screen.getByTestId("guarded-link");
			const preventDefaultSpy = vi.fn();
			fireEvent.click(link, { preventDefault: preventDefaultSpy });

			// No guards means no blocking — router.push should not be called by the guard
			expect(mockRouter.push).not.toHaveBeenCalled();
		});
	});

	// ============================================================================
	// WITH GUARDS BUT NONE ACTIVE
	// ============================================================================

	describe("with guard context but no active guards", () => {
		it("navigation proceeds when hasActiveGuards returns false", () => {
			mockNavigationGuardRef.value = {
				hasActiveGuards: vi.fn(() => false),
				requestNavigation: vi.fn(() => true),
			};

			render(<GuardedLink href="/products">Produits</GuardedLink>);

			const link = screen.getByTestId("guarded-link");
			fireEvent.click(link);

			expect(mockNavigationGuardRef.value!.requestNavigation).not.toHaveBeenCalled();
			expect(mockRouter.push).not.toHaveBeenCalled();
		});
	});

	// ============================================================================
	// WITH ACTIVE GUARDS
	// ============================================================================

	describe("with active guards", () => {
		it("calls preventDefault and requestNavigation when guards are active", () => {
			mockNavigationGuardRef.value = {
				hasActiveGuards: vi.fn(() => true),
				requestNavigation: vi.fn(() => false),
			};

			render(<GuardedLink href="/admin">Admin</GuardedLink>);

			const link = screen.getByTestId("guarded-link");
			const event = new MouseEvent("click", { bubbles: true, cancelable: true });
			const preventDefaultSpy = vi.spyOn(event, "preventDefault");
			link.dispatchEvent(event);

			expect(preventDefaultSpy).toHaveBeenCalled();
			expect(mockNavigationGuardRef.value!.requestNavigation).toHaveBeenCalledWith(
				"/admin",
				expect.any(Function),
			);
		});

		it("calls router.push when requestNavigation returns true", () => {
			mockNavigationGuardRef.value = {
				hasActiveGuards: vi.fn(() => true),
				requestNavigation: vi.fn(() => true),
			};

			render(<GuardedLink href="/admin">Admin</GuardedLink>);

			const link = screen.getByTestId("guarded-link");
			link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(mockRouter.push).toHaveBeenCalledWith("/admin");
		});

		it("does NOT call router.push when requestNavigation returns false (blocked)", () => {
			mockNavigationGuardRef.value = {
				hasActiveGuards: vi.fn(() => true),
				requestNavigation: vi.fn(() => false),
			};

			render(<GuardedLink href="/admin">Admin</GuardedLink>);

			const link = screen.getByTestId("guarded-link");
			link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(mockRouter.push).not.toHaveBeenCalled();
		});

		it("uses href.pathname when href is an object", () => {
			mockNavigationGuardRef.value = {
				hasActiveGuards: vi.fn(() => true),
				requestNavigation: vi.fn(() => false),
			};

			render(<GuardedLink href={{ pathname: "/admin/products" }}>Produits admin</GuardedLink>);

			const link = screen.getByTestId("guarded-link");
			link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(mockNavigationGuardRef.value!.requestNavigation).toHaveBeenCalledWith(
				"/admin/products",
				expect.any(Function),
			);
		});

		it("uses empty string as destination when href is object with no pathname", () => {
			mockNavigationGuardRef.value = {
				hasActiveGuards: vi.fn(() => true),
				requestNavigation: vi.fn(() => false),
			};

			render(<GuardedLink href={{}}>Lien</GuardedLink>);

			const link = screen.getByTestId("guarded-link");
			link.dispatchEvent(new MouseEvent("click", { bubbles: true, cancelable: true }));

			expect(mockNavigationGuardRef.value!.requestNavigation).toHaveBeenCalledWith(
				"",
				expect.any(Function),
			);
		});
	});
});
