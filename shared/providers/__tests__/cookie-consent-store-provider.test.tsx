import { describe, it, expect, afterEach, vi } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";

import {
	CookieConsentStoreProvider,
	useCookieConsentStore,
	useHasConsented,
} from "../cookie-consent-store-provider";

// Mock localStorage for persist middleware (jsdom's localStorage lacks proper methods)
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

afterEach(() => {
	cleanup();
	localStorageMock.clear();
});

// ============================================================================
// CONSUMERS
// ============================================================================

function StateConsumer() {
	const accepted = useCookieConsentStore((s) => s.accepted);
	const bannerVisible = useCookieConsentStore((s) => s.bannerVisible);
	const hasHydrated = useCookieConsentStore((s) => s._hasHydrated);
	const acceptCookies = useCookieConsentStore((s) => s.acceptCookies);
	const rejectCookies = useCookieConsentStore((s) => s.rejectCookies);
	const resetConsent = useCookieConsentStore((s) => s.resetConsent);

	return (
		<div>
			<span data-testid="accepted">{String(accepted)}</span>
			<span data-testid="banner-visible">{String(bannerVisible)}</span>
			<span data-testid="hydrated">{String(hasHydrated)}</span>
			<button data-testid="btn-accept" onClick={acceptCookies}>
				accept
			</button>
			<button data-testid="btn-reject" onClick={rejectCookies}>
				reject
			</button>
			<button data-testid="btn-reset" onClick={resetConsent}>
				reset
			</button>
		</div>
	);
}

function HasConsentedConsumer() {
	const hasConsented = useHasConsented();
	return <span data-testid="has-consented">{String(hasConsented)}</span>;
}

// ============================================================================
// TESTS
// ============================================================================

describe("CookieConsentStoreProvider", () => {
	it("provides a working store to consumers", () => {
		render(
			<CookieConsentStoreProvider>
				<StateConsumer />
			</CookieConsentStoreProvider>,
		);

		expect(screen.getByTestId("accepted")).toHaveTextContent("null");
		expect(screen.getByTestId("banner-visible")).toHaveTextContent("true");
	});

	it("marks _hasHydrated=true via useEffect fallback for first-time visitors", () => {
		render(
			<CookieConsentStoreProvider>
				<StateConsumer />
			</CookieConsentStoreProvider>,
		);

		expect(screen.getByTestId("hydrated")).toHaveTextContent("true");
	});

	it("accepts cookies through the store", () => {
		render(
			<CookieConsentStoreProvider>
				<StateConsumer />
			</CookieConsentStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-accept").click();
		});

		expect(screen.getByTestId("accepted")).toHaveTextContent("true");
		expect(screen.getByTestId("banner-visible")).toHaveTextContent("false");
	});

	it("rejects cookies through the store", () => {
		render(
			<CookieConsentStoreProvider>
				<StateConsumer />
			</CookieConsentStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-reject").click();
		});

		expect(screen.getByTestId("accepted")).toHaveTextContent("false");
		expect(screen.getByTestId("banner-visible")).toHaveTextContent("false");
	});

	it("resets consent through the store", () => {
		render(
			<CookieConsentStoreProvider>
				<StateConsumer />
			</CookieConsentStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-accept").click();
		});
		act(() => {
			screen.getByTestId("btn-reset").click();
		});

		expect(screen.getByTestId("accepted")).toHaveTextContent("null");
		expect(screen.getByTestId("banner-visible")).toHaveTextContent("true");
	});

	it("throws when useCookieConsentStore is used outside provider", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});

		expect(() => render(<StateConsumer />)).toThrow(
			"useCookieConsentStore must be used within CookieConsentStoreProvider",
		);

		spy.mockRestore();
	});
});

describe("useHasConsented", () => {
	it("returns false when no consent given", () => {
		render(
			<CookieConsentStoreProvider>
				<HasConsentedConsumer />
			</CookieConsentStoreProvider>,
		);

		expect(screen.getByTestId("has-consented")).toHaveTextContent("false");
	});

	it("returns true after accepting cookies", () => {
		render(
			<CookieConsentStoreProvider>
				<HasConsentedConsumer />
				<StateConsumer />
			</CookieConsentStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-accept").click();
		});

		expect(screen.getByTestId("has-consented")).toHaveTextContent("true");
	});
});
