import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { renderPropMock, type RenderPropMockProps } from "@/test/mocks/render-prop";

// ============================================================================
// Hoisted mocks
// ============================================================================

const { mockUseCreateProductForm, mockUseMediaUpload, mockUseRouter, mockToast } = vi.hoisted(
	() => ({
		mockUseCreateProductForm: vi.fn(),
		mockUseMediaUpload: vi.fn(),
		mockUseRouter: vi.fn(),
		mockToast: { success: vi.fn(), warning: vi.fn(), error: vi.fn() },
	}),
);

vi.mock("@/modules/products/hooks/use-create-product-form", () => ({
	useCreateProductForm: mockUseCreateProductForm,
}));

vi.mock("@/modules/media/hooks/use-media-upload", () => ({
	useMediaUpload: mockUseMediaUpload,
}));

vi.mock("@/modules/media/utils/uploadthing", () => ({
	UploadDropzone: (props: Record<string, unknown>) => (
		<div data-testid="upload-dropzone" data-endpoint={props.endpoint} />
	),
}));

vi.mock("next/navigation", () => ({
	useRouter: mockUseRouter,
}));

vi.mock("sonner", () => ({
	toast: mockToast,
}));

vi.mock("@/shared/providers/dialog-store-provider", () => ({
	useDialog: () => ({
		open: vi.fn(),
		close: vi.fn(),
		isOpen: false,
	}),
}));

vi.mock("@/modules/product-types/components/product-type-form-dialog", () => ({
	PRODUCT_TYPE_DIALOG_ID: "product-type-form",
	ProductTypeFormDialog: () => null,
}));

vi.mock("@/modules/colors/components/color-form-dialog", () => ({
	COLOR_DIALOG_ID: "color-form",
	ColorFormDialog: () => null,
}));

vi.mock("@/modules/materials/components/material-form-dialog", () => ({
	MATERIAL_DIALOG_ID: "material-form",
	MaterialFormDialog: () => null,
}));

vi.mock("@/modules/collections/components/admin/collection-form-dialog", () => ({
	COLLECTION_DIALOG_ID: "collection-form",
	CollectionFormDialog: () => null,
}));

vi.mock("@/shared/components/forms", () => ({
	FieldLabel: ({ children, ...props }: { children: React.ReactNode }) => (
		<label {...props}>{children}</label>
	),
}));

vi.mock("@/shared/components/media-upload/media-counter-badge", () => ({
	MediaCounterBadge: ({ count, max }: { count: number; max: number }) => (
		<span data-testid="media-counter">
			{count}/{max}
		</span>
	),
}));

vi.mock("@/shared/components/media-upload/media-upload-grid", () => ({
	MediaUploadGrid: () => <div data-testid="media-upload-grid" />,
}));

vi.mock("@/shared/components/ui/button", () => ({
	Button: ({
		children,
		...props
	}: {
		children: React.ReactNode;
		type?: "button" | "submit" | "reset";
		disabled?: boolean;
	}) => <button {...props}>{children}</button>,
}));

vi.mock("@/shared/components/ui/input-group", () => ({
	InputGroupAddon: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
	InputGroupText: ({ children }: { children: React.ReactNode }) => <span>{children}</span>,
}));

vi.mock("@/shared/components/ui/tooltip", () => ({
	Tooltip: ({ children }: { children: React.ReactNode }) => <>{children}</>,
	TooltipContent: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	TooltipTrigger: (props: RenderPropMockProps) => renderPropMock("div", props),
}));

vi.mock("@/shared/components/multi-select", () => ({
	MultiSelect: () => <div data-testid="multi-select" />,
}));

vi.mock("@/modules/colors/components/admin/color-multi-select-field", () => ({
	ColorMultiSelectField: () => (
		<div data-testid="color-multi-select-field">
			<label htmlFor="mock-color-select">Couleur</label>
			<input id="mock-color-select" type="text" readOnly />
			<button type="button" aria-label="Créer une nouvelle couleur">
				+
			</button>
		</div>
	),
}));

vi.mock("@/modules/materials/components/admin/material-multi-select-field", () => ({
	MaterialMultiSelectField: () => (
		<div data-testid="material-multi-select-field">
			<label htmlFor="mock-material-select">Matériau</label>
			<input id="mock-material-select" type="text" readOnly />
			<button type="button" aria-label="Créer un nouveau matériau">
				+
			</button>
		</div>
	),
}));

vi.mock("@/shared/components/ui/alert", () => ({
	Alert: ({
		children,
		"data-slot": dataSlot,
		...props
	}: {
		children: React.ReactNode;
		"data-slot"?: string;
	}) => (
		// Le `data-slot` distingue les alerts métier (`publication-warning`)
		// de l'éventuel global form-error alert : on n'ajoute le testid que sur ce dernier.
		<div data-testid={dataSlot ? undefined : "form-alert"} data-slot={dataSlot} {...props}>
			{children}
		</div>
	),
	AlertDescription: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
	AlertTitle: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ============================================================================
// Imports (after mocks)
// ============================================================================

import { CreateProductForm } from "../create-product-form";
import { ActionStatus } from "@/shared/types/server-action";

// ============================================================================
// Fixtures
// ============================================================================

const defaultProps = {
	productTypes: [
		{ id: "type-1", label: "Bague" },
		{ id: "type-2", label: "Collier" },
	],
	collections: [
		{ id: "col-1", name: "Collection Lune" },
		{ id: "col-2", name: "Collection Étoile" },
	],
	colors: [
		{ id: "color-1", name: "Or", hex: "#FFD700" },
		{ id: "color-2", name: "Argent", hex: "#C0C0C0" },
	],
	materials: [
		{ id: "mat-1", name: "Argent 925" },
		{ id: "mat-2", name: "Plaqué or" },
	],
};

interface FormOverrides {
	canSubmit?: boolean;
	isValid?: boolean;
	status?: string;
	title?: string;
	collectionIds?: string[];
	initialSku?: {
		media?: Array<{
			url: string;
			mediaType: "IMAGE" | "VIDEO";
			altText?: string;
			thumbnailUrl?: string;
			blurDataUrl?: string;
		}>;
		colorId?: string;
		materialIds?: string[];
		size?: string;
		priceInclTaxEuros?: number;
		compareAtPriceEuros?: number;
		inventory?: number;
	};
}

/**
 * État d'un bijou prêt à partir en boutique.
 *
 * La règle d'établi dérive le libellé de son bouton des VALEURS du formulaire, pas
 * de `canSubmit` : les validateurs TanStack ne tournent qu'au `onChange`, donc au
 * montage un formulaire vide est encore « valide ». Sans photo, sans titre et sans
 * prix, le bouton annonce ce qui manque — d'où ce jeu de valeurs complet pour
 * tester les libellés nominaux.
 */
const COMPLETE_FORM: FormOverrides = {
	title: "Bracelet Marée basse",
	initialSku: {
		media: [{ url: "https://example.com/bracelet.jpg", mediaType: "IMAGE" as const }],
		priceInclTaxEuros: 38,
		inventory: 4,
	},
};

function createMockForm(overrides: FormOverrides = {}) {
	const fieldStub = {
		name: "test",
		state: { value: "", meta: { errors: [] } },
		handleChange: vi.fn(),
		handleBlur: vi.fn(),
		InputField: () => <input />,
		TextareaField: () => <textarea />,
		SelectField: () => <select />,
		InputGroupField: ({ children }: { children?: React.ReactNode }) => (
			<div>
				<input />
				{children}
			</div>
		),
		// Le stub expose `disabled` et le nom accessible : la barre d'établi vit HORS
		// du <fieldset disabled> de la colonne, donc c'est le seul endroit où l'on
		// peut vérifier qu'elle se grise bien pendant l'envoi.
		RadioGroupField: (props: { "aria-label"?: string; disabled?: boolean }) => (
			<div
				data-testid="radio-group-field"
				data-disabled={props.disabled ? "" : undefined}
				aria-label={props["aria-label"]}
			/>
		),
	};

	const defaultInitialSku = {
		media: [],
		colorId: "",
		materialIds: [],
		size: "",
		priceInclTaxEuros: 0,
		compareAtPriceEuros: undefined,
		inventory: 0,
	};

	const formState = {
		values: {
			title: overrides.title ?? "",
			description: "",
			typeId: "",
			collectionIds: overrides.collectionIds ?? [],
			status: overrides.status ?? "PUBLIC",
			initialSku: {
				...defaultInitialSku,
				...overrides.initialSku,
			},
		},
		canSubmit: overrides.canSubmit ?? true,
		isValid: overrides.isValid ?? true,
		isSubmitting: false,
	};

	return {
		state: formState,
		handleSubmit: vi.fn().mockResolvedValue(undefined),
		reset: vi.fn(),
		setFieldValue: vi.fn(),
		Subscribe: ({
			children,
			selector,
		}: {
			children: (values: unknown[]) => React.ReactNode;
			selector: (state: Record<string, unknown>) => unknown[];
		}) => {
			const vals = selector(formState);
			return <>{children(vals)}</>;
		},
		Field: ({ children }: { children: (field: typeof fieldStub) => React.ReactNode }) => {
			return (
				<>
					{children({
						...fieldStub,
						name: "initialSku.media",
						state: { value: formState.values.initialSku.media, meta: { errors: [] } },
						pushValue: vi.fn(),
						removeValue: vi.fn(),
					} as unknown as typeof fieldStub)}
				</>
			);
		},
		AppField: ({ children }: { children: (field: typeof fieldStub) => React.ReactNode }) => {
			return <>{children(fieldStub)}</>;
		},
		// Ni `AppForm` ni `SubmitButton` : la barre d'établi a délibérément divergé du
		// bouton partagé (cf. sa dérogation commentée), donc plus rien ici ne consomme
		// le `formContext`. Les garder stubés laisserait croire au lecteur que le
		// composant s'appuie encore dessus.
	};
}

// ============================================================================
// Tests
// ============================================================================

afterEach(cleanup);

describe("CreateProductForm", () => {
	function setup(formOverrides: FormOverrides = {}, hookOverrides: Record<string, unknown> = {}) {
		const mockForm = createMockForm(formOverrides);
		const action = vi.fn();

		mockUseCreateProductForm.mockReturnValue({
			form: mockForm,
			action,
			isPending: false,
			formErrors: [],
			...hookOverrides,
		});

		mockUseMediaUpload.mockReturnValue({
			upload: vi.fn(),
			isUploading: false,
			progress: null,
			failedFiles: [],
			cancel: vi.fn(),
			retryFailed: vi.fn(),
			clearFailed: vi.fn(),
		});

		const routerPush = vi.fn();
		mockUseRouter.mockReturnValue({
			push: routerPush,
			refresh: vi.fn(),
		});

		return { mockForm, action, routerPush };
	}

	// --------------------------------------------------------------------------
	// Rendering
	// --------------------------------------------------------------------------

	describe("rendering", () => {
		it("renders the form with accessible label", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("form")).toHaveAttribute(
				"aria-label",
				"Formulaire de création de bijou",
			);
		});

		it("renders media section with label", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Les photos")).toBeInTheDocument();
		});

		it("renders media counter badge", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByTestId("media-counter")).toBeInTheDocument();
		});

		it("renders the native dropzone when no media", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /Zone d'envoi des médias du bijou/i }),
			).toBeInTheDocument();
		});

		it("renders price fields", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Prix de vente final")).toBeInTheDocument();
			expect(screen.getByText("Ancien prix (affiché barré)")).toBeInTheDocument();
		});

		it("renders stock field", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Quantité en stock")).toBeInTheDocument();
		});

		it("renders variant attributes inside the « Le bijou » section", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			// À la création il n'existe qu'une variante : ses attributs ont rejoint la
			// pièce elle-même plutôt que d'occuper une carte séparée.
			expect(screen.getByText("Le bijou")).toBeInTheDocument();
			expect(screen.getByText("Couleur")).toBeInTheDocument();
			expect(screen.getByText("Matériau")).toBeInTheDocument();
		});

		it("renders sr-only status for screen readers", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("status")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Submit buttons
	// --------------------------------------------------------------------------

	describe("submit button", () => {
		it("annonce ce qui manque tant que la pièce est incomplète", () => {
			// État par défaut du mock : ni photo, ni titre, ni prix.
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: "Ajoute une photo" })).toBeInTheDocument();
			expect(screen.queryByText("Publier le bijou")).not.toBeInTheDocument();
		});

		it("réclame le titre une fois la photo ajoutée", () => {
			setup({
				initialSku: { media: [{ url: "https://example.com/a.jpg", mediaType: "IMAGE" as const }] },
			});
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: "Il manque le titre" })).toBeInTheDocument();
		});

		it("renders single submit button with PUBLIC label when complete", () => {
			setup(COMPLETE_FORM);
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: "Publier le bijou" })).toBeInTheDocument();
			expect(screen.queryByText("Enregistrer le brouillon")).not.toBeInTheDocument();
		});

		it("renders submit button with DRAFT label when status=DRAFT", () => {
			setup({ ...COMPLETE_FORM, status: "DRAFT" });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: "Enregistrer le brouillon" })).toBeInTheDocument();
			expect(screen.queryByText("Publier le bijou")).not.toBeInTheDocument();
		});

		/**
		 * ⚠️ Test INVERSÉ (audit 2026-08-04). Il assertait `toBeDisabled()` et
		 * verrouillait ainsi le défaut : `canSubmit` bascule à `false` dès le premier
		 * envoi raté, ce qui sortait de l'ordre de tabulation le SEUL endroit qui dit
		 * ce qui manque (le libellé du bouton). Un formulaire incomplet doit rester
		 * soumettable — c'est la soumission qui déclenche validation puis focus.
		 */
		it("reste soumettable quand le formulaire est incomplet — le libellé doit rester atteignable", () => {
			setup({ ...COMPLETE_FORM, canSubmit: false });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: /brouillon|publier/i })).not.toBeDisabled();
		});

		it("disables submit button when pending (PUBLIC)", () => {
			setup({}, { isPending: true });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: /publication/i })).toBeDisabled();
		});

		it("disables submit button when pending (DRAFT)", () => {
			setup({ status: "DRAFT" }, { isPending: true });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: /enregistrement/i })).toBeDisabled();
		});

		it("shows pending state announcement for screen readers", () => {
			setup({}, { isPending: true });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("status")).toHaveTextContent("Envoi du formulaire en cours…");
		});

		it("disables submit button when media is uploading", () => {
			setup();
			mockUseMediaUpload.mockReturnValue({
				upload: vi.fn(),
				isUploading: true,
				progress: { phase: "uploading", completed: 0, total: 1, current: "file.jpg" },
				failedFiles: [],
				cancel: vi.fn(),
				retryFailed: vi.fn(),
				clearFailed: vi.fn(),
			});
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: /téléversement/i })).toBeDisabled();
		});
	});

	// --------------------------------------------------------------------------
	// Upload progress
	// --------------------------------------------------------------------------

	describe("upload progress", () => {
		it("shows upload progress when uploading", () => {
			setup();
			mockUseMediaUpload.mockReturnValue({
				upload: vi.fn(),
				isUploading: true,
				progress: { phase: "uploading", completed: 1, total: 3, current: "image.jpg" },
				failedFiles: [],
				cancel: vi.fn(),
				retryFailed: vi.fn(),
				clearFailed: vi.fn(),
			});
			render(<CreateProductForm {...defaultProps} />);

			const statusElements = screen.getAllByRole("status");
			expect(statusElements.some((el) => /Envoi/.test(String(el.textContent)))).toBe(true);
		});

		it("shows thumbnail generation phase text", () => {
			setup();
			mockUseMediaUpload.mockReturnValue({
				upload: vi.fn(),
				isUploading: true,
				progress: { phase: "generating-thumbnails", completed: 0, total: 1, current: null },
				failedFiles: [],
				cancel: vi.fn(),
				retryFailed: vi.fn(),
				clearFailed: vi.fn(),
			});
			render(<CreateProductForm {...defaultProps} />);

			const statusElements = screen.getAllByRole("status");
			expect(
				statusElements.some((el) => /Préparation des aperçus/.test(String(el.textContent))),
			).toBe(true);
		});
	});

	// --------------------------------------------------------------------------
	// Media limit
	// --------------------------------------------------------------------------

	describe("media limit", () => {
		it("renders info text about first image requirement", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(
				screen.getByText(
					"La première image sera l'image principale. Glisse-dépose pour réorganiser.",
				),
			).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Form errors
	// --------------------------------------------------------------------------

	describe("server errors", () => {
		// createToastCallbacks supprime les VALIDATION_ERROR du toast : sans alerte
		// globale, une erreur serveur non mappée à un champ disparaissait en silence.
		it("renders a global alert for a server VALIDATION_ERROR", () => {
			setup(
				{},
				{ state: { status: ActionStatus.VALIDATION_ERROR, message: "Le titre est déjà utilisé" } },
			);
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByTestId("form-alert")).toHaveTextContent("Le titre est déjà utilisé");
		});

		it("renders no global alert on SUCCESS or ERROR states (toast handles those)", () => {
			setup({}, { state: { status: ActionStatus.ERROR, message: "Erreur serveur" } });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.queryByTestId("form-alert")).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Fieldset disabled state
	// --------------------------------------------------------------------------

	describe("fieldset disabled state", () => {
		it("fieldset is not disabled when not pending", () => {
			setup({}, { isPending: false });
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const fieldset = container.querySelector("fieldset");
			expect(fieldset).not.toBeDisabled();
		});

		it("fieldset is disabled when isPending", () => {
			setup({}, { isPending: true });
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const fieldset = container.querySelector("fieldset");
			expect(fieldset).toBeDisabled();
		});
	});

	// --------------------------------------------------------------------------
	// Hidden inputs
	// --------------------------------------------------------------------------

	describe("hidden inputs", () => {
		it("renders hidden input for status with default PUBLIC value", () => {
			setup();
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const statusInput = container.querySelector('input[name="status"]');
			expect(statusInput).toBeInTheDocument();
			expect(statusInput).toHaveAttribute("value", "PUBLIC");
		});

		it("renders hidden input for status with DRAFT value", () => {
			setup({ status: "DRAFT" });
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const statusInput = container.querySelector('input[name="status"]');
			expect(statusInput).toHaveAttribute("value", "DRAFT");
		});

		it("renders hidden input for collectionIds as serialized JSON", () => {
			setup({ collectionIds: ["col-1", "col-2"] });
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const collectionsInput = container.querySelector('input[name="collectionIds"]');
			expect(collectionsInput).toBeInTheDocument();
			expect(collectionsInput).toHaveAttribute("value", JSON.stringify(["col-1", "col-2"]));
		});

		it("renders hidden input for empty collectionIds", () => {
			setup({ collectionIds: [] });
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const collectionsInput = container.querySelector('input[name="collectionIds"]');
			expect(collectionsInput).toHaveAttribute("value", "[]");
		});

		it("does not render media hidden input when no media", () => {
			setup();
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const mediaInput = container.querySelector('input[name="initialSku.media"]');
			expect(mediaInput).not.toBeInTheDocument();
		});

		it("does not render deletedImageUrls hidden input when none deleted", () => {
			setup();
			const { container } = render(<CreateProductForm {...defaultProps} />);

			const deletedInput = container.querySelector('input[name="deletedImageUrls"]');
			expect(deletedInput).not.toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Layout sections
	// --------------------------------------------------------------------------

	// --------------------------------------------------------------------------
	// Règle d'établi
	// --------------------------------------------------------------------------

	describe("règle d'établi", () => {
		const bar = () => document.querySelector('[data-slot="etabli-bar"]');

		it("reste éteinte tant qu'il manque quelque chose", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(bar()).not.toHaveAttribute("data-ready");
		});

		it("s'allume dès que la pièce est complète", () => {
			setup(COMPLETE_FORM);
			render(<CreateProductForm {...defaultProps} />);

			expect(bar()).toHaveAttribute("data-ready");
		});

		it("n'écrit pas deux fois ce qui manque", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			// Le bouton porte le message ; le récapitulatif montre prix et stock.
			expect(screen.getByRole("button", { name: "Ajoute une photo" })).toBeInTheDocument();
			expect(screen.getAllByText(/Ajoute une photo/)).toHaveLength(1);
			expect(screen.getByText("Prix à définir")).toBeInTheDocument();
		});

		it("récapitule le prix et le stock une fois renseignés", () => {
			setup(COMPLETE_FORM);
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("38,00 €")).toBeInTheDocument();
			expect(screen.getByText(/4 en stock/)).toBeInTheDocument();
		});

		it("ne porte aucune région live — elle ânonnerait à chaque frappe", () => {
			setup(COMPLETE_FORM);
			render(<CreateProductForm {...defaultProps} />);

			expect(bar()?.querySelector("[aria-live]")).toBeNull();
		});

		it("nomme le groupe de visibilité et le grise pendant l'envoi", () => {
			// La barre est un frère du <fieldset disabled>, pas un descendant : sans
			// `disabled` explicite, la visibilité restait active pendant la soumission.
			setup(COMPLETE_FORM, { isPending: true });
			render(<CreateProductForm {...defaultProps} />);

			const radios = screen.getByTestId("radio-group-field");
			expect(radios).toHaveAttribute("data-disabled");
			expect(radios).toHaveAttribute("aria-label", "Visibilité");
		});

		it("laisse la visibilité active hors soumission", () => {
			setup(COMPLETE_FORM);
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByTestId("radio-group-field")).not.toHaveAttribute("data-disabled");
		});

		it("refuse de s'allumer quand la mise en vente serait rejetée", () => {
			// ⚠️ `initialSku` est REMPLACÉ, pas fusionné, par `setup` : sans réécrire
			// média et prix ici, la pièce serait incomplète et l'assertion passerait
			// pour une tout autre raison que celle qu'on prétend tester.
			setup({
				...COMPLETE_FORM,
				status: "PUBLIC",
				initialSku: { ...COMPLETE_FORM.initialSku, inventory: 0 },
			});
			render(<CreateProductForm {...defaultProps} />);

			// Tout le reste est rempli : seule la mise en vente à zéro stock bloque.
			// La barre s'allumait et proposait « Publier le bijou » pendant que
			// l'alerte annonçait, juste au-dessus, que le serveur refuserait.
			expect(bar()).not.toHaveAttribute("data-ready");
			expect(screen.getByRole("button", { name: "Renseigne le stock" })).toBeInTheDocument();
			expect(document.querySelector('[data-slot="publication-warning"]')).toBeInTheDocument();
		});

		it("s'allume pour un brouillon à zéro stock — rien ne part en boutique", () => {
			setup({
				...COMPLETE_FORM,
				status: "DRAFT",
				initialSku: { ...COMPLETE_FORM.initialSku, inventory: 0 },
			});
			render(<CreateProductForm {...defaultProps} />);

			expect(bar()).toHaveAttribute("data-ready");
			expect(document.querySelector('[data-slot="publication-warning"]')).toBeNull();
		});

		it("n'alerte pas quand le stock suit la mise en vente", () => {
			setup(COMPLETE_FORM);
			render(<CreateProductForm {...defaultProps} />);

			expect(document.querySelector('[data-slot="publication-warning"]')).toBeNull();
		});
	});

	describe("layout sections", () => {
		it("rend les trois sections de la colonne, et rien de plus", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Les photos")).toBeInTheDocument();
			expect(screen.getByText("Le bijou")).toBeInTheDocument();
			expect(screen.getByText("Le prix et le stock")).toBeInTheDocument();

			// Tarification, Stock et Variante ont fusionné : plus de cartes séparées.
			expect(screen.queryByText("Tarification")).not.toBeInTheDocument();
			expect(screen.queryByText("Variante")).not.toBeInTheDocument();
			expect(screen.queryByRole("region", { name: "Statut du bijou" })).not.toBeInTheDocument();
		});

		it("porte la visibilité sur la règle d'établi, pas dans une carte", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			// « En vente » remplace « Public » : le libellé se suffit désormais à
			// lui-même, ce que l'ancienne note d'aide compensait.
			expect(screen.getByText("Visibilité")).toBeInTheDocument();
			expect(screen.getByRole("region", { name: "Le prix et le stock" })).toBeInTheDocument();
		});

		it("renders collections multi-select", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByTestId("multi-select")).toBeInTheDocument();
		});

		it("ne rend plus le tooltip « Variante » (la section a disparu)", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			// Ce déclencheur était `hidden sm:inline-flex` : sous 640px, le mot le plus
			// jargonneux du formulaire n'avait aucune glose. La section renommée
			// « Le bijou » n'a plus besoin d'être expliquée.
			expect(
				screen.queryByRole("button", { name: "Plus d'informations sur la variante" }),
			).not.toBeInTheDocument();
		});

		it("renders create product type button", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: "Créer un nouveau type de produit" }),
			).toBeInTheDocument();
		});

		it("renders create color button", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: "Créer une nouvelle couleur" }),
			).toBeInTheDocument();
		});

		it("renders create material button", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("button", { name: "Créer un nouveau matériau" })).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// Media upload section
	// --------------------------------------------------------------------------

	describe("media upload section", () => {
		it("renders the native dropzone with the accepted formats hint", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(
				screen.getByRole("button", { name: /Zone d'envoi des médias du bijou/i }),
			).toBeInTheDocument();
			expect(screen.getByText(/AVIF/)).toBeInTheDocument();
		});

		it("renders media upload zone container", () => {
			setup();
			const { container } = render(<CreateProductForm {...defaultProps} />);

			expect(container.querySelector("#media-upload-zone")).toBeInTheDocument();
		});

		it("shows media grid when media items are present", () => {
			const mediaItems = [
				{
					url: "https://example.com/img1.jpg",
					mediaType: "IMAGE" as const,
					altText: undefined,
					thumbnailUrl: undefined,
					blurDataUrl: undefined,
				},
			];
			setup({ initialSku: { media: mediaItems } });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByTestId("media-upload-grid")).toBeInTheDocument();
			expect(screen.queryByTestId("upload-dropzone")).not.toBeInTheDocument();
		});

		it("shows media counter with zero when no media", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByTestId("media-counter")).toHaveTextContent("0/6");
		});

		it("shows hint text about image ordering", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(
				screen.getByText(
					"La première image sera l'image principale. Glisse-dépose pour réorganiser.",
				),
			).toBeInTheDocument();
		});

		it("shows media limit warning when at max capacity", () => {
			const maxMedia = Array.from({ length: 6 }, (_, i) => ({
				url: `https://example.com/img${i}.jpg`,
				mediaType: "IMAGE" as const,
				altText: undefined,
				thumbnailUrl: undefined,
				blurDataUrl: undefined,
			}));
			setup({ initialSku: { media: maxMedia } });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByText("Limite de 6 médias atteinte")).toBeInTheDocument();
		});
	});

	// --------------------------------------------------------------------------
	// canSubmit — submit button enabled/disabled
	// --------------------------------------------------------------------------

	describe("canSubmit state", () => {
		it("enables submit buttons when canSubmit is true and not pending", () => {
			setup({ canSubmit: true }, { isPending: false });
			render(<CreateProductForm {...defaultProps} />);

			const submitButtons = screen
				.getAllByRole("button")
				.filter((btn) => btn.getAttribute("type") === "submit");
			submitButtons.forEach((button) => {
				expect(button).not.toBeDisabled();
			});
		});

		// ⚠️ Test INVERSÉ, même motif que « reste soumettable quand le formulaire est
		// incomplet » ci-dessus : seule une occupation RÉELLE grise le bouton.
		it("ne grise pas les boutons de soumission sur canSubmit false", () => {
			setup({ canSubmit: false }, { isPending: false });
			render(<CreateProductForm {...defaultProps} />);

			const submitButtons = screen
				.getAllByRole("button")
				.filter((btn) => btn.getAttribute("type") === "submit");
			expect(submitButtons.length).toBeGreaterThan(0);
			submitButtons.forEach((button) => {
				expect(button).not.toBeDisabled();
			});
		});

		it("disables submit buttons when isPending regardless of canSubmit", () => {
			setup({ canSubmit: true }, { isPending: true });
			render(<CreateProductForm {...defaultProps} />);

			const submitButtons = screen
				.getAllByRole("button")
				.filter((btn) => btn.getAttribute("type") === "submit");
			submitButtons.forEach((button) => {
				expect(button).toBeDisabled();
			});
		});
	});

	// --------------------------------------------------------------------------
	// Escape-to-cancel shortcut
	// --------------------------------------------------------------------------

	describe("Escape-to-cancel shortcut", () => {
		it("navigates to the product list on Escape from outside any overlay", () => {
			const { routerPush } = setup();
			render(<CreateProductForm {...defaultProps} />);

			document.body.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

			expect(routerPush).toHaveBeenCalledWith("/admin/catalogue/produits");
		});

		it("ignores Escape that originates from an open Select overlay", () => {
			// Regression: closing a Select with Escape must NOT trigger the cancel
			// navigation — the global handler used to miss data-slot='select-content'.
			const { routerPush } = setup();
			render(<CreateProductForm {...defaultProps} />);

			const overlay = document.createElement("div");
			overlay.setAttribute("data-slot", "select-content");
			const option = document.createElement("div");
			overlay.appendChild(option);
			document.body.appendChild(overlay);

			option.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

			expect(routerPush).not.toHaveBeenCalled();
			overlay.remove();
		});

		it("ignores Escape that originates from an open dropdown menu", () => {
			const { routerPush } = setup();
			render(<CreateProductForm {...defaultProps} />);

			const overlay = document.createElement("div");
			overlay.setAttribute("data-slot", "dropdown-menu-content");
			document.body.appendChild(overlay);

			overlay.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }));

			expect(routerPush).not.toHaveBeenCalled();
			overlay.remove();
		});
	});

	// --------------------------------------------------------------------------
	// Accessibility
	// --------------------------------------------------------------------------

	describe("accessibility", () => {
		it("renders the required-fields legend", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(
				screen.getByText("Les champs marqués d'un astérisque sont obligatoires."),
			).toBeInTheDocument();
		});

		it("marks the form aria-busy when pending", () => {
			setup({}, { isPending: true });
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("form")).toHaveAttribute("aria-busy", "true");
		});

		it("marks the form not aria-busy when idle", () => {
			setup();
			render(<CreateProductForm {...defaultProps} />);

			expect(screen.getByRole("form")).toHaveAttribute("aria-busy", "false");
		});
	});

	// --------------------------------------------------------------------------
	// Submit handler
	// --------------------------------------------------------------------------

	describe("submit handler", () => {
		it("invokes form.handleSubmit when the form is submitted", () => {
			const { mockForm } = setup();
			render(<CreateProductForm {...defaultProps} />);

			fireEvent.submit(screen.getByRole("form"));

			expect(mockForm.handleSubmit).toHaveBeenCalled();
		});

		it("calls the server action once validation passes", async () => {
			const { action } = setup({ isValid: true });
			render(<CreateProductForm {...defaultProps} />);

			fireEvent.submit(screen.getByRole("form"));

			// Flush the handleSubmit().then() microtask before asserting
			await Promise.resolve();
			await Promise.resolve();

			expect(action).toHaveBeenCalled();
		});

		it("does not call the server action when the form is invalid", async () => {
			// Regression: an invalid form runs client validation (handleSubmit) but
			// must NOT reach the server action — it focuses the first invalid field.
			const { mockForm, action } = setup({ isValid: false });
			render(<CreateProductForm {...defaultProps} />);

			fireEvent.submit(screen.getByRole("form"));

			// Flush the handleSubmit().then() microtask before asserting
			await Promise.resolve();
			await Promise.resolve();

			expect(mockForm.handleSubmit).toHaveBeenCalled();
			expect(action).not.toHaveBeenCalled();
		});
	});
});
