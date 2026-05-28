import { cleanup, render, act } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import React from "react";

// ============================================================================
// TESTS
// ============================================================================

/**
 * SerwistProvider is a module-level constant computed from process.env.NODE_ENV
 * at import time. To test both branches (production vs non-production) we must
 * reset the module registry between groups and set NODE_ENV before each import.
 */

describe("SerwistProvider (serwist-client)", () => {
	// Preserve the original environment value
	const originalNodeEnv = process.env.NODE_ENV;

	// Keep a reference to window.navigator.serviceWorker across tests
	let registerMock: ReturnType<typeof vi.fn>;

	beforeEach(() => {
		vi.clearAllMocks();
		registerMock = vi.fn().mockResolvedValue(undefined);
	});

	afterEach(() => {
		cleanup();
		vi.unstubAllEnvs();
		vi.resetModules();
		// Restore NODE_ENV
		(process.env as Record<string, string>).NODE_ENV = originalNodeEnv;
	});

	// --------------------------------------------------------------------------
	// Production branch — SafeSerwistProvider
	// --------------------------------------------------------------------------

	describe("in production mode", () => {
		async function importProductionProvider() {
			(process.env as Record<string, string>).NODE_ENV = "production";
			const mod = await import("../serwist-client");
			return mod.SerwistProvider;
		}

		it("is not the PassThrough component (i.e. registers a service worker)", async () => {
			Object.defineProperty(navigator, "serviceWorker", {
				value: { register: registerMock },
				writable: true,
				configurable: true,
			});

			const SerwistProvider = await importProductionProvider();

			await act(async () => {
				render(
					<SerwistProvider swUrl="/sw.js">
						<div>child</div>
					</SerwistProvider>,
				);
				await Promise.resolve();
			});

			expect(registerMock).toHaveBeenCalled();
		});

		it("registers the service worker with the provided swUrl", async () => {
			Object.defineProperty(navigator, "serviceWorker", {
				value: { register: registerMock },
				writable: true,
				configurable: true,
			});

			const SerwistProvider = await importProductionProvider();

			await act(async () => {
				render(
					<SerwistProvider swUrl="/sw-custom.js">
						<div>child</div>
					</SerwistProvider>,
				);
				await Promise.resolve();
			});

			expect(registerMock).toHaveBeenCalledWith("/sw-custom.js", expect.any(Object));
		});

		it("passes { type: 'module', scope: '/' } as registration options", async () => {
			Object.defineProperty(navigator, "serviceWorker", {
				value: { register: registerMock },
				writable: true,
				configurable: true,
			});

			const SerwistProvider = await importProductionProvider();

			await act(async () => {
				render(
					<SerwistProvider swUrl="/sw.js">
						<div>child</div>
					</SerwistProvider>,
				);
				await Promise.resolve();
			});

			expect(registerMock).toHaveBeenCalledWith(expect.any(String), {
				type: "module",
				scope: "/",
			});
		});

		it("renders children", async () => {
			Object.defineProperty(navigator, "serviceWorker", {
				value: { register: registerMock },
				writable: true,
				configurable: true,
			});

			const SerwistProvider = await importProductionProvider();

			let container!: HTMLElement;
			await act(async () => {
				({ container } = render(
					<SerwistProvider swUrl="/sw.js">
						<span data-testid="child">content</span>
					</SerwistProvider>,
				));
				await Promise.resolve();
			});

			expect(container.querySelector("[data-testid='child']")).not.toBeNull();
		});

		it("handles registration failure gracefully (does not throw)", async () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			Object.defineProperty(navigator, "serviceWorker", {
				value: {
					register: vi.fn().mockRejectedValue(new Error("SW registration failed")),
				},
				writable: true,
				configurable: true,
			});

			const SerwistProvider = await importProductionProvider();

			// Should not throw even though registration rejects
			await expect(
				act(async () => {
					render(
						<SerwistProvider swUrl="/sw.js">
							<div>child</div>
						</SerwistProvider>,
					);
					// Flush microtasks so the rejected promise is handled
					await Promise.resolve();
					await Promise.resolve();
				}),
			).resolves.not.toThrow();

			consoleSpy.mockRestore();
		});

		it("logs a warning when registration fails", async () => {
			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
			const registrationError = new Error("SW registration failed");
			Object.defineProperty(navigator, "serviceWorker", {
				value: {
					register: vi.fn().mockRejectedValue(registrationError),
				},
				writable: true,
				configurable: true,
			});

			const SerwistProvider = await importProductionProvider();

			await act(async () => {
				render(
					<SerwistProvider swUrl="/sw.js">
						<div>child</div>
					</SerwistProvider>,
				);
				await Promise.resolve();
				await Promise.resolve();
			});

			expect(consoleSpy).toHaveBeenCalledWith("[SW] Registration failed:", registrationError);
			consoleSpy.mockRestore();
		});

		it("does not attempt to register when serviceWorker is not in navigator", async () => {
			// jsdom defines navigator.serviceWorker as a non-configurable getter on the
			// Navigator prototype. The only reliable way to simulate its absence is to
			// delete it from the Navigator prototype for this test, then restore it.
			const NavigatorProto = Object.getPrototypeOf(navigator) as typeof navigator;
			const originalDescriptor = Object.getOwnPropertyDescriptor(NavigatorProto, "serviceWorker");
			try {
				delete (NavigatorProto as unknown as Record<string, unknown>).serviceWorker;
			} catch {
				// If deletion is not allowed, skip this test gracefully
				return;
			}

			const SerwistProvider = await importProductionProvider();

			// Should render without error and without calling register
			await act(async () => {
				render(
					<SerwistProvider swUrl="/sw.js">
						<div>child</div>
					</SerwistProvider>,
				);
				await Promise.resolve();
			});

			expect(registerMock).not.toHaveBeenCalled();

			// Restore the original descriptor
			if (originalDescriptor) {
				Object.defineProperty(NavigatorProto, "serviceWorker", originalDescriptor);
			}
		});
	});

	// --------------------------------------------------------------------------
	// Non-production branch — PassThrough
	// --------------------------------------------------------------------------

	describe("in development mode", () => {
		async function importDevProvider() {
			(process.env as Record<string, string>).NODE_ENV = "development";
			const mod = await import("../serwist-client");
			return mod.SerwistProvider;
		}

		it("does not register a service worker", async () => {
			Object.defineProperty(navigator, "serviceWorker", {
				value: { register: registerMock },
				writable: true,
				configurable: true,
			});

			const SerwistProvider = await importDevProvider();

			await act(async () => {
				render(
					<SerwistProvider swUrl="/sw.js">
						<div>child</div>
					</SerwistProvider>,
				);
				await Promise.resolve();
			});

			expect(registerMock).not.toHaveBeenCalled();
		});

		it("still renders children", async () => {
			Object.defineProperty(navigator, "serviceWorker", {
				value: { register: registerMock },
				writable: true,
				configurable: true,
			});

			const SerwistProvider = await importDevProvider();

			let container!: HTMLElement;
			await act(async () => {
				({ container } = render(
					<SerwistProvider swUrl="/sw.js">
						<span data-testid="dev-child">dev content</span>
					</SerwistProvider>,
				));
				await Promise.resolve();
			});

			expect(container.querySelector("[data-testid='dev-child']")).not.toBeNull();
		});
	});

	// --------------------------------------------------------------------------
	// Test mode (current environment)
	// --------------------------------------------------------------------------

	describe("in test mode", () => {
		it("does not register a service worker in test environment", async () => {
			// NODE_ENV is 'test' during vitest runs — PassThrough is used
			Object.defineProperty(navigator, "serviceWorker", {
				value: { register: registerMock },
				writable: true,
				configurable: true,
			});

			// Import with current NODE_ENV ('test')
			const { SerwistProvider } = await import("../serwist-client");

			await act(async () => {
				render(
					<SerwistProvider swUrl="/sw.js">
						<div>child</div>
					</SerwistProvider>,
				);
				await Promise.resolve();
			});

			expect(registerMock).not.toHaveBeenCalled();
		});
	});

	// --------------------------------------------------------------------------
	// SW update handling (PWA-AUDIT-005)
	// --------------------------------------------------------------------------

	describe("service worker update handling (PWA-AUDIT-005)", () => {
		function makeSwMock(controller: object | null) {
			const target = new EventTarget();
			return Object.assign(target, {
				register: vi.fn().mockResolvedValue(undefined),
				controller,
			});
		}

		function stubReload(): { reloadSpy: ReturnType<typeof vi.fn>; restore: () => void } | null {
			const reloadSpy = vi.fn();
			const original = Object.getOwnPropertyDescriptor(window, "location");
			try {
				Object.defineProperty(window, "location", {
					configurable: true,
					value: { ...window.location, reload: reloadSpy },
				});
			} catch {
				return null;
			}
			return {
				reloadSpy,
				restore: () => {
					if (original) Object.defineProperty(window, "location", original);
				},
			};
		}

		async function importProductionProvider() {
			(process.env as Record<string, string>).NODE_ENV = "production";
			const mod = await import("../serwist-client");
			return mod.SerwistProvider;
		}

		it("reloads once when a new SW takes control and a controller already existed", async () => {
			const reload = stubReload();
			if (!reload) return; // environment does not allow overriding location — skip
			const sw = makeSwMock({}); // existing controller => this is an update
			Object.defineProperty(navigator, "serviceWorker", {
				value: sw,
				writable: true,
				configurable: true,
			});

			const SerwistProvider = await importProductionProvider();
			await act(async () => {
				render(
					<SerwistProvider swUrl="/sw.js">
						<div>child</div>
					</SerwistProvider>,
				);
				await Promise.resolve();
			});

			await act(async () => {
				sw.dispatchEvent(new Event("controllerchange"));
				sw.dispatchEvent(new Event("controllerchange"));
			});

			expect(reload.reloadSpy).toHaveBeenCalledTimes(1);
			reload.restore();
		});

		it("does NOT reload on first install (no prior controller)", async () => {
			const reload = stubReload();
			if (!reload) return;
			const sw = makeSwMock(null); // no controller yet => initial clientsClaim
			Object.defineProperty(navigator, "serviceWorker", {
				value: sw,
				writable: true,
				configurable: true,
			});

			const SerwistProvider = await importProductionProvider();
			await act(async () => {
				render(
					<SerwistProvider swUrl="/sw.js">
						<div>child</div>
					</SerwistProvider>,
				);
				await Promise.resolve();
			});

			await act(async () => {
				sw.dispatchEvent(new Event("controllerchange"));
			});

			expect(reload.reloadSpy).not.toHaveBeenCalled();
			reload.restore();
		});
	});

	// --------------------------------------------------------------------------
	// Sensitive cache purge on logout (PWA-AUDIT-010)
	// --------------------------------------------------------------------------

	describe("clearSensitiveCaches (PWA-AUDIT-010)", () => {
		it("deletes the navigation caches when Cache Storage is available", async () => {
			const deleteMock = vi.fn().mockResolvedValue(true);
			vi.stubGlobal("caches", { delete: deleteMock });

			const { clearSensitiveCaches } = await import("../serwist-client");
			await clearSensitiveCaches();

			expect(deleteMock).toHaveBeenCalledWith("navigations");
			expect(deleteMock).toHaveBeenCalledWith("api-responses");

			vi.unstubAllGlobals();
		});

		it("resolves without throwing when Cache Storage is unavailable", async () => {
			vi.unstubAllGlobals(); // ensure `caches` is undefined
			const { clearSensitiveCaches } = await import("../serwist-client");
			await expect(clearSensitiveCaches()).resolves.toBeUndefined();
		});

		it("swallows Cache Storage errors (logout is never blocked)", async () => {
			const deleteMock = vi.fn().mockRejectedValue(new Error("quota"));
			vi.stubGlobal("caches", { delete: deleteMock });

			const { clearSensitiveCaches } = await import("../serwist-client");
			await expect(clearSensitiveCaches()).resolves.toBeUndefined();

			vi.unstubAllGlobals();
		});
	});
});
