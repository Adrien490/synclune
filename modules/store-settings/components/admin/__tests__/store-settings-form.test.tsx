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
		updatedAt: new Date("2026-04-18T00:00:00Z"),
		announcementMessage: null,
		announcementLink: null,
		announcementStartsAt: null,
		announcementEndsAt: null,
		announcementIsActive: false,
		...overrides,
	};
}

describe("StoreSettingsForm", () => {
	// ─── OPEN ──────────────────────────────────────────────────────────────

	it("shows 'Ouverte' badge and 'Fermer' link when store is open", () => {
		render(<StoreSettingsForm settings={makeSettings()} />);

		expect(screen.getByText("Ouverte")).toBeInTheDocument();
		const link = screen.getByRole("link", { name: /Fermer la boutique/i });
		expect(link).toBeInTheDocument();
		expect(link).toHaveAttribute("href", "/admin/configuration/boutique/fermer");
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

	it("always mounts reopen dialog", () => {
		render(<StoreSettingsForm settings={makeSettings()} />);
		expect(screen.getByTestId("reopen-store-dialog")).toBeInTheDocument();
	});
});
