"use client";

import { useParams } from "next/navigation";
import { InfoMarkdownDisplay } from "@/components/infoPages/infoMarkdownDisplay";
import { getLatestConsents } from "@/lib/actions/consent/get-latest-consents";

type PrivacyPolicyDisplayProps = {
	id?: number;
};
export function PrivacyPolicyDisplay({ id }: PrivacyPolicyDisplayProps) {
	const params = useParams();
	const locale = params?.locale as string;
	return (
		<InfoMarkdownDisplay
			title="Privacy Policy"
			fetchContent={() => getLatestConsents(locale, id)}
			errorMessage="Failed to load privacy policy. Please try again later."
		/>
	);
}
