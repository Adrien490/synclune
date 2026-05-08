#!/usr/bin/env node
/**
 * Update test files to expect `…` instead of `...` after ellipsis migration.
 *
 * Strategy: only inside test files (`*.test.ts`, `*.test.tsx`, `__tests__/`),
 * replace `Word...` → `Word…` ONLY when followed by `"` or `'` or `\``.
 * This narrowly targets `getByText("Loading...")`-style assertions and avoids
 * touching code logic.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { execSync } from "node:child_process";

const ROOTS = ["app", "modules", "shared"];
const TEST_PATTERN = /(?:__tests__|\.test)\.(?:tsx?|jsx?)$/;
const EXCLUDES = /\/(node_modules|\.next|dist|coverage|generated)\//;

const files = execSync(`git ls-files ${ROOTS.join(" ")}`, { cwd: process.cwd() })
	.toString()
	.split("\n")
	.filter((f) => f && TEST_PATTERN.test(f) && !EXCLUDES.test(f) && existsSync(f));

let totalReplaced = 0;
let changedFiles = 0;

const FRENCH_VERBS = [
	"Connexion",
	"Inscription",
	"Suspension",
	"Suppression",
	"Validation",
	"Annulation",
	"Traitement",
	"Recherche",
	"Envoi",
	"Chargement",
	"Confirmation",
	"Ajout",
	"Mise à jour",
	"Mise à jour des prix",
	"Téléchargement",
	"Préparation",
	"Restauration",
	"Activation",
	"Désactivation",
	"Sauvegarde",
	"Enregistrement",
	"Génération",
	"Sortie",
	"Réinitialisation",
	"Marquage",
	"Modération",
	"Modification",
	"Création",
	"Renvoi",
	"Retour",
	"Mise en cours",
	"Cours",
	"Exportation",
	"Vérification",
	"Vérification du code",
	"Action",
	"Synchronisation",
	"Réessai",
	"Recharge",
	"Patientez",
	"Attente",
	"Réception",
	"En cours",
	"Déconnexion",
	"Ajustement",
	"Retrait",
	"Refus",
	"Approbation",
	"Passage",
	"Expédition",
	"Vidage",
	"Changement",
	"Duplication",
	"Archivage",
	"Export",
	"Duplication en cours",
	"Changement en cours",
	"Vidage du panier",
	"Détails supplémentaires",
	"Décrivez cette collection",
	"Écrivez votre réponse",
];
const verbsAlt = FRENCH_VERBS.map((v) => v.replace(/\s/g, "\\s")).join("|");
// Match `Verb...` followed by `"`, `'`, `\``, or `\\.` (escaped in regex literal /\.\.\./i)
const RE = new RegExp(
	String.raw`((?:${verbsAlt})[^"'\`\n]{0,40})\.\.\.(?=["'\`]|\\\.\\\.\\\.)`,
	"g",
);

for (const file of files) {
	const src = readFileSync(file, "utf8");
	let count = 0;
	const next = src.replace(RE, (_, prefix) => {
		count += 1;
		return `${prefix}…`;
	});
	if (next !== src) {
		writeFileSync(file, next, "utf8");
		changedFiles += 1;
		totalReplaced += count;
		console.log(`  ${file}: ${count} fix${count > 1 ? "es" : ""}`);
	}
}

console.log(`\n${totalReplaced} test ellipsis updates in ${changedFiles} file(s).`);
