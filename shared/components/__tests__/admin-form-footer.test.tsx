import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AdminFormFooter } from "../admin-form-footer";

// Mock `cn` to a plain string-join so className assertions are deterministic.
vi.mock("@/shared/utils/cn", () => ({
	cn: (...args: unknown[]) =>
		args
			.flat()
			.filter((a): a is string => typeof a === "string" && a.length > 0)
			.join(" "),
}));

afterEach(cleanup);

/** The footer root `<div>` is the parent of the always-rendered status region. */
function getFooterRoot() {
	return screen.getByRole("status").parentElement as HTMLElement;
}

describe("AdminFormFooter", () => {
	describe("children", () => {
		it("renders its children", () => {
			render(
				<AdminFormFooter>
					<button type="submit">Enregistrer</button>
				</AdminFormFooter>,
			);

			expect(screen.getByRole("button", { name: "Enregistrer" })).toBeInTheDocument();
		});
	});

	describe("live region", () => {
		it("always mounts a polite sr-only status region", () => {
			render(<AdminFormFooter />);

			const status = screen.getByRole("status");
			expect(status).toBeInTheDocument();
			expect(status).toHaveAttribute("aria-live", "polite");
			expect(status).toHaveClass("sr-only");
		});

		it("keeps the status region empty when not pending", () => {
			render(<AdminFormFooter />);
			expect(screen.getByRole("status")).toHaveTextContent("");
		});

		it("keeps the status region empty when pending is false", () => {
			render(<AdminFormFooter pending={false} pendingMessage="Création…" />);
			expect(screen.getByRole("status")).toHaveTextContent("");
		});

		it("announces the default message when pending", () => {
			render(<AdminFormFooter pending />);
			expect(screen.getByRole("status")).toHaveTextContent("Envoi du formulaire en cours…");
		});

		it("announces a custom pendingMessage when provided", () => {
			render(<AdminFormFooter pending pendingMessage="Publication…" />);
			expect(screen.getByRole("status")).toHaveTextContent("Publication…");
		});
	});

	describe("props forwarding", () => {
		it("merges a custom className onto the root", () => {
			render(<AdminFormFooter className="mt-2" />);
			expect(getFooterRoot()).toHaveClass("mt-2");
		});

		it("forwards arbitrary HTML attributes to the root", () => {
			render(<AdminFormFooter id="checkout-footer" data-section="actions" />);

			const root = getFooterRoot();
			expect(root).toHaveAttribute("id", "checkout-footer");
			expect(root).toHaveAttribute("data-section", "actions");
		});
	});

	describe("layout classes", () => {
		it("is a sticky, borderless bar on mobile", () => {
			render(<AdminFormFooter />);

			const root = getFooterRoot();
			expect(root).toHaveClass("sticky");
			expect(root).not.toHaveClass("border-t");
			expect(root).toHaveClass("backdrop-blur-md");
		});

		it("resets to a static, transparent wrapper on desktop", () => {
			render(<AdminFormFooter />);

			const root = getFooterRoot();
			expect(root).toHaveClass("md:static");
			expect(root).toHaveClass("md:bg-transparent");
		});
	});
});
