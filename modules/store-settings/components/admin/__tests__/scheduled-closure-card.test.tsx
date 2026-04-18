import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

const mockOpen = vi.fn();

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: false,
		data: undefined,
		open: mockOpen,
		close: vi.fn(),
		clearData: vi.fn(),
	}),
}));

vi.mock("../cancel-scheduled-closure-dialog", () => ({
	CANCEL_SCHEDULED_CLOSURE_DIALOG_ID: "cancel-scheduled-closure",
	CancelScheduledClosureDialog: () => <div data-testid="cancel-dialog" />,
}));

import { ScheduledClosureCard } from "../scheduled-closure-card";

describe("ScheduledClosureCard", () => {
	const scheduledCloseAt = new Date("2026-06-15T08:00:00Z");
	const reopensAt = new Date("2026-06-22T08:00:00Z");

	it("renders the scheduled close date as a <time> element", () => {
		render(
			<ScheduledClosureCard
				scheduledCloseAt={scheduledCloseAt}
				closureMessage={null}
				reopensAt={null}
			/>,
		);

		const time = screen.getByRole("time");
		expect(time).toHaveAttribute("dateTime", scheduledCloseAt.toISOString());
	});

	it("renders the closure message when provided", () => {
		render(
			<ScheduledClosureCard
				scheduledCloseAt={scheduledCloseAt}
				closureMessage="Fermeture estivale"
				reopensAt={null}
			/>,
		);

		expect(screen.getByText("Fermeture estivale")).toBeInTheDocument();
		expect(screen.getByText(/Message prévu/i)).toBeInTheDocument();
	});

	it("does not render the message section when closureMessage is null", () => {
		render(
			<ScheduledClosureCard
				scheduledCloseAt={scheduledCloseAt}
				closureMessage={null}
				reopensAt={null}
			/>,
		);

		expect(screen.queryByText(/Message prévu/i)).not.toBeInTheDocument();
	});

	it("renders reopen date when provided", () => {
		render(
			<ScheduledClosureCard
				scheduledCloseAt={scheduledCloseAt}
				closureMessage={null}
				reopensAt={reopensAt}
			/>,
		);

		expect(screen.getByText(/Réouverture automatique/i)).toBeInTheDocument();
		const times = screen.getAllByRole("time");
		const reopenTime = times.find((t) => t.getAttribute("datetime") === reopensAt.toISOString());
		expect(reopenTime).toBeDefined();
	});

	it("opens cancel dialog when 'Annuler la programmation' is clicked", async () => {
		const user = userEvent.setup();
		render(
			<ScheduledClosureCard
				scheduledCloseAt={scheduledCloseAt}
				closureMessage="Test"
				reopensAt={null}
			/>,
		);

		await user.click(screen.getByRole("button", { name: /Annuler la programmation/i }));
		expect(mockOpen).toHaveBeenCalledTimes(1);
	});

	it("renders the cancel dialog component", () => {
		render(
			<ScheduledClosureCard
				scheduledCloseAt={scheduledCloseAt}
				closureMessage={null}
				reopensAt={null}
			/>,
		);
		expect(screen.getByTestId("cancel-dialog")).toBeInTheDocument();
	});

	it("displays 'À venir' badge", () => {
		render(
			<ScheduledClosureCard
				scheduledCloseAt={scheduledCloseAt}
				closureMessage={null}
				reopensAt={null}
			/>,
		);
		expect(screen.getByText("À venir")).toBeInTheDocument();
	});
});
