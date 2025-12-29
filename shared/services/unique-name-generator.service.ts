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
	maxAttempts: number = 100
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
 * Genere un nom unique technique pour duplication (codes SKU, etc.)
 * Format: "CODE-COPY" ou "CODE-COPY-2"
 *
 * @param originalName - Code original a dupliquer
 * @param checkExists - Fonction pour verifier si le code existe deja
 * @param maxAttempts - Nombre maximum de tentatives (defaut: 100)
 */
export async function generateUniqueTechnicalName(
	originalName: string,
	checkExists: ExistsCheck,
	maxAttempts: number = 100
): Promise<NameResult> {
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
