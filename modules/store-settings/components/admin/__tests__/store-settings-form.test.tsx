import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(cleanup);

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => ({
		isOpen: false,
		data: undefined,
		open: vi.fn(),
		close: vi.fn(),
		clearData: vi.fn(),
	}),
}));

vi.mock("../close-store-dialog", () => ({
	CLOSE_STORE_DIALOG_ID: "close-store",
	CloseStoreDialog: () => <div data-testid="close-store-dialog" />,
}));

vi.mock("../reopen-store-dialog", () => ({
	REOPEN_STORE_DIALOG_ID: "reopen-store",
	ReopenStoreDialog: () => <div data-testid="reopen-store-dialog" />,
}));

vi.mock("../edit-closure-message-form", () => ({
	EditClosureMessageForm: ({ currentMessage }: { currentMessage: string }) => (
		<div data-testid="edit-closure-message-form">{currentMessage}</div>
	),
}));

vi.mock("../edit-reopens-at-form", () => ({
	EditReopensAtForm: () => <div data-testid="edit-reopens-at-form" />,
}));

vi.mock("../schedule-closure-form", () => ({
	ScheduleClosureForm: () => <div data-testid="schedule-closure-form" />,
}));

vi.mock("../scheduled-closure-card", () => ({
	ScheduledClosureCard: ({ scheduledCloseAt }: { scheduledCloseAt: Date }) => (
		<div data-testid="scheduled-closure-card">{scheduledCloseAt.toISOString()}</div>
	),
}));

import { StoreSettingsForm } from "../store-settings-form";

import type { StoreSettingsAdmin } from "../../../types/store-settings.types";

function makeSettings(overrides: Partial<StoreSettingsAdmin> = {}): StoreSettingsAdmin {
	return {
		id: "store-settings-singleton",
		isClosed: false,
		closureMessage: null,
		reopensAt: null,
		closedAt: null,
		closedBy: null,
		scheduledCloseAt: null,
		updatedAt: new Date("2026-04-18T00:00:00Z"),
		...overrides,
	};
}

describe("StoreSettingsForm", () => {
	// ─── OPEN, no scheduled ─────────────────────────────────────────────────

	it("shows 'Ouverte' badge and 'Fermer' button when store is open", () => {
		render(<StoreSettingsForm settings={makeSettings()} />);

		expect(screen.getByText("Ouverte")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Fermer la boutique/i })).toBeInTheDocument();
	});

	it("renders ScheduleClosureForm when open and no scheduled closure", () => {
		render(<StoreSettingsForm settings={makeSettings()} />);
		expect(screen.getByTestId("schedule-closure-form")).toBeInTheDocument();
		expect(screen.queryByTestId("scheduled-closure-card")).not.toBeInTheDocument();
	});

	// ─── OPEN, with scheduled ───────────────────────────────────────────────

	it("renders ScheduledClosureCard when open with scheduled closure", () => {
		const scheduledCloseAt = new Date("2026-05-01T10:00:00Z");
		render(<StoreSettingsForm settings={makeSettings({ scheduledCloseAt })} />);

		expect(screen.getByTestId("scheduled-closure-card")).toBeInTheDocument();
		expect(screen.queryByTestId("schedule-closure-form")).not.toBeInTheDocument();
	});

	// ─── CLOSED ─────────────────────────────────────────────────────────────

	it("shows 'Fermée' badge and 'Réouvrir' button when store is closed", () => {
		render(
			<StoreSettingsForm
				settings={makeSettings({
					isClosed: true,
					closureMessage: "Maintenance",
					closedAt: new Date("2026-04-15T08:00:00Z"),
					closedBy: "Adrien",
				})}
			/>,
		);

		expect(screen.getByText("Fermée")).toBeInTheDocument();
		expect(screen.getByRole("button", { name: /Réouvrir la boutique/i })).toBeInTheDocument();
	});

	it("renders both edit forms when closed", () => {
		render(
			<StoreSettingsForm
				settings={makeSettings({
					isClosed: true,
					closureMessage: "Maintenance",
				})}
			/>,
		);

		expect(screen.getByTestId("edit-closure-message-form")).toBeInTheDocument();
		expect(screen.getByTestId("edit-reopens-at-form")).toBeInTheDocument();
	});

	it("hides Programmation card when closed", () => {
		render(
			<StoreSettingsForm
				settings={makeSettings({
					isClosed: true,
					closureMessage: "Maintenance",
				})}
			/>,
		);

		expect(screen.queryByTestId("schedule-closure-form")).not.toBeInTheDocument();
		expect(screen.queryByTestId("scheduled-closure-card")).not.toBeInTheDocument();
	});

	it("displays closedBy and closedAt metadata when closed", () => {
		render(
			<StoreSettingsForm
				settings={makeSettings({
					isClosed: true,
					closureMessage: "Maintenance",
					closedAt: new Date("2026-04-15T08:00:00Z"),
					closedBy: "Adrien",
				})}
			/>,
		);

		expect(screen.getByText(/Fermée par/)).toBeInTheDocument();
		expect(screen.getByText("Adrien")).toBeInTheDocument();
	});

	// ─── Dialogs always mounted ─────────────────────────────────────────────

	it("always mounts close + reopen dialogs", () => {
		render(<StoreSettingsForm settings={makeSettings()} />);
		expect(screen.getByTestId("close-store-dialog")).toBeInTheDocument();
		expect(screen.getByTestId("reopen-store-dialog")).toBeInTheDocument();
	});
});
