/**
 * @regression delete-action-reference-guard
 *
 * La suppression d'un fichier UploadThing initiée côté client passe par la
 * GARDE DE RÉFÉRENCES PARTAGÉES (`deleteUnreferencedCatalogMedia`), jamais
 * par le delete brut (`deleteUploadThingFilesFromUrls`).
 *
 * Bug d'origine (audit 2026-08-16) : `duplicate-product` recopie `url` tel
 * quel — deux lignes `ProductMedia` pointent le même blob. L'action
 * `deleteUploadThingFile` supprimait via le service brut (qui ne vérifie que
 * le domaine) : supprimer une image d'un produit dupliqué détruisait
 * immédiatement le blob encore référencé par l'original → 404 en vitrine.
 * Tous les autres chemins de suppression (update-product, delete-product,
 * create-product) passaient déjà par la garde ; celui-ci la contournait, avec
 * un commentaire qui prétendait le contraire.
 *
 * Test par lecture de source (même approche que
 * `client-mime-allowlist.regression.test.ts`) : le contournement est une
 * propriété du câblage d'import, pas d'un comportement mockable.
 */
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const read = (relativePath: string): string =>
	readFileSync(join(process.cwd(), relativePath), "utf-8");

describe("garde de références sur les chemins de suppression", () => {
	// Les assertions négatives ciblent la ligne d'IMPORT, pas le nom nu : les
	// commentaires de ces fichiers citent légitimement l'ancien service pour
	// documenter le bug fermé.
	const RAW_DELETE_IMPORT = 'from "@/modules/media/services/delete-uploadthing-files.service"';

	it("l'action deleteUploadThingFile passe par deleteUnreferencedCatalogMedia", () => {
		const source = read("modules/media/actions/delete-uploadthing-file.ts");
		expect(source).toContain("deleteUnreferencedCatalogMedia");
		expect(source).not.toContain(RAW_DELETE_IMPORT);
	});

	it("create-product purge ses médias retirés via la garde (undo du toast)", () => {
		// Un média retiré PUIS restauré par l'undo reste dans `deletedImageUrls`
		// tout en étant recréé par la transaction : le delete brut le détruisait
		// alors qu'il venait d'être re-référencé.
		const source = read("modules/products/actions/create-product.ts");
		expect(source).toContain("deleteUnreferencedCatalogMedia");
		expect(source).not.toContain(RAW_DELETE_IMPORT);
	});

	it("le dialog de suppression de la galerie ne déclenche AUCUN delete immédiat", () => {
		// La suppression est différée au submit du formulaire : le dialog ne
		// retire le média que du state. L'ancien mode immédiat détruisait le
		// blob avant validation (annuler le formulaire → ProductMedia pointant
		// un fichier mort).
		const source = read("modules/media/components/admin/delete-gallery-media-alert-dialog.tsx");
		expect(source).not.toContain("deleteUploadThingFile");
		expect(source).not.toContain("skipUtapiDelete");
	});
});
