import { createStore } from "zustand/vanilla";
import { devtools } from "zustand/middleware";

import type { DialogData, DialogState, DialogStore } from "@/shared/types/store.types";
import {
	openEntry,
	closeEntry,
	toggleEntry,
	clearEntry,
	isEntryOpen,
	getEntryData,
} from "./overlay-state-helpers";

export type { DialogStore } from "@/shared/types/store.types";

export const defaultInitState: DialogState = {
	dialogs: {},
};

export const createDialogStore = (initState: DialogState = defaultInitState) => {
	return createStore<DialogStore>()(
		devtools(
			(set, get) => ({
				...initState,
				openDialog: (dialogId: string, data?: DialogData) =>
					set(
						(state) => ({ dialogs: openEntry(state.dialogs, dialogId, data) }),
						false,
						`openDialog/${dialogId}`,
					),
				closeDialog: (dialogId: string) =>
					set(
						(state) => ({ dialogs: closeEntry(state.dialogs, dialogId) }),
						false,
						`closeDialog/${dialogId}`,
					),
				toggleDialog: (dialogId: string) =>
					set(
						(state) => ({ dialogs: toggleEntry(state.dialogs, dialogId) }),
						false,
						`toggleDialog/${dialogId}`,
					),
				isDialogOpen: (dialogId: string) => isEntryOpen(get().dialogs, dialogId),
				getDialogData: <T extends DialogData = DialogData>(dialogId: string): T | undefined =>
					getEntryData<DialogData, T>(get().dialogs, dialogId),
				clearDialogData: (dialogId: string) =>
					set(
						(state) => ({ dialogs: clearEntry(state.dialogs, dialogId) }),
						false,
						`clearDialogData/${dialogId}`,
					),
			}),
			{ name: "DialogStore", enabled: process.env.NODE_ENV === "development" },
		),
	);
};
