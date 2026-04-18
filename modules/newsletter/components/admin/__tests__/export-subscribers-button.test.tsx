import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { mockToast } = vi.hoisted(() => {
	const toast = {
		success: vi.fn(),
		error: vi.fn(),
		promise: vi.fn(
			(
				promise: Promise<unknown>,
				opts: {
					loading?: string;
					success?: string | ((d: unknown) => string);
					error?: string | ((e: unknown) => string);
				},
			) => {
				promise.then(
					(data) => {
						const msg = typeof opts.success === "function" ? opts.success(data) : opts.success;
						if (msg) toast.success(msg);
					},
					(err) => {
						const msg = typeof opts.error === "function" ? opts.error(err) : opts.error;
						if (msg) toast.error(msg);
					},
				);
				return "toast-id";
			},
		),
	};
	return { mockToast: toast };
});

vi.mock("@/shared/utils/toast", () => ({ toast: mockToast }));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		onClick,
		disabled,
		...rest
	}: {
		children: React.ReactNode;
		onClick: () => void;
		disabled?: boolean;
		[key: string]: unknown;
	}) => (
		<button type="button" onClick={onClick} disabled={disabled} {...rest}>
			{children}
		</button>
	),
}));

import { ExportSubscribersButton } from "../export-subscribers-button";

afterEach(() => {
	cleanup();
	vi.unstubAllGlobals();
});

describe("ExportSubscribersButton", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		// jsdom polyfills for blob URL
		vi.stubGlobal("URL", {
			...URL,
			createObjectURL: vi.fn(() => "blob:mock-url"),
			revokeObjectURL: vi.fn(),
		});
	});

	it("renders default 'Exporter CSV' label", () => {
		render(<ExportSubscribersButton />);

		expect(screen.getByRole("button", { name: /Exporter CSV/i })).toBeInTheDocument();
	});

	it("on success: calls fetch and shows success toast", async () => {
		const blob = new Blob(["csv-data"], { type: "text/csv" });
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(blob, {
				status: 200,
				headers: { "Content-Disposition": 'attachment; filename="abos.csv"' },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		render(<ExportSubscribersButton />);

		await userEvent.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(mockToast.success).toHaveBeenCalledWith("Export téléchargé");
		});
		expect(fetchMock).toHaveBeenCalledWith("/api/admin/newsletter/export");
	});

	it("on HTTP error with JSON body: shows server error message", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response(JSON.stringify({ error: "Erreur custom server" }), {
				status: 500,
				headers: { "Content-Type": "application/json" },
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		render(<ExportSubscribersButton />);

		await userEvent.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith("Erreur custom server");
		});
	});

	it("on HTTP error without parseable body: shows fallback message", async () => {
		const fetchMock = vi.fn().mockResolvedValue(
			new Response("not-json", {
				status: 500,
			}),
		);
		vi.stubGlobal("fetch", fetchMock);

		render(<ExportSubscribersButton />);

		await userEvent.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith("Erreur lors de l'export");
		});
	});

	it("on network error: shows fallback error toast", async () => {
		const fetchMock = vi.fn().mockRejectedValue(new Error("Network down"));
		vi.stubGlobal("fetch", fetchMock);

		render(<ExportSubscribersButton />);

		await userEvent.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(mockToast.error).toHaveBeenCalledWith("Erreur lors de l'export");
		});
	});

	it("disables button while exporting (in-flight)", async () => {
		let resolveFetch: (r: Response) => void = () => undefined;
		const fetchMock = vi.fn(
			() =>
				new Promise<Response>((resolve) => {
					resolveFetch = resolve;
				}),
		);
		vi.stubGlobal("fetch", fetchMock);

		render(<ExportSubscribersButton />);

		const btn = screen.getByRole("button");
		await userEvent.click(btn);

		expect(btn).toBeDisabled();

		// Resolve to clean up
		resolveFetch(new Response(new Blob(), { status: 200 }));
		await waitFor(() => {
			expect(btn).not.toBeDisabled();
		});
	});

	it("falls back to default filename when Content-Disposition is missing", async () => {
		const blob = new Blob(["csv"]);
		const fetchMock = vi.fn().mockResolvedValue(new Response(blob, { status: 200 }));
		vi.stubGlobal("fetch", fetchMock);
		const clickSpy = vi.fn();
		const origCreate = document.createElement.bind(document);
		vi.spyOn(document, "createElement").mockImplementation((tag: string) => {
			const el = origCreate(tag);
			if (tag === "a") {
				(el as HTMLAnchorElement).click = clickSpy;
			}
			return el;
		});

		render(<ExportSubscribersButton />);

		await userEvent.click(screen.getByRole("button"));

		await waitFor(() => {
			expect(clickSpy).toHaveBeenCalled();
		});
	});
});
