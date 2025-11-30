import path from "path";

/**
 * Verifie si un chemin de fichier est securise (pas de path traversal)
 *
 * @param filePath - Chemin du fichier a valider
 * @param baseDirectory - Repertoire de base autorise
 * @returns true si le chemin est dans le repertoire de base
 */
export function isPathSafe(filePath: string, baseDirectory: string): boolean {
	const resolvedPath = path.resolve(filePath);
	const resolvedBase = path.resolve(baseDirectory);
	return resolvedPath.startsWith(resolvedBase + path.sep) || resolvedPath === resolvedBase;
}

/**
 * Normalise un chemin et verifie qu'il est securise
 *
 * @param filePath - Chemin du fichier
 * @param baseDirectory - Repertoire de base autorise
 * @returns Le chemin resolu si securise, null sinon
 */
export function getSafeResolvedPath(
	filePath: string,
	baseDirectory: string
): string | null {
	const resolvedPath = path.resolve(filePath);
	const resolvedBase = path.resolve(baseDirectory);

	if (
		resolvedPath.startsWith(resolvedBase + path.sep) ||
		resolvedPath === resolvedBase
	) {
		return resolvedPath;
	}

	return null;
}
