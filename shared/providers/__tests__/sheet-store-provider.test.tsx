import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";

import { SheetStoreProvider, useSheet } from "../sheet-store-provider";

afterEach(cleanup);

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

describe("SheetStoreProvider", () => {
	it("provides a working store to consumers", () => {
		render(
			<SheetStoreProvider>
				<TestConsumer />
			</SheetStoreProvider>,
		);

		expect(screen.getByTestId("is-open")).toHaveTextContent("false");
	});

	it("opens sheet", () => {
		render(
			<SheetStoreProvider>
				<TestConsumer />
			</SheetStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-open").click();
		});

		expect(screen.getByTestId("is-open")).toHaveTextContent("true");
	});

	it("closes sheet", () => {
		render(
			<SheetStoreProvider>
				<TestConsumer />
			</SheetStoreProvider>,
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
			<SheetStoreProvider>
				<TestConsumer />
			</SheetStoreProvider>,
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
			"useSheetStore must be used within SheetStoreProvider",
		);

		spy.mockRestore();
	});
});
