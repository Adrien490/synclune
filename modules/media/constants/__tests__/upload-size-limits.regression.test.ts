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

/**
 * Découpe la source par route.
 *
 * ⚠️ Le découpage reste nécessaire même à une seule route : `parseRouteLimit`
 * ferait sinon son `RegExp.exec` sur la source entière et s'arrêterait à la
 * première occurrence de `image:`, sans garantie qu'elle appartienne à la route
 * visée — c'est exactement le défaut qui laissait une seconde route alignée sur
 * RIEN. Toute route ajoutée au FileRouter hérite donc du bon segment.
 */
function routeSource(route: "catalogMedia"): string {
	const start = fileRouterSource.indexOf(`${route}: f({`);
	if (start < 0) throw new Error(`Route \`${route}\` introuvable dans le FileRouter`);
	const rest = fileRouterSource.slice(start);
	// La route suivante (ou la fin de l'objet) borne le segment.
	const nextRoute = rest.slice(1).search(/^\t\w+: f\(\{/m);
	return nextRoute < 0 ? rest : rest.slice(0, nextRoute + 1);
}

/** Extrait `{ maxFileSize: "64MB", maxFileCount: 2 }` pour une clé d'une route donnée. */
function parseRouteLimit(
	route: "catalogMedia",
	kind: "image" | "video",
): { megabytes: number; count: number } {
	const pattern = new RegExp(
		`${kind}:\\s*\\{\\s*maxFileSize:\\s*"(\\d+)MB",\\s*maxFileCount:\\s*(\\d+)\\s*\\}`,
	);
	const match = pattern.exec(routeSource(route));
	if (!match) throw new Error(`Plafond \`${kind}\` introuvable sur la route \`${route}\``);

	return { megabytes: Number(match[1]), count: Number(match[2]) };
}

const MB = 1024 * 1024;

describe("plafonds d'upload — route catalogMedia", () => {
	it("aligne la taille vidéo cliente sur le FileRouter", () => {
		expect(parseRouteLimit("catalogMedia", "video").megabytes * MB).toBe(MAX_UPLOAD_SIZE_VIDEO);
	});

	it("aligne la taille image cliente sur le FileRouter", () => {
		expect(parseRouteLimit("catalogMedia", "image").megabytes * MB).toBe(MAX_UPLOAD_SIZE_IMAGE);
	});

	it("aligne le nombre de fichiers sur le FileRouter", () => {
		expect(parseRouteLimit("catalogMedia", "video").count).toBe(MAX_UPLOAD_COUNT_VIDEO);
		expect(parseRouteLimit("catalogMedia", "image").count).toBe(MAX_UPLOAD_COUNT_IMAGE);
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

describe("gardes internes du middleware", () => {
	it("n'écrit aucun plafond de taille en littéral", () => {
		// ⚠️ Le garde vidéo du middleware était figé à `512 * 1024 * 1024`, soit 8× la
		// valeur réelle de la config du router juste au-dessus — une défense en
		// profondeur morte, que `middleware.test.ts` entérinait avec un cas « accepte
		// une vidéo MP4 sous 512 Mo ». Le test des plafonds ne pouvait pas l'attraper :
		// il ne lisait que la déclaration `f({…})`, jamais le corps du middleware.
		const literals = fileRouterSource.match(/\b\d+\s*\*\s*1024\s*\*\s*1024\b/g) ?? [];
		expect(literals).toEqual([]);
	});

	it("tire ses plafonds de la SSOT", () => {
		expect(fileRouterSource).toContain("MAX_UPLOAD_SIZE_VIDEO");
		expect(fileRouterSource).toContain("MAX_UPLOAD_SIZE_IMAGE");
	});
});
