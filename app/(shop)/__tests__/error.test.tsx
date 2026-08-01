import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@sentry/nextjs", () => ({
	captureException: vi.fn(),
}));

vi.mock("@/app/_components/not-found-content", () => ({
	NotFoundContent: ({
		title,
		description,
		actions,
	}: {
		emoji: React.ReactNode;
		title: React.ReactNode;
		description: React.ReactNode;
		actions: React.ReactNode;
	}) => (
		<div>
			{title}
			{description}
			{actions}
		</div>
	),
}));

vi.mock("next/link", () => ({
	default: ({ href, children }: { href: string; children: React.ReactNode }) => (
		<a href={href}>{children}</a>
	),
}));

import * as Sentry from "@sentry/nextjs";
import ShopError from "../error";

describe("ShopError", () => {
	const error = new Error("Test error") as Error & { digest?: string };
	const reset = vi.fn();

	afterEach(() => {
		cleanup();
		vi.clearAllMocks();
	});

	it("reports error to Sentry on mount", () => {
		render(<ShopError error={error} reset={reset} />);
		expect(Sentry.captureException).toHaveBeenCalledWith(error);
	});

	it("renders error heading", () => {
		render(<ShopError error={error} reset={reset} />);
		expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
			/quelque chose s'est mal passé/i,
		);
	});

	it("renders retry button that calls reset", async () => {
		render(<ShopError error={error} reset={reset} />);
		await userEvent.click(screen.getByRole("button", { name: /réessayer/i }));
		expect(reset).toHaveBeenCalledOnce();
	});

	it("renders link back to home", () => {
		render(<ShopError error={error} reset={reset} />);
		expect(screen.getByRole("link", { name: /retour/i })).toHaveAttribute("href", "/");
	});
});
