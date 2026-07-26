/**
 * @regression upload-size-limits-match-file-router
 *
 * Audit coûts P2-2 — le FileRouter UploadThing (`app/api/uploadthing/core.ts`)
 * est l'autorité d'application ; les constantes clientes ne font que refléter
 * ses plafonds. Deux dérives possibles, toutes deux coûteuses :
 *
 * - constante cliente PLUS HAUTE que le serveur : le fichier entier est
 *   téléversé puis rejeté (bande passante gaspillée des deux côtés) ;
 * - plafond serveur trop haut : `512MB × 6 = 3 Go` en un seul upload admin
 *   faisait sauter d'un coup le quota de stockage UploadThing (2 Go gratuits).
 *
 * Le FileRouter est lu comme du TEXTE : l'importer exécuterait toute la chaîne
 * UploadThing (utapi, Sharp, Prisma) au chargement du test.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
	MAX_UPLOAD_COUNT_IMAGE,
	MAX_UPLOAD_COUNT_VIDEO,
	MAX_UPLOAD_SIZE_IMAGE,
	MAX_UPLOAD_SIZE_VIDEO,
} from "../upload-size-limits";

const fileRouterSource = readFileSync(
	resolve(process.cwd(), "app/api/uploadthing/core.ts"),
	"utf-8",
);

/** Extrait `{ maxFileSize: "64MB", maxFileCount: 2 }` pour une clé donnée. */
function parseRouteLimit(kind: "image" | "video"): { megabytes: number; count: number } {
	const pattern = new RegExp(
		`${kind}:\\s*\\{\\s*maxFileSize:\\s*"(\\d+)MB",\\s*maxFileCount:\\s*(\\d+)\\s*\\}`,
	);
	const match = pattern.exec(fileRouterSource);
	if (!match) throw new Error(`Plafond \`${kind}\` introuvable dans le FileRouter`);

	return { megabytes: Number(match[1]), count: Number(match[2]) };
}

const MB = 1024 * 1024;

describe("plafonds d'upload", () => {
	it("aligne la taille vidéo cliente sur le FileRouter", () => {
		expect(parseRouteLimit("video").megabytes * MB).toBe(MAX_UPLOAD_SIZE_VIDEO);
	});

	it("aligne la taille image cliente sur le FileRouter", () => {
		expect(parseRouteLimit("image").megabytes * MB).toBe(MAX_UPLOAD_SIZE_IMAGE);
	});

	it("aligne le nombre de fichiers sur le FileRouter", () => {
		expect(parseRouteLimit("video").count).toBe(MAX_UPLOAD_COUNT_VIDEO);
		expect(parseRouteLimit("image").count).toBe(MAX_UPLOAD_COUNT_IMAGE);
	});

	it("borne le volume d'un seul upload sous le quota gratuit UploadThing (2 Go)", () => {
		const worstCaseBytes =
			MAX_UPLOAD_SIZE_VIDEO * MAX_UPLOAD_COUNT_VIDEO +
			MAX_UPLOAD_SIZE_IMAGE * MAX_UPLOAD_COUNT_IMAGE;

		// Un upload ne doit jamais consommer plus d'un HUITIÈME du quota gratuit
		// (2 Go), sinon une poignée d'actions admin suffit à basculer le compte
		// en facturation. Pire cas actuel : 64×2 + 16×6 = 224 Mo.
		expect(worstCaseBytes).toBeLessThan((2 * 1024 * MB) / 8);
	});
});
