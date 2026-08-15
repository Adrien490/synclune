/**
 * @regression server-action-copy-voice-2026-08-07
 *
 * La copie utilisateur du dépôt tutoie et porte ses accents (CLAUDE.md § Conventions).
 * Les fichiers `actions/` y échappaient : l'audit « Server Actions sécurisées » du
 * 2026-08-07 y a trouvé **43 chaînes défectueuses sur 173**.
 *
 *  - **20 sans accents** — « Ce nom de materiau existe deja », « Impossible de
 *    rafraichir les materiaux », « La suppression du fichier a echoue cote
 *    UploadThing », « Recherche supprimee », « commandes associee ». Toutes
 *    rendues telles quelles à l'administratrice.
 *  - **23 vouvoyantes** — et pas dans le périmètre de KI-003, qui ne documentait
 *    que les libellés de rate limit de `modules/payments` (libellés disparus
 *    depuis avec le rate limiting, migration lean). Celles-là étaient de la
 *    copie ordinaire : « Votre email n'a pas été vérifié », « Vous êtes déjà
 *    connecté », « Veuillez en choisir un autre » sur six modules du catalogue.
 *
 * Pourquoi un contrat et pas une revue : ces chaînes sont invisibles à `tsc`, à
 * ESLint et à Prettier, et se réintroduisent au premier copier-coller depuis un
 * fichier voisin — c'est exactement comme ça qu'elles se sont multipliées.
 *
 * ⚠️ La correction s'est faite en UNE passe, délibérément. Traiter ces chaînes une
 * par une crée une incohérence pire que l'état initial (deux voix co-visibles sur
 * un même écran) — c'est la raison pour laquelle KI-003 diffère le reste.
 */

import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const REPO_ROOT = process.cwd();

/**
 * Marqueurs de vouvoiement. `\bVous\b` et `\bvous\b` couvrent le pronom sujet et
 * complément ; `Veuillez` est l'impératif de politesse ; `[Vv]otre` / `[Vv]os`, les
 * possessifs.
 */
const VOUVOIEMENT = /\b(Veuillez|[Vv]ous|[Vv]otre|[Vv]os)\b/;

/**
 * Mots français dont la forme SANS accent est le défaut observé. Volontairement une
 * liste fermée : un détecteur générique « mot sans accent » rougirait sur tout
 * l'anglais du code (`error`, `create`, `update`…) et sur les identifiants.
 */
const MOTS_SANS_ACCENT =
	/\b(deja|materiau|materiaux|rafraichir|echoue|echec|cote|supprimee|modifiee|associee|utilisee|creee|numero|reussie|desactivee|activee|verifiee|generee|liee|selectionnee|archivee|publiee|dupliquee|systeme|donnees|parametre|parametres|requete|categorie|quantite|reference|detail|etat)\b/;

/**
 * Locutions dont l'accent tombe sur un mot d'UNE lettre, invisible à la liste
 * ci-dessus. « mise a jour » a survécu au premier passage de ce contrat pour cette
 * raison exacte : `a` seul ne peut pas entrer dans `MOTS_SANS_ACCENT` sans rougir
 * sur tous les « a » légitimes (« il a été supprimé »).
 */
const LOCUTIONS_SANS_ACCENT = /\b(mise? a jour|a partir de|jusqu'a|par rapport a|grace a)\b/;

/**
 * Libellés partagés de rate limit — dette KI-003, à traiter avec un SSOT de messages,
 * pas fichier par fichier. Chaque entrée porte sa raison.
 *
 * ⚠️ N'y ajouter QUE des libellés de rate limit. Une exemption pour de la copie
 * ordinaire vide le contrat de son sens.
 */
const KI_003_RATE_LIMIT_LABELS = [
	"Trop de tentatives. Veuillez réessayer plus tard.",
	"Trop de requêtes. Veuillez réessayer plus tard.",
];

/** Chaînes littérales d'un fichier, hors imports (des chemins, pas de la copie). */
function userFacingStrings(source: string): Array<{ line: number; text: string }> {
	const found: Array<{ line: number; text: string }> = [];

	source.split("\n").forEach((raw, index) => {
		const line = raw.trim();
		// Commentaires et imports : ni l'un ni l'autre n'atteint l'utilisateur.
		if (line.startsWith("//") || line.startsWith("*") || line.startsWith("/*")) return;
		if (line.startsWith("import ") || line.startsWith("} from ")) return;

		for (const match of raw.matchAll(/"([^"\\]{8,})"|`([^`\\$]{8,})`/g)) {
			const text = match[1] ?? match[2] ?? "";
			// Chemins, tags de cache, identifiants techniques : pas de la copie.
			if (/^[@/]|^https?:|^[a-z][a-z0-9-]*(:[a-z0-9-]+)+$/.test(text)) continue;
			found.push({ line: index + 1, text });
		}
	});

	return found;
}

function collectActionFiles(dir: string, acc: string[] = []): string[] {
	let entries: string[];
	try {
		entries = readdirSync(dir);
	} catch {
		return acc;
	}
	for (const entry of entries) {
		const full = join(dir, entry);
		if (statSync(full).isDirectory()) {
			if (entry === "__tests__" || entry === "node_modules") continue;
			collectActionFiles(full, acc);
			continue;
		}
		if (!entry.endsWith(".ts") || entry.endsWith(".test.ts")) continue;
		// Seuls les dossiers `actions/` sont sous contrat : c'est le périmètre audité.
		if (!full.includes(`${"/"}actions${"/"}`)) continue;
		acc.push(full);
	}
	return acc;
}

const ACTION_FILES = ["modules", "shared"]
	.flatMap((root) => collectActionFiles(join(REPO_ROOT, root)))
	.map((file) => relative(REPO_ROOT, file))
	.sort();

interface Offense {
	file: string;
	line: number;
	text: string;
}

function scan(matcher: RegExp): Offense[] {
	const offenses: Offense[] = [];
	for (const file of ACTION_FILES) {
		for (const { line, text } of userFacingStrings(readFileSync(join(REPO_ROOT, file), "utf8"))) {
			if (KI_003_RATE_LIMIT_LABELS.includes(text)) continue;
			if (matcher.test(text)) offenses.push({ file, line, text });
		}
	}
	return offenses;
}

const format = (o: Offense) => `${o.file}:${o.line} → « ${o.text} »`;

describe("contrat · voix et orthographe de la copie des Server Actions", () => {
	describe("garde-fous du garde-fou", () => {
		it("le scan trouve bien les fichiers d'actions du dépôt", () => {
			// Sans plancher, un renommage de dossier rendrait la suite vacuellement verte.
			// Abaissé à 50 au lot 2 (purge invoices/refunds/cron/store-settings).
			expect(ACTION_FILES.length).toBeGreaterThan(50);
		});

		it("le scan trouve bien des chaînes utilisateur dedans", () => {
			const total = ACTION_FILES.reduce(
				(sum, file) => sum + userFacingStrings(readFileSync(join(REPO_ROOT, file), "utf8")).length,
				0,
			);
			expect(total).toBeGreaterThan(100);
		});

		it("les détecteurs attrapent les défauts historiques", () => {
			expect(VOUVOIEMENT.test("Ce nom existe déjà. Veuillez en choisir un autre.")).toBe(true);
			expect(VOUVOIEMENT.test("Votre email n'a pas été vérifié.")).toBe(true);
			expect(VOUVOIEMENT.test("Vous êtes déjà connecté")).toBe(true);
			expect(MOTS_SANS_ACCENT.test("Ce nom de materiau existe deja.")).toBe(true);
			expect(MOTS_SANS_ACCENT.test("La suppression a echoue cote UploadThing")).toBe(true);
			expect(LOCUTIONS_SANS_ACCENT.test("Erreur lors de la mise a jour des prix")).toBe(true);
			// …sans rougir sur un « a » verbe, qui n'en porte pas.
			expect(LOCUTIONS_SANS_ACCENT.test("Le type a été supprimé")).toBe(false);
		});

		it("les détecteurs laissent passer la copie correcte", () => {
			for (const ok of [
				"Ce nom de matériau existe déjà. Choisis-en un autre.",
				"Ton email n'a pas été vérifié. Vérifie ta boîte mail.",
				"Article ajouté au panier",
				"Adresse de livraison modifiée",
				"Erreur lors de la mise à jour des prix",
			]) {
				expect(VOUVOIEMENT.test(ok), ok).toBe(false);
				expect(MOTS_SANS_ACCENT.test(ok), ok).toBe(false);
				expect(LOCUTIONS_SANS_ACCENT.test(ok), ok).toBe(false);
			}
		});

		it("chaque exemption KI-003 est bien un libellé de rate limit", () => {
			for (const label of KI_003_RATE_LIMIT_LABELS) {
				expect(label, `Exemption hors périmètre KI-003 : ${label}`).toMatch(/^Trop de /);
			}
		});
	});

	it("aucune copie vouvoyante hors des libellés de rate limit KI-003", () => {
		expect(
			scan(VOUVOIEMENT).map(format),
			"La copie utilisateur tutoie (CLAUDE.md § Conventions). Les seuls vouvoiements tolérés sont les libellés partagés de rate limit (KI-003), à traiter en une passe avec un SSOT de messages.",
		).toEqual([]);
	});

	it("aucune copie utilisateur sans ses accents", () => {
		expect(
			scan(MOTS_SANS_ACCENT).map(format),
			"Ces chaînes partent telles quelles à l'écran. Rétablir les accents — « matériau », « déjà », « échoué », « côté », « supprimée », « associée ».",
		).toEqual([]);
	});

	it("aucune locution dont l'accent tombe sur un mot d'une lettre", () => {
		expect(
			scan(LOCUTIONS_SANS_ACCENT).map(format),
			"« mise à jour », « à partir de », « jusqu'à » — l'accent porte sur le `a`, que la liste de mots ne peut pas attraper seule.",
		).toEqual([]);
	});
});
