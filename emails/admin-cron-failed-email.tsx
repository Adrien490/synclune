import { Section, Text } from "@react-email/components";
import { EMAIL_COLORS, EMAIL_STYLES } from "./email-colors";
import { EmailLayout } from "./_components/email-layout";
import { ErrorCodeBlock } from "./_components/error-code-block";
import { FlexRow } from "./_components/flex-row";

interface AdminCronFailedEmailProps {
	job: string;
	errors: number;
	details: Record<string, unknown>;
}

export const AdminCronFailedEmail = ({
	job,
	errors,
	details,
}: AdminCronFailedEmailProps) => {
	const detailLines = Object.entries(details)
		.map(([key, value]) => `${key}: ${value}`)
		.join("\n");

	return (
		<EmailLayout
			preview={`ALERTE CRON : ${job} — ${errors} erreur(s)`}
			headerText="Échec cron job"
			footer={
				<Text style={EMAIL_STYLES.text.tiny}>
					Vérifiez les logs Vercel pour plus d&apos;informations.
				</Text>
			}
		>
			<Section style={{ marginBottom: "24px", textAlign: "center" }}>
				<Text style={EMAIL_STYLES.text.small}>
					Action manuelle peut-être requise
				</Text>
			</Section>

			{/* Details */}
			<Section style={{ marginBottom: "24px" }}>
				<Section style={EMAIL_STYLES.section.card}>
					<FlexRow
						style={{ marginBottom: "8px" }}
						left={<Text style={EMAIL_STYLES.text.small}>Cron job</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontFamily: "monospace",
									fontSize: "14px",
									fontWeight: "bold",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{job}
							</Text>
						}
					/>
					<FlexRow
						left={<Text style={EMAIL_STYLES.text.small}>Erreurs</Text>}
						right={
							<Text
								style={{
									margin: 0,
									fontSize: "14px",
									fontWeight: "bold",
									color: EMAIL_COLORS.text.primary,
								}}
							>
								{errors}
							</Text>
						}
					/>
				</Section>
			</Section>

			{/* Error details */}
			<Section style={{ marginBottom: "24px" }}>
				<Text style={{ ...EMAIL_STYLES.heading.h3, marginBottom: "8px" }}>
					Détails
				</Text>
				<ErrorCodeBlock error={detailLines} />
			</Section>
		</EmailLayout>
	);
};

AdminCronFailedEmail.PreviewProps = {
	job: "cleanup-carts",
	errors: 3,
	details: {
		processed: 12,
		failed: 3,
		lastError: "Connection timeout after 30s",
	},
} as AdminCronFailedEmailProps;

export default AdminCronFailedEmail;
