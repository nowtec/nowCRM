// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { env } from "@/lib/config/envConfig";
import { API_ROUTES_DAL, DocumentId } from "@nowcrm/services";
import { handleError, StandardResponse } from "@nowcrm/services/server";
export async function  addContactsToJourneyByFilters(
    filters: Record<string, any>,
    journey_id: DocumentId,
): Promise<StandardResponse<any>> {

	const session = await auth();
	if (!session) {
		return {
			data: null,
			status: 403,
			success: false,
		};
	}

	try {
        const payload = {
            entity: "contacts",
            searchMask: filters,
            mass_action: "add_to_journey",
            list_id: journey_id,
        };

        const res = await fetch(
            `${env.CRM_DAL_API_URL}${API_ROUTES_DAL.MASS_ADD_TO_JOURNEY}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify(payload),
            },
        );

        if (!res.ok) {
            const errorText = await res.text();
            console.error("Add to Journey failed:", errorText);
            throw new Error("Failed to add contacts to Journey");
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
