import requireCacheLife from "./rules/require-cache-life.mjs";
import noUpdateTagOutsideServerAction from "./rules/no-update-tag-outside-server-action.mjs";

export default {
	rules: {
		"require-cache-life": requireCacheLife,
		"no-update-tag-outside-server-action": noUpdateTagOutsideServerAction,
	},
};
