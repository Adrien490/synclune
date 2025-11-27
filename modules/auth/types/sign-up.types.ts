import { z } from "zod";
import { signUpEmailSchema } from "@/modules/auth/schemas/auth.schemas";

export type SignUpEmailSchema = z.infer<typeof signUpEmailSchema>;

export type SignUpEmailResponse = {
	message: string;
};
