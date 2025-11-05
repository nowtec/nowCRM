// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { env } from "@/lib/config/envConfig";
import { API_ROUTES_DAL, DocumentId } from "@nowcrm/services";
import { handleError, StandardResponse } from "@nowcrm/services/server";
export async function  addContactsToListByFilters(
    filters: Record<string, any>,
    listId: DocumentId,
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
            mass_action: "add_to_list",
            list_id: listId,
        };


        const res = await fetch(
            `${env.CRM_DAL_API_URL}${API_ROUTES_DAL.MASS_ADD_TO_LIST}`,
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
            console.error("Add to list failed:", errorText);
            throw new Error("Failed to add contacts to list");
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
