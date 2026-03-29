import { cleanup, render, renderHook, screen } from "@testing-library/react";
import { userEvent } from "@testing-library/user-event";
import { type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// ============================================================================
// MODULE MOCKS
// ============================================================================

vi.mock("@/modules/auth/lib/auth", () => ({}));
vi.mock("@/shared/lib/prisma", () => ({ prisma: {} }));

// ============================================================================
// IMPORTS AFTER MOCKS
// ============================================================================

import {
	NavigationGuardProvider,
	useNavigationGuard,
	useNavigationGuardOptional,
} from "../navigation-guard-context";

// ============================================================================
// HELPERS
// ============================================================================

function ContextConsumer() {
	const guard = useNavigationGuard();
	return (
		<div>
			<span data-testid="has-guards">{String(guard.hasActiveGuards())}</span>
			<span data-testid="pending">
				{guard.pendingNavigation ? guard.pendingNavigation.destination : "none"}
			</span>
			<span data-testid="message">{guard.guardMessage}</span>
			<button
				onClick={() => guard.registerGuard("test-guard", { message: "Custom message" })}
				data-testid="btn-register"
			>
				Register
			</button>
			<button onClick={() => guard.unregisterGuard("test-guard")} data-testid="btn-unregister">
				Unregister
			</button>
			<button
				onClick={() => guard.requestNavigation("/new-page", () => {})}
				data-testid="btn-request"
			>
				Request
			</button>
			<button onClick={() => guard.confirmNavigation()} data-testid="btn-confirm">
				Confirm
			</button>
			<button onClick={() => guard.cancelNavigation()} data-testid="btn-cancel">
				Cancel
			</button>
		</div>
	);
}

function renderWithProvider() {
	return render(
		<NavigationGuardProvider>
			<ContextConsumer />
		</NavigationGuardProvider>,
	);
}

// ============================================================================
// TESTS
// ============================================================================

afterEach(cleanup);

describe("NavigationGuardProvider", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it("renders children", () => {
		render(
			<NavigationGuardProvider>
				<div data-testid="child">child</div>
			</NavigationGuardProvider>,
		);
		expect(screen.getByTestId("child")).toBeInTheDocument();
	});

	it("hasActiveGuards returns false initially", () => {
		renderWithProvider();
		expect(screen.getByTestId("has-guards").textContent).toBe("false");
	});

	it("hasActiveGuards returns true after registerGuard", () => {
		const wrapper = ({ children }: { children: ReactNode }) => (
			<NavigationGuardProvider>{children}</NavigationGuardProvider>
		);
		const { result } = renderHook(() => useNavigationGuard(), { wrapper });
		expect(result.current.hasActiveGuards()).toBe(false);
		result.current.registerGuard("test-guard", { message: "Custom message" });
		expect(result.current.hasActiveGuards()).toBe(true);
	});

	it("hasActiveGuards returns false after unregisterGuard", async () => {
		renderWithProvider();
		await userEvent.click(screen.getByTestId("btn-register"));
		await userEvent.click(screen.getByTestId("btn-unregister"));
		expect(screen.getByTestId("has-guards").textContent).toBe("false");
	});

	it("requestNavigation returns true when no guards active", () => {
		let result: boolean | undefined;

		function TestComponent() {
			const guard = useNavigationGuard();
			return (
				<button
					onClick={() => {
						result = guard.requestNavigation("/somewhere", () => {});
					}}
				>
					Test
				</button>
			);
		}

		render(
			<NavigationGuardProvider>
				<TestComponent />
			</NavigationGuardProvider>,
		);

		screen.getByRole("button").click();
		expect(result).toBe(true);
	});

	it("requestNavigation returns false and sets pending navigation when guards active", async () => {
		let result: boolean | undefined;

		function TestComponent() {
			const guard = useNavigationGuard();
			return (
				<div>
					<button
						data-testid="register"
						onClick={() => guard.registerGuard("g1", { message: "Unsaved changes" })}
					>
						Register
					</button>
					<button
						data-testid="request"
						onClick={() => {
							result = guard.requestNavigation("/target", () => {});
						}}
					>
						Request
					</button>
					<span data-testid="pending">{guard.pendingNavigation?.destination ?? "none"}</span>
				</div>
			);
		}

		render(
			<NavigationGuardProvider>
				<TestComponent />
			</NavigationGuardProvider>,
		);

		await userEvent.click(screen.getByTestId("register"));
		await userEvent.click(screen.getByTestId("request"));

		expect(result).toBe(false);
		expect(screen.getByTestId("pending").textContent).toBe("/target");
	});

	it("shows custom guard message after blocking navigation", async () => {
		renderWithProvider();
		await userEvent.click(screen.getByTestId("btn-register"));
		await userEvent.click(screen.getByTestId("btn-request"));
		expect(screen.getByTestId("message").textContent).toBe("Custom message");
	});

	it("shows default message when guard has no custom message", () => {
		function TestComponent() {
			const guard = useNavigationGuard();
			return (
				<div>
					<button data-testid="register" onClick={() => guard.registerGuard("g1", {})}>
						Register
					</button>
					<button
						data-testid="request"
						onClick={() => guard.requestNavigation("/target", () => {})}
					>
						Request
					</button>
					<span data-testid="message">{guard.guardMessage}</span>
				</div>
			);
		}

		render(
			<NavigationGuardProvider>
				<TestComponent />
			</NavigationGuardProvider>,
		);

		screen.getByTestId("register").click();
		screen.getByTestId("request").click();

		expect(screen.getByTestId("message").textContent).toContain("modifications non sauvegardées");
	});

	it("cancelNavigation clears pending navigation", async () => {
		renderWithProvider();
		await userEvent.click(screen.getByTestId("btn-register"));
		await userEvent.click(screen.getByTestId("btn-request"));
		expect(screen.getByTestId("pending").textContent).toBe("/new-page");

		await userEvent.click(screen.getByTestId("btn-cancel"));
		expect(screen.getByTestId("pending").textContent).toBe("none");
	});

	it("confirmNavigation calls proceed and clears pending navigation", async () => {
		const proceed = vi.fn();

		function TestComponent() {
			const guard = useNavigationGuard();
			return (
				<div>
					<button data-testid="register" onClick={() => guard.registerGuard("g1", {})}>
						Register
					</button>
					<button
						data-testid="request"
						onClick={() => guard.requestNavigation("/somewhere", proceed)}
					>
						Request
					</button>
					<button data-testid="confirm" onClick={() => guard.confirmNavigation()}>
						Confirm
					</button>
					<span data-testid="pending">{guard.pendingNavigation?.destination ?? "none"}</span>
				</div>
			);
		}

		render(
			<NavigationGuardProvider>
				<TestComponent />
			</NavigationGuardProvider>,
		);

		await userEvent.click(screen.getByTestId("register"));
		await userEvent.click(screen.getByTestId("request"));
		await userEvent.click(screen.getByTestId("confirm"));

		expect(proceed).toHaveBeenCalledOnce();
		expect(screen.getByTestId("pending").textContent).toBe("none");
	});

	it("onBlock callback is called when navigation is blocked", async () => {
		const onBlock = vi.fn();

		function TestComponent() {
			const guard = useNavigationGuard();
			return (
				<div>
					<button data-testid="register" onClick={() => guard.registerGuard("g1", { onBlock })}>
						Register
					</button>
					<button
						data-testid="request"
						onClick={() => guard.requestNavigation("/somewhere", () => {})}
					>
						Request
					</button>
				</div>
			);
		}

		render(
			<NavigationGuardProvider>
				<TestComponent />
			</NavigationGuardProvider>,
		);

		await userEvent.click(screen.getByTestId("register"));
		await userEvent.click(screen.getByTestId("request"));

		expect(onBlock).toHaveBeenCalledOnce();
	});
});

describe("useNavigationGuard outside provider", () => {
	it("throws when used outside NavigationGuardProvider", () => {
		function BrokenComponent() {
			useNavigationGuard();
			return null;
		}

		const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
		expect(() => render(<BrokenComponent />)).toThrow(
			"useNavigationGuard must be used within NavigationGuardProvider",
		);
		consoleError.mockRestore();
	});
});

describe("useNavigationGuardOptional", () => {
	it("returns null outside provider without throwing", () => {
		const { result } = renderHook(() => useNavigationGuardOptional());
		expect(result.current).toBeNull();
	});

	it("returns context when inside provider", () => {
		const wrapper = ({ children }: { children: ReactNode }) => (
			<NavigationGuardProvider>{children}</NavigationGuardProvider>
		);
		const { result } = renderHook(() => useNavigationGuardOptional(), { wrapper });

		expect(result.current).not.toBeNull();
		expect(result.current).toHaveProperty("registerGuard");
		expect(result.current).toHaveProperty("hasActiveGuards");
	});
});
