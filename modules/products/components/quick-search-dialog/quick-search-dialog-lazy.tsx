"use client";

import dynamic from "next/dynamic";

export const QuickSearchDialogLazy = dynamic(() =>
	import("./quick-search-dialog").then((mod) => ({
		default: mod.QuickSearchDialog,
	})),
);
