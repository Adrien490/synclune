import { getQuickSearchData } from "@/modules/products/data/get-quick-search-data";

import { QuickSearchDialogLazy } from "./quick-search-dialog-lazy";

export async function QuickSearchDialogAsync() {
	const data = await getQuickSearchData();

	return <QuickSearchDialogLazy {...data} />;
}
