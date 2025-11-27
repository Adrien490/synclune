export const getPaginationItems = (pageCount: number, page: number) => {
	// Pour peu de pages, afficher tout sans points de suspension
	if (pageCount <= 5) {
		return Array.from({ length: pageCount }, (_, i) => ({
			type: "page",
			value: i + 1,
		}));
	}

	const items = [];

	// Toujours afficher la première page
	items.push({ type: "page", value: 1 });

	// Si la page active est proche du début
	if (page <= 3) {
		// Ajouter pages 2, 3, 4
		for (let i = 2; i <= 4; i++) {
			if (i <= pageCount) items.push({ type: "page", value: i });
		}

		// Un seul point de suspension puis dernière page
		if (pageCount > 5) {
			items.push({ type: "dots", value: "...", id: "dots1" });
		}
		if (pageCount > 4) {
			items.push({ type: "page", value: pageCount });
		}
	}
	// Si la page active est proche de la fin
	else if (page >= pageCount - 3) {
		// Un seul point de suspension
		items.push({ type: "dots", value: "...", id: "dots1" });

		// Puis les 4 dernières pages
		for (let i = pageCount - 3; i <= pageCount; i++) {
			if (i > 1) items.push({ type: "page", value: i });
		}
	}
	// Si la page active est au milieu
	else {
		// Un point de suspension
		items.push({ type: "dots", value: "...", id: "dots1" });

		// Une page avant la page active (si possible)
		if (page > 2) items.push({ type: "page", value: page - 1 });

		// La page active
		items.push({ type: "page", value: page });

		// Une page après la page active (si possible)
		if (page < pageCount - 1) items.push({ type: "page", value: page + 1 });

		// Un autre point de suspension
		items.push({ type: "dots", value: "...", id: "dots2" });

		// La dernière page
		items.push({ type: "page", value: pageCount });
	}

	return items;
};
