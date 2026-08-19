import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Contrat : les trois actions de duplication de taxonomies parlent la langue
 * du hook générique `useTaxonomyDuplicate`.
 *
 * Le hook lit son argument via `readDuplicateData`, qui exige `{ id: string,
 * name: string }` et rend `null` sinon — **sans lever**. Un payload qui dérive
 * ne casse donc rien de visible : la duplication réussit en base, le toast de
 * chargement se résout, et le `onSuccess` (ouverture du détail, toast nommé) ne
 * se déclenche simplement jamais. Le risque n'est pas théorique :
 * `duplicateProductType` doit déjà mapper `label → name` à la main pour se
 * conformer — c'est précisément le champ qu'un refactor « naturel » renverrait
 * sous son nom Prisma.
 *
 * Le test exerce les VRAIES actions (prisma et admin mockés) et vérifie les
 * deux bouts du fil :
 *  - l'action accepte le nom de champ `FormData` que le registre déclare
 *    (`formFields.duplicateId` — `colorId`, `materialId`, `productTypeId`) ;
 *  - son `data` de succès passe `readDuplicateData`, exactement comme dans le
 *    hook.
 */

const mocks = vi.hoisted(() => {
	const model = () => ({
		findUnique: vi.fn(),
		findFirst: vi.fn(),
		create: vi.fn(),
	});
	return {
		requireAdmin: vi.fn(),
		updateTag: vi.fn(),
		prisma: {
			color: model(),
			material: model(),
			productType: model(),
		},
	};
});

vi.mock("@/modules/admin-auth/lib/require-admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/shared/lib/prisma", () => ({ prisma: mocks.prisma }));
vi.mock("next/cache", () => ({
	updateTag: mocks.updateTag,
	cacheLife: vi.fn(),
	cacheTag: vi.fn(),
}));

import { duplicateColor } from "@/modules/colors/actions/duplicate-color";
import { duplicateMaterial } from "@/modules/materials/actions/duplicate-material";
import { duplicateProductType } from "@/modules/product-types/actions/duplicate-product-type";
import { TAXONOMY_CONFIG } from "@/modules/taxonomies/config/taxonomy.config";
import { readDuplicateData } from "@/modules/taxonomies/hooks/use-taxonomy-mutations";
import type { TaxonomyKind } from "@/modules/taxonomies/types/taxonomy.types";
import { ActionStatus, type ActionState } from "@/shared/types/server-action";

/** Id acceptable par `z.cuid2()` (alphabet `[0-9a-z]`, cf. delete-variant.test). */
const SOURCE_ID = "tz4a98xxat96iws9zmbrgj3a";

type DuplicateAction = (
	prevState: ActionState | undefined,
	formData: FormData,
) => Promise<ActionState>;

interface Case {
	kind: TaxonomyKind;
	action: DuplicateAction;
	arrange: () => void;
	/** Nom attendu dans le payload — celui que le toast et le détail affichent. */
	expectedName: string;
}

const CASES: Case[] = [
	{
		kind: "color",
		action: duplicateColor,
		expectedName: "Rose bonbon (copie)",
		arrange: () => {
			mocks.prisma.color.findUnique.mockResolvedValue({
				id: SOURCE_ID,
				name: "Rose bonbon",
				hex: "#ff69b4",
			});
			mocks.prisma.color.findFirst.mockResolvedValue(null);
			mocks.prisma.color.create.mockResolvedValue({
				id: "colorcopy1",
				name: "Rose bonbon (copie)",
				hex: "#ff69b4",
			});
		},
	},
	{
		kind: "material",
		action: duplicateMaterial,
		expectedName: "Verre irisé (copie)",
		arrange: () => {
			mocks.prisma.material.findUnique.mockResolvedValue({
				id: SOURCE_ID,
				name: "Verre irisé",
			});
			mocks.prisma.material.findFirst.mockResolvedValue(null);
			mocks.prisma.material.create.mockResolvedValue({
				id: "materialcopy1",
				name: "Verre irisé (copie)",
			});
		},
	},
	{
		kind: "product-type",
		action: duplicateProductType,
		expectedName: "Boucles pendantes (copie)",
		arrange: () => {
			// `findUnique` sert deux requêtes : l'original (par id) et la collision
			// de slug de `generateSlug` (par slug) — seule la première doit répondre.
			mocks.prisma.productType.findUnique.mockImplementation(
				async ({ where }: { where: { id?: string; slug?: string } }) =>
					where.id === SOURCE_ID
						? { id: SOURCE_ID, label: "Boucles pendantes", slug: "boucles-pendantes" }
						: null,
			);
			mocks.prisma.productType.findFirst.mockResolvedValue(null);
			mocks.prisma.productType.create.mockResolvedValue({
				id: "typecopy1",
				label: "Boucles pendantes (copie)",
				slug: "boucles-pendantes-copie",
			});
		},
	},
];

beforeEach(() => {
	vi.clearAllMocks();
	mocks.requireAdmin.mockResolvedValue({ admin: true });
});

describe("contrat · payload des actions de duplication de taxonomies", () => {
	it.each(CASES)(
		"$kind : l'action lit le champ du registre et répond en { id, name }",
		async ({ kind, action, arrange, expectedName }) => {
			arrange();

			// Le nom du champ vient du REGISTRE, pas d'un littéral : c'est lui que
			// `useTaxonomyDuplicate` écrit dans le FormData.
			const formData = new FormData();
			formData.append(TAXONOMY_CONFIG[kind].formFields.duplicateId, SOURCE_ID);

			const result = await action(undefined, formData);

			expect(result.status).toBe(ActionStatus.SUCCESS);

			// Exactement le chemin du hook : un payload que `readDuplicateData`
			// rejette rend le `onSuccess` du module inerte, sans erreur visible.
			const data = readDuplicateData(result.data);
			expect(
				data,
				`Le data de succès de ${kind} ne passe pas readDuplicateData : ` +
					`le onSuccess de useTaxonomyDuplicate ne se déclenchera jamais. ` +
					`Attendu { id: string, name: string }, reçu ${JSON.stringify(result.data)}.`,
			).not.toBeNull();
			expect(data).toEqual({ id: expect.any(String), displayName: expectedName });
		},
	);

	it("readDuplicateData rejette (null, sans lever) tout payload hors contrat", () => {
		// Le cas de dérive réel : renvoyer le champ sous son nom Prisma (`label`).
		expect(readDuplicateData({ id: "x", label: "Créoles (copie)" })).toBeNull();
		expect(readDuplicateData({ name: "Créoles (copie)" })).toBeNull();
		expect(readDuplicateData({ id: 42, name: "Créoles" })).toBeNull();
		expect(readDuplicateData(undefined)).toBeNull();
		expect(readDuplicateData(null)).toBeNull();
		expect(readDuplicateData("Créoles")).toBeNull();
	});
});
