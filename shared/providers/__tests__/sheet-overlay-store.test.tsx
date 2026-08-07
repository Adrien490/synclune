import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";

const mockPathname = vi.fn(() => "/");
vi.mock("next/navigation", () => ({
	usePathname: () => mockPathname(),
}));

import {
	OverlayStoreProvider,
	SheetAutoCloseOnNavigation,
	useSheet,
} from "../overlay-store-provider";

afterEach(() => {
	cleanup();
	mockPathname.mockReturnValue("/");
});

function TestConsumer() {
	const sheet = useSheet("cart");
	return (
		<div>
			<span data-testid="is-open">{String(sheet.isOpen)}</span>
			<button data-testid="btn-open" onClick={sheet.open}>
				open
			</button>
			<button data-testid="btn-close" onClick={sheet.close}>
				close
			</button>
			<button data-testid="btn-toggle" onClick={sheet.toggle}>
				toggle
			</button>
		</div>
	);
}

describe("OverlayStoreProvider", () => {
	it("provides a working store to consumers", () => {
		render(
			<OverlayStoreProvider>
				<TestConsumer />
			</OverlayStoreProvider>,
		);

		expect(screen.getByTestId("is-open")).toHaveTextContent("false");
	});

	it("opens sheet", () => {
		render(
			<OverlayStoreProvider>
				<TestConsumer />
			</OverlayStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-open").click();
		});

		expect(screen.getByTestId("is-open")).toHaveTextContent("true");
	});

	it("closes sheet", () => {
		render(
			<OverlayStoreProvider>
				<TestConsumer />
			</OverlayStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-open").click();
		});
		act(() => {
			screen.getByTestId("btn-close").click();
		});

		expect(screen.getByTestId("is-open")).toHaveTextContent("false");
	});

	it("toggles sheet", () => {
		render(
			<OverlayStoreProvider>
				<TestConsumer />
			</OverlayStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-toggle").click();
		});
		expect(screen.getByTestId("is-open")).toHaveTextContent("true");

		act(() => {
			screen.getByTestId("btn-toggle").click();
		});
		expect(screen.getByTestId("is-open")).toHaveTextContent("false");
	});

	it("throws when useSheetStore is used outside provider", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});

		expect(() => render(<TestConsumer />)).toThrow(
			"Les hooks d'overlay doivent être utilisés dans un OverlayStoreProvider",
		);

		spy.mockRestore();
	});

	/**
	 * ⚠️ `SheetAutoCloseOnNavigation` est monté EXPLICITEMENT ici — il a quitté le
	 * provider le 2026-08-07. Dans le provider fusionné, il aurait imposé
	 * `usePathname()` à tout test montant l'`OverlayStoreProvider`, y compris ceux
	 * qui ne touchent qu'un dialog. Son montage réel vit dans `app/layout.tsx`.
	 */
	it("closes open sheet when pathname changes", () => {
		mockPathname.mockReturnValue("/");
		const { rerender } = render(
			<OverlayStoreProvider>
				<SheetAutoCloseOnNavigation />
				<TestConsumer />
			</OverlayStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-open").click();
		});
		expect(screen.getByTestId("is-open")).toHaveTextContent("true");

		mockPathname.mockReturnValue("/creations");
		rerender(
			<OverlayStoreProvider>
				<SheetAutoCloseOnNavigation />
				<TestConsumer />
			</OverlayStoreProvider>,
		);

		expect(screen.getByTestId("is-open")).toHaveTextContent("false");
	});
});
