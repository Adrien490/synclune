import { EMAIL_STYLES } from "../email-colors";

interface ErrorCodeBlockProps {
	error: string;
}

export const ErrorCodeBlock = ({ error }: ErrorCodeBlockProps) => {
	return (
		<div className="email-code-block" style={EMAIL_STYLES.codeBlock.container}>
			<code style={EMAIL_STYLES.codeBlock.code}>{error}</code>
		</div>
	);
};
