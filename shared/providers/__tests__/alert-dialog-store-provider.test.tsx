import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";

import { AlertDialogStoreProvider, useAlertDialog } from "../alert-dialog-store-provider";

afterEach(cleanup);

function TestConsumer() {
	const dialog = useAlertDialog("delete-item");
	return (
		<div>
			<span data-testid="is-open">{String(dialog.isOpen)}</span>
			<span data-testid="data">{JSON.stringify(dialog.data ?? null)}</span>
			<button
				data-testid="btn-open"
				onClick={() => dialog.open({ itemId: "123", itemName: "Bracelet" })}
			>
				open
			</button>
			<button data-testid="btn-close" onClick={() => dialog.close()}>
				close
			</button>
			<button data-testid="btn-clear" onClick={() => dialog.clearData()}>
				clear
			</button>
		</div>
	);
}

describe("AlertDialogStoreProvider", () => {
	it("provides a working store to consumers", () => {
		render(
			<AlertDialogStoreProvider>
				<TestConsumer />
			</AlertDialogStoreProvider>,
		);

		expect(screen.getByTestId("is-open")).toHaveTextContent("false");
	});

	it("opens alert dialog with data", () => {
		render(
			<AlertDialogStoreProvider>
				<TestConsumer />
			</AlertDialogStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-open").click();
		});

		expect(screen.getByTestId("is-open")).toHaveTextContent("true");
		expect(screen.getByTestId("data")).toHaveTextContent('"itemId":"123"');
		expect(screen.getByTestId("data")).toHaveTextContent('"itemName":"Bracelet"');
	});

	it("closes alert dialog preserving data", () => {
		render(
			<AlertDialogStoreProvider>
				<TestConsumer />
			</AlertDialogStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-open").click();
		});
		act(() => {
			screen.getByTestId("btn-close").click();
		});

		expect(screen.getByTestId("is-open")).toHaveTextContent("false");
		expect(screen.getByTestId("data")).toHaveTextContent('"itemId":"123"');
	});

	it("clears alert dialog data", () => {
		render(
			<AlertDialogStoreProvider>
				<TestConsumer />
			</AlertDialogStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-open").click();
		});
		act(() => {
			screen.getByTestId("btn-clear").click();
		});

		expect(screen.getByTestId("data")).toHaveTextContent("null");
	});

	it("throws when useAlertDialogStore is used outside provider", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});

		expect(() => render(<TestConsumer />)).toThrow(
			"useAlertDialogStore must be used within AlertDialogStoreProvider",
		);

		spy.mockRestore();
	});
});
