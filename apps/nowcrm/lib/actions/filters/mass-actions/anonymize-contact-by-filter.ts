// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { env } from "@/lib/config/envConfig";
import { API_ROUTES_DAL } from "@nowcrm/services";
import { handleError, StandardResponse } from "@nowcrm/services/server";
export async function anonymizeContactsByFilters(payload: {
    entity: string;
    searchMask: any;
    mass_action: string;
}): Promise<StandardResponse<any>> {

	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
        const transformedFilters = payload.searchMask;

        const updatedPayload = {
            ...payload,
            searchMask: transformedFilters,
        };

        const res = await fetch(
            `${env.CRM_DAL_API_URL}${API_ROUTES_DAL.MASS_ANONYMIZE}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(updatedPayload),
            },
        );

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Anonymized to delete contacts:", errorText);
            throw new Error("Anonymized to delete contacts");
        }

        return {
            data: await res.json(),
            status: res.status,
            success: true,
        };
	} catch (error) {
		return handleError(error);
	}
}
