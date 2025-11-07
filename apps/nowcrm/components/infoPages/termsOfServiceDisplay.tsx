"use client";

import { InfoMarkdownDisplay } from "@/components/infoPages/infoMarkdownDisplay";
import { getLatestTerms } from "@/lib/actions/termsOfService/get-terms";

export function TermsOfServiceDisplay() {
	return (
		<InfoMarkdownDisplay
			title="Terms of Service"
			fetchContent={getLatestTerms}
			errorMessage="Failed to load terms of service policy. Please try again later."
		/>
	);
}
