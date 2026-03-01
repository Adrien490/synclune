// types/server-action.ts

export enum ActionStatus {
	SUCCESS = "success",
	WARNING = "warning",
	ERROR = "error",
	UNAUTHORIZED = "unauthorized",
	VALIDATION_ERROR = "validation_error",
	NOT_FOUND = "not_found",
	CONFLICT = "conflict",
	FORBIDDEN = "forbidden",
	INITIAL = "initial",
}

export type ActionState =
	| { status: ActionStatus.SUCCESS; message: string; data?: unknown }
	| { status: ActionStatus.WARNING; message: string; data?: unknown }
	| {
			status:
				| ActionStatus.ERROR
				| ActionStatus.UNAUTHORIZED
				| ActionStatus.VALIDATION_ERROR
				| ActionStatus.NOT_FOUND
				| ActionStatus.CONFLICT
				| ActionStatus.FORBIDDEN;
			message: string;
			data?: undefined;
	  }
	| { status: ActionStatus.INITIAL; message: string; data?: undefined };

/** Type for a Server Action compatible with useActionState */
export type ServerActionFn = (
	prevState: ActionState | undefined,
	formData: FormData,
) => Promise<ActionState>;
