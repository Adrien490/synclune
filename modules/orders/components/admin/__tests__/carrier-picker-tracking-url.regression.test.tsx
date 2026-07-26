/**
 * @regression carrier-picker-tracking-url
 *
 * Le picker de transporteur doit générer l'URL de suivi du transporteur
 * CHOISI, via `getTrackingUrl(carrier, number)`.
 *
 * Défaut d'origine (audit « Livraison et tracking » 2026-07-26, P0-3) :
 * `handleCarrierChange` appelait `detectCarrierAndUrl(trackingNumber)`, donc
 * re-dérivait le transporteur depuis le FORMAT du numéro en ignorant le choix
 * explicite de l'admin. Or `CARRIER_PATTERNS` ne connaît que 5 des 11
 * transporteurs (Chronopost, Colissimo, Lettre Suivie, Mondial Relay, DPD) :
 * GLS, DHL, UPS, FedEx et Relais Colis retombaient systématiquement sur
 * `autre` / `url: null`, le champ restait vide, et — combiné à la non-atteinte
 * du fallback serveur (P0-4) — l'email d'expédition partait SANS aucun lien de
 * suivi. `getTrackingUrl` gérait pourtant les 11 depuis toujours : il n'était
 * simplement jamais appelé depuis l'UI.
 *
 * ⚠️ `carrier.utils` n'est VOLONTAIREMENT pas mocké ici. Les suites voisines le
 * stubbent avec un `detectCarrierAndUrl` qui retourne toujours une URL, ce qui
 * rend le défaut structurellement invisible : c'est la couverture réelle de
 * `CARRIER_PATTERNS` qui est en cause, pas la plomberie du composant.
 */

import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MarkAsShippedDialog } from "../mark-as-shipped-dialog";

const { mockDialog, mockFormStore, mockFormHook, selectedCarrier } = vi.hoisted(() => ({
	mockDialog: {
		isOpen: true,
		data: { orderId: "order-1", orderNumber: "CMD-001" } as {
			orderId: string;
			orderNumber: string;
		} | null,
		open: vi.fn(),
		close: vi.fn(),
	},
	mockFormStore: {
		trackingNumber: "",
		carrier: "colissimo",
		trackingUrl: "",
		sendEmail: true,
		customUrlMode: false,
	},
	mockFormHook: {
		setFieldValue: vi.fn(),
		isPending: false,
		action: vi.fn(),
	},
	// Pilote la valeur émise par le Select mocké, test par test.
	selectedCarrier: { value: "ups" },
}));

vi.mock("@/shared/providers/alert-dialog-store-provider", () => ({
	useAlertDialog: () => mockDialog,
}));

vi.mock("@/modules/orders/hooks/use-mark-as-shipped-form", () => ({
	useMarkAsShippedForm: () => ({
		form: { store: {}, setFieldValue: mockFormHook.setFieldValue },
		action: mockFormHook.action,
		isPending: mockFormHook.isPending,
	}),
}));

vi.mock("@tanstack/react-form", () => ({
	useStore: (_store: unknown, selector: (s: unknown) => unknown) =>
		selector({ values: mockFormStore }),
}));

vi.mock("@/shared/components/responsive-dialog", () => ({
	ResponsiveDialog: ({ children, open }: { children: React.ReactNode; open: boolean }) =>
		open ? <div data-testid="dialog">{children}</div> : null,
	ResponsiveDialogContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogHeader: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	ResponsiveDialogTitle: ({ children }: { children: React.ReactNode }) => <h2>{children}</h2>,
	ResponsiveDialogDescription: ({ children }: { children: React.ReactNode }) => (
		<div>{children}</div>
	),
	ResponsiveDialogFooter: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({ children, onClick, disabled, type, ...props }: any) => (
		<button onClick={onClick} disabled={disabled} type={type} {...props}>
			{children}
		</button>
	),
}));

vi.mock("@/shared/components/ui/input", () => ({
	Input: ({ readOnly, ...props }: any) => <input readOnly={readOnly} {...props} />,
}));

vi.mock("@/shared/components/ui/label", () => ({
	Label: ({ children, ...props }: any) => <label {...props}>{children}</label>,
}));

vi.mock("@/shared/components/ui/checkbox", () => ({
	Checkbox: ({ id, checked, onCheckedChange, disabled }: any) => (
		<input
			type="checkbox"
			id={id}
			checked={checked}
			onChange={(e) => onCheckedChange?.(e.target.checked)}
			disabled={disabled}
		/>
	),
}));

vi.mock("@/shared/components/ui/select", () => ({
	Select: ({ children, onValueChange }: any) => (
		<button data-testid="select" onClick={() => onValueChange?.(selectedCarrier.value)}>
			{children}
		</button>
	),
	SelectContent: ({ children }: any) => <div>{children}</div>,
	SelectItem: ({ children, value }: any) => <option value={value}>{children}</option>,
	SelectTrigger: ({ children, id }: any) => <div id={id}>{children}</div>,
	SelectValue: ({ placeholder }: any) => <span>{placeholder}</span>,
}));

vi.mock("@/shared/components/required-fields-note", () => ({
	RequiredFieldsNote: () => <p>* Champs obligatoires</p>,
}));

vi.mock("lucide-react", () => {
	const stub = () => <svg />;
	return { Link2: stub, LoaderCircle: stub, Mail: stub, Truck: stub };
});

/** Numéro volontairement hors de tout `CARRIER_PATTERNS` connu. */
const UNRECOGNIZED_NUMBER = "1Z999AA10123456784";

async function pickCarrier(carrier: string) {
	selectedCarrier.value = carrier;
	render(<MarkAsShippedDialog />);
	await userEvent.click(screen.getByTestId("select"));
}

/** Dernière valeur écrite dans le champ `trackingUrl` du formulaire. */
function lastTrackingUrl(): string | undefined {
	const calls = mockFormHook.setFieldValue.mock.calls.filter(([field]) => field === "trackingUrl");
	return calls.at(-1)?.[1];
}

describe("carrier picker → tracking URL", () => {
	beforeEach(() => {
		mockDialog.isOpen = true;
		mockDialog.data = { orderId: "order-1", orderNumber: "CMD-001" };
		mockFormStore.trackingNumber = UNRECOGNIZED_NUMBER;
		mockFormStore.carrier = "colissimo";
		mockFormStore.trackingUrl = "";
		mockFormStore.customUrlMode = false;
		mockFormHook.setFieldValue.mockReset();
	});

	afterEach(cleanup);

	// Les 5 transporteurs absents de `CARRIER_PATTERNS` — le cœur du défaut.
	describe.each([
		["ups", "ups.com"],
		["dhl", "dhl.com"],
		["gls", "gls-group"],
		["fedex", "fedex.com"],
		["relais_colis", "relaiscolis"],
	])("transporteur non détectable par format : %s", (carrier, expectedHost) => {
		it("génère quand même une URL de suivi", async () => {
			await pickCarrier(carrier);

			const url = lastTrackingUrl();
			expect(url).toBeTruthy();
			expect(url).toContain(expectedHost);
			expect(url).toContain(UNRECOGNIZED_NUMBER);
		});
	});

	// Les 5 transporteurs détectables : le choix explicite doit primer sur la
	// détection. Un numéro de forme Colissimo + choix « Chronopost » doit donner
	// l'URL Chronopost, pas l'URL Colissimo déduite du format.
	it("respecte le choix explicite plutôt que le format du numéro", async () => {
		const colissimoShaped = "8N00234567890";
		mockFormStore.trackingNumber = colissimoShaped;

		await pickCarrier("chronopost");

		const url = lastTrackingUrl();
		expect(url).toContain("chronopost");
		expect(url).not.toContain("laposte");
	});

	it('vide l\'URL pour le transporteur "autre" (aucune URL connue)', async () => {
		await pickCarrier("autre");
		expect(lastTrackingUrl()).toBe("");
	});

	it("ne touche pas à l'URL en mode custom", async () => {
		mockFormStore.customUrlMode = true;
		await pickCarrier("ups");
		expect(lastTrackingUrl()).toBeUndefined();
	});

	it("ne génère pas d'URL sur un numéro trop court (< 8 caractères)", async () => {
		mockFormStore.trackingNumber = "123";
		await pickCarrier("ups");
		expect(lastTrackingUrl()).toBeUndefined();
	});
});
