/**
 * `OfflineQueueBanner` n'avait aucun test propre — et c'était le composant dont la
 * moitié des affordances était morte : aucun appelant ne fournissait `onDismiss`,
 * donc le bouton « Vider la file » et sa confirmation destructive n'étaient jamais
 * rendus, tandis que la copie promettait une reprise automatique que personne
 * n'avait branchée.
 */
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen, cleanup, fireEvent } from "@testing-library/react";

import { OfflineQueueBanner } from "../offline-queue-banner";

vi.mock("@/shared/hooks/use-haptic", () => ({
	useHaptic: () => () => undefined,
	triggerHaptic: () => undefined,
}));

vi.mock("@/shared/components/ui/responsive-alert-dialog", () => ({
	ResponsiveAlertDialog: ({ open, children }: { open: boolean; children: React.ReactNode }) =>
		open ? <div role="alertdialog">{children}</div> : null,
	ResponsiveAlertDialogContent: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResponsiveAlertDialogHeader: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResponsiveAlertDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveAlertDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<p>{children}</p>
	),
	ResponsiveAlertDialogFooter: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResponsiveAlertDialogCancel: ({ children }: { children: React.ReactNode }) => (
		<button type="button">{children}</button>
	),
	ResponsiveAlertDialogAction: ({
		children,
		onClick,
	}: {
		children: React.ReactNode;
		onClick?: () => void;
	}) => (
		<button type="button" onClick={onClick}>
			{children}
		</button>
	),
}));

afterEach(cleanup);

const MO = 1024 * 1024;

describe("rendu", () => {
	it("ne rend rien quand la file est vide", () => {
		const { container } = render(
			<OfflineQueueBanner queuedCount={0} isOffline onReplay={vi.fn()} />,
		);
		expect(container).toBeEmptyDOMElement();
	});

	it("annonce le nombre de fichiers en attente", () => {
		render(<OfflineQueueBanner queuedCount={2} isOffline onReplay={vi.fn()} />);
		expect(screen.getByText(/2 fichiers en attente de connexion/)).toBeInTheDocument();
	});

	it("affiche le volume retenu", () => {
		// Sans ce chiffre, l'utilisatrice ne sait pas ce que la file garde.
		render(
			<OfflineQueueBanner queuedCount={1} queuedBytes={12 * MO} isOffline onReplay={vi.fn()} />,
		);
		expect(screen.getByText(/12\.0 Mo/)).toBeInTheDocument();
	});

	it("affiche l'âge de la file au-delà d'une minute", () => {
		// `queuedAt` était stocké et jamais montré : rien ne distinguait une file
		// d'il y a trente secondes d'une file oubliée depuis trois jours.
		render(
			<OfflineQueueBanner
				queuedCount={1}
				oldestQueuedAt={Date.now() - 3 * 60 * 60 * 1000}
				isOffline
				onReplay={vi.fn()}
			/>,
		);
		expect(screen.getByText(/En attente depuis 3 h/)).toBeInTheDocument();
	});

	it("taît l'âge sous la minute", () => {
		render(
			<OfflineQueueBanner
				queuedCount={1}
				oldestQueuedAt={Date.now() - 5_000}
				isOffline
				onReplay={vi.fn()}
			/>,
		);
		expect(screen.queryByText(/En attente depuis/)).not.toBeInTheDocument();
	});

	it("est une région de statut vocalisée", () => {
		render(<OfflineQueueBanner queuedCount={1} isOffline onReplay={vi.fn()} />);
		expect(screen.getByRole("status")).toBeInTheDocument();
	});
});

describe("copie et comportement de reprise", () => {
	it("annonce une reprise automatique quand on est hors-ligne", () => {
		// ⚠️ Cette phrase n'est vraie que parce que les appelants passent
		// `autoReplayOnReconnect: true`. Elle a longtemps menti : l'option existait
		// avec un défaut `false` qu'aucune surface ne passait.
		render(<OfflineQueueBanner queuedCount={1} isOffline onReplay={vi.fn()} />);
		expect(screen.getByText(/reprendra tout seul/)).toBeInTheDocument();
	});

	it("désactive la relance tant qu'on est hors-ligne", () => {
		render(<OfflineQueueBanner queuedCount={1} isOffline onReplay={vi.fn()} />);
		expect(screen.getByRole("button", { name: /Relancer/ })).toBeDisabled();
	});

	it("relance à la demande une fois reconnecté", () => {
		const onReplay = vi.fn();
		render(<OfflineQueueBanner queuedCount={1} isOffline={false} onReplay={onReplay} />);

		fireEvent.click(screen.getByRole("button", { name: /Relancer/ }));

		expect(onReplay).toHaveBeenCalledTimes(1);
	});

	it("désactive les actions pendant un envoi", () => {
		render(<OfflineQueueBanner queuedCount={1} isOffline={false} onReplay={vi.fn()} disabled />);
		expect(screen.getByRole("button", { name: /Relancer/ })).toBeDisabled();
	});
});

describe("vidage de la file", () => {
	it("expose le bouton de vidage quand onDismiss est fourni", () => {
		// ⚠️ Aucun appelant ne le fournissait : le bouton ET sa confirmation étaient du
		// code mort, et une file bloquée laissait une bannière indéracinable.
		render(<OfflineQueueBanner queuedCount={1} isOffline onReplay={vi.fn()} onDismiss={vi.fn()} />);
		expect(screen.getByRole("button", { name: /Vider la file/ })).toBeInTheDocument();
	});

	it("n'expose rien quand onDismiss est absent", () => {
		render(<OfflineQueueBanner queuedCount={1} isOffline onReplay={vi.fn()} />);
		expect(screen.queryByRole("button", { name: /Vider la file/ })).not.toBeInTheDocument();
	});

	it("demande confirmation avant de vider", () => {
		const onDismiss = vi.fn();
		render(
			<OfflineQueueBanner queuedCount={2} isOffline onReplay={vi.fn()} onDismiss={onDismiss} />,
		);

		fireEvent.click(screen.getByRole("button", { name: /Vider la file/ }));

		// Le vidage est irréversible : il ne doit jamais partir sur un simple clic.
		expect(onDismiss).not.toHaveBeenCalled();
		expect(screen.getByRole("alertdialog")).toBeInTheDocument();
		expect(screen.getByText(/2 fichiers en attente seront retirés/)).toBeInTheDocument();
	});

	it("vide après confirmation", () => {
		const onDismiss = vi.fn();
		render(
			<OfflineQueueBanner queuedCount={1} isOffline onReplay={vi.fn()} onDismiss={onDismiss} />,
		);

		fireEvent.click(screen.getByRole("button", { name: /Vider la file/ }));
		fireEvent.click(screen.getByRole("button", { name: "Vider la file" }));

		expect(onDismiss).toHaveBeenCalledTimes(1);
	});
});
