/**
 * @regression client-mime-allowlist-matches-file-router
 *
 * Audit UI/UX file upload — la validation cliente acceptait `image/*` et `video/*`
 * par simple préfixe, alors que le serveur applique une **allowlist** stricte
 * (`video/mp4` seul en vidéo ; SVG exclu comme vecteur XSS). Trois conséquences,
 * toutes payées par l'utilisatrice :
 *
 * - un `.mov` (`video/quicktime`) était proposé par le picker natif, passait toute
 *   la validation cliente, montait **jusqu'à 64 Mo**, puis se faisait refuser par
 *   `validateMimeType` ;
 * - idem pour un `.svg`, un `.bmp` ou un `.tiff` sous 1 Mo (la compression cliente
 *   est court-circuitée sous ce seuil, donc rien ne les ré-encodait) ;
 * - le correctif « M13 » de l'audit média précédent croyait avoir fermé ce trou : il
 *   n'avait retiré `.mov` que du **repli par extension** (branche « MIME vide » iOS),
 *   pas du chemin MIME normal.
 *
 * Ce test verrouille les deux moitiés de la correction : l'allowlist cliente, et son
 * identité avec celle du FileRouter. `core.ts` est lu comme du **texte** — l'importer
 * exécuterait toute la chaîne UploadThing (utapi, Sharp, Prisma) au chargement.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import {
	ACCEPTED_IMAGE_MIME_TYPES,
	ACCEPTED_VIDEO_MIME_TYPES,
	ACCEPT_ATTRIBUTE_CATALOG,
	ACCEPT_ATTRIBUTE_IMAGES_ONLY,
} from "../media-limits.constants";
import { isValidMediaType } from "../../utils/upload-helpers";

const fileRouterSource = readFileSync(
	resolve(process.cwd(), "app/api/uploadthing/core.ts"),
	"utf-8",
);

function makeFile(type: string, name = "fichier"): File {
	return new File([""], name, { type });
}

describe("allowlist MIME cliente", () => {
	it("refuse tout format vidéo autre que le MP4", () => {
		expect(isValidMediaType(makeFile("video/quicktime", "bijou.mov"))).toBe(false);
		expect(isValidMediaType(makeFile("video/webm", "bijou.webm"))).toBe(false);
		expect(isValidMediaType(makeFile("video/x-msvideo", "bijou.avi"))).toBe(false);
		expect(isValidMediaType(makeFile("video/mp4", "bijou.mp4"))).toBe(true);
	});

	it("refuse le SVG et les formats image non décodés en aval", () => {
		expect(isValidMediaType(makeFile("image/svg+xml", "logo.svg"))).toBe(false);
		expect(isValidMediaType(makeFile("image/bmp", "photo.bmp"))).toBe(false);
		expect(isValidMediaType(makeFile("image/tiff", "photo.tiff"))).toBe(false);
	});

	it("n'utilise le repli par extension que lorsque le MIME est absent", () => {
		// Pellicule iOS : MIME vide, extension fiable.
		expect(isValidMediaType(makeFile("", "photo.heic"))).toBe(true);
		// MIME présent mais refusé : l'extension ne doit PAS le réhabiliter.
		expect(isValidMediaType(makeFile("video/quicktime", "bijou.mp4"))).toBe(false);
	});
});

describe("parité client / FileRouter", () => {
	it("le FileRouter consomme la SSOT au lieu de redéclarer ses listes", () => {
		// Une redéclaration littérale rouvrirait la divergence que ce test ferme.
		expect(fileRouterSource).toContain("ACCEPTED_IMAGE_MIME_TYPES");
		expect(fileRouterSource).toContain("ACCEPTED_VIDEO_MIME_TYPES");
	});

	it("chaque MIME de la SSOT est bien celui que le serveur applique", () => {
		// Les deux constantes serveur sont des alias directs de la SSOT : on vérifie
		// que l'aliasing est présent et qu'aucune liste littérale ne subsiste à côté.
		expect(fileRouterSource).toMatch(/ALLOWED_IMAGE_TYPES\s*=\s*ACCEPTED_IMAGE_MIME_TYPES/);
		expect(fileRouterSource).toMatch(/ALLOWED_VIDEO_TYPES\s*=\s*ACCEPTED_VIDEO_MIME_TYPES/);
		expect(fileRouterSource).not.toMatch(/ALLOWED_IMAGE_TYPES\s*=\s*\[/);
		expect(fileRouterSource).not.toMatch(/ALLOWED_VIDEO_TYPES\s*=\s*\[/);
	});

	it("exclut le SVG de l'allowlist image", () => {
		expect(ACCEPTED_IMAGE_MIME_TYPES).not.toContain("image/svg+xml");
	});

	it("n'autorise que le MP4 en vidéo", () => {
		expect([...ACCEPTED_VIDEO_MIME_TYPES]).toEqual(["video/mp4"]);
	});
});

describe("attributs accept des pickers natifs", () => {
	it("n'emploie aucun joker", () => {
		// ⚠️ `image/*,video/*` laissait le picker natif proposer des formats refusés.
		expect(ACCEPT_ATTRIBUTE_CATALOG).not.toContain("*");
		expect(ACCEPT_ATTRIBUTE_IMAGES_ONLY).not.toContain("*");
	});

	it("énumère tous les MIME de la SSOT", () => {
		for (const mime of ACCEPTED_IMAGE_MIME_TYPES) {
			expect(ACCEPT_ATTRIBUTE_CATALOG).toContain(mime);
			expect(ACCEPT_ATTRIBUTE_IMAGES_ONLY).toContain(mime);
		}
		for (const mime of ACCEPTED_VIDEO_MIME_TYPES) {
			expect(ACCEPT_ATTRIBUTE_CATALOG).toContain(mime);
		}
	});

	it("garde les extensions HEIC pour la pellicule iOS", () => {
		// Safari iOS liste parfois un élément HEIC avec un MIME vide : sans les
		// extensions dans `accept`, le fichier n'apparaît pas dans le picker.
		expect(ACCEPT_ATTRIBUTE_CATALOG).toContain(".heic");
		expect(ACCEPT_ATTRIBUTE_IMAGES_ONLY).toContain(".heif");
	});

	it("n'expose aucune vidéo au picker des surfaces images seules", () => {
		expect(ACCEPT_ATTRIBUTE_IMAGES_ONLY).not.toContain("video/");
	});
});
