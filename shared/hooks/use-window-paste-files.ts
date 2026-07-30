"use client";

import { useEffect, useRef } from "react";

const isImageOrVideo = (f: File) => f.type.startsWith("image/") || f.type.startsWith("video/");

interface UseWindowPasteFilesOptions {
	/** Filtre appliqué aux fichiers collés avant transmission (défaut : images + vidéos). */
	filter?: (file: File) => boolean;
	/** Désarme le listener (surface désactivée, plafond atteint…). */
	disabled?: boolean;
}

/**
 * Écoute le collage de fichiers au niveau `window` et transmet ceux qui passent le
 * filtre.
 *
 * ⚠️ **Ce listener appartient à la surface, pas à la zone de dépôt.** Il vivait dans
 * `NativeDropzone` ; dès lors qu'une surface rend deux branches (une mobile, une
 * desktop) gatées en CSS plutôt qu'en JS, deux `NativeDropzone` coexistent dans
 * l'arbre et chaque fichier collé était ajouté **deux fois**. Un listener `window`
 * est par nature global : il ne peut pas être porté par un composant susceptible
 * d'être monté en plusieurs exemplaires.
 *
 * Le collage est ignoré quand le focus est dans un champ texte — l'utilisatrice
 * colle alors du texte, pas un média.
 */
export function useWindowPasteFiles(
	onFiles: (files: File[]) => void,
	options: UseWindowPasteFilesOptions = {},
): void {
	const { filter = isImageOrVideo, disabled = false } = options;

	// Refs de dernier appel : le listener reste stable même si la surface passe une
	// fonction inline (identité changeante à chaque render).
	const onFilesRef = useRef(onFiles);
	const filterRef = useRef(filter);
	useEffect(() => {
		onFilesRef.current = onFiles;
		filterRef.current = filter;
	});

	useEffect(() => {
		if (disabled) return;
		const handlePaste = (e: ClipboardEvent) => {
			const target = e.target as HTMLElement | null;
			if (target) {
				const tag = target.tagName;
				if (tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable) return;
			}
			const items = e.clipboardData?.files;
			if (!items || items.length === 0) return;
			const files = Array.from(items).filter((f) => filterRef.current(f));
			if (files.length === 0) return;
			e.preventDefault();
			onFilesRef.current(files);
		};
		window.addEventListener("paste", handlePaste);
		return () => window.removeEventListener("paste", handlePaste);
	}, [disabled]);
}
