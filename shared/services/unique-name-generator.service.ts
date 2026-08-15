/**
 * Service de generation de noms uniques pour duplication
 */

type ExistsCheck = (name: string) => Promise<boolean>;

interface NameResult {
	success: boolean;
	name?: string;
	error?: string;
}

/**
 * Genere un nom unique lisible pour duplication
 * Format: "Nom original (copie)" ou "Nom original (copie 2)"
 *
 * @param originalName - Nom original a dupliquer
 * @param checkExists - Fonction pour verifier si le nom existe deja
 * @param maxAttempts - Nombre maximum de tentatives (defaut: 100)
 */
export async function generateUniqueReadableName(
	originalName: string,
	checkExists: ExistsCheck,
	maxAttempts: number = 100,
): Promise<NameResult> {
	// Premiere tentative: "Nom (copie)"
	let candidateName = `${originalName} (copie)`;
	let exists = await checkExists(candidateName);

	if (!exists) {
		return { success: true, name: candidateName };
	}

	// Tentatives suivantes: "Nom (copie 2)", "Nom (copie 3)", etc.
	for (let i = 2; i <= maxAttempts; i++) {
		candidateName = `${originalName} (copie ${i})`;
		exists = await checkExists(candidateName);

		if (!exists) {
			return { success: true, name: candidateName };
		}
	}

	return {
		success: false,
		error: `Impossible de generer un nom unique apres ${maxAttempts} tentatives`,
	};
}

/**
 * Genere un nom unique technique pour duplication (codes VARIANT, etc.)
 * Format: "CODE-COPY" ou "CODE-COPY-2"
 *
 * @param originalName - Code original a dupliquer
 * @param checkExists - Fonction pour verifier si le code existe deja
 * @param maxAttempts - Nombre maximum de tentatives (defaut: 100)
 */
/**
 * Borne haute alignée sur `ProductVariant.variant @db.VarChar(100)` : dupliquer une
 * copie ~15 fois empilait les suffixes `-COPY` jusqu'à dépasser la colonne —
 * erreur Postgres 22001 brute rendue « Une erreur est survenue ».
 * On tronque la BASE pour laisser la place au plus long suffixe possible.
 */
const TECHNICAL_NAME_MAX_LENGTH = 100;
const LONGEST_TECHNICAL_SUFFIX = "-COPY-100".length;

export async function generateUniqueTechnicalName(
	originalName: string,
	checkExists: ExistsCheck,
	maxAttempts: number = 100,
): Promise<NameResult> {
	const maxBaseLength = TECHNICAL_NAME_MAX_LENGTH - LONGEST_TECHNICAL_SUFFIX;
	if (originalName.length > maxBaseLength) {
		originalName = originalName.slice(0, maxBaseLength);
	}

	// Premiere tentative: "CODE-COPY"
	let candidateName = `${originalName}-COPY`;
	let exists = await checkExists(candidateName);

	if (!exists) {
		return { success: true, name: candidateName };
	}

	// Tentatives suivantes: "CODE-COPY-2", "CODE-COPY-3", etc.
	for (let i = 2; i <= maxAttempts; i++) {
		candidateName = `${originalName}-COPY-${i}`;
		exists = await checkExists(candidateName);

		if (!exists) {
			return { success: true, name: candidateName };
		}
	}

	return {
		success: false,
		error: `Impossible de generer un code unique apres ${maxAttempts} tentatives`,
	};
}
