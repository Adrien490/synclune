import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, act, cleanup } from "@testing-library/react";

import { DialogStoreProvider, useDialog } from "../dialog-store-provider";

afterEach(cleanup);

function TestConsumer() {
	const dialog = useDialog("test-dialog");
	return (
		<div>
			<span data-testid="is-open">{String(dialog.isOpen)}</span>
			<span data-testid="data">{JSON.stringify(dialog.data ?? null)}</span>
			<button data-testid="btn-open" onClick={() => dialog.open({ name: "test" })}>
				open
			</button>
			<button data-testid="btn-close" onClick={() => dialog.close()}>
				close
			</button>
			<button data-testid="btn-toggle" onClick={() => dialog.toggle()}>
				toggle
			</button>
			<button data-testid="btn-clear" onClick={() => dialog.clearData()}>
				clear
			</button>
		</div>
	);
}

describe("DialogStoreProvider", () => {
	it("provides a working store to consumers", () => {
		render(
			<DialogStoreProvider>
				<TestConsumer />
			</DialogStoreProvider>,
		);

		expect(screen.getByTestId("is-open")).toHaveTextContent("false");
	});

	it("opens dialog with data", () => {
		render(
			<DialogStoreProvider>
				<TestConsumer />
			</DialogStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-open").click();
		});

		expect(screen.getByTestId("is-open")).toHaveTextContent("true");
		expect(screen.getByTestId("data")).toHaveTextContent('{"name":"test"}');
	});

	it("closes dialog", () => {
		render(
			<DialogStoreProvider>
				<TestConsumer />
			</DialogStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-open").click();
		});
		act(() => {
			screen.getByTestId("btn-close").click();
		});

		expect(screen.getByTestId("is-open")).toHaveTextContent("false");
	});

	it("toggles dialog", () => {
		render(
			<DialogStoreProvider>
				<TestConsumer />
			</DialogStoreProvider>,
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

	it("clears dialog data", () => {
		render(
			<DialogStoreProvider>
				<TestConsumer />
			</DialogStoreProvider>,
		);

		act(() => {
			screen.getByTestId("btn-open").click();
		});
		act(() => {
			screen.getByTestId("btn-clear").click();
		});

		expect(screen.getByTestId("data")).toHaveTextContent("null");
	});

	it("throws when useDialogStore is used outside provider", () => {
		const spy = vi.spyOn(console, "error").mockImplementation(() => {});

		expect(() => render(<TestConsumer />)).toThrow(
			"useDialogStore must be used within DialogStoreProvider",
		);

		spy.mockRestore();
	});
});
