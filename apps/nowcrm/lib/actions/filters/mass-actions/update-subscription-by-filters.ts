// actions/deleteContactAction.ts
"use server";
import { auth } from "@/auth";
import { env } from "@/lib/config/envConfig";
import { API_ROUTES_DAL } from "@nowcrm/services";
import { handleError, StandardResponse } from "@nowcrm/services/server";
export async function  UpdateSubscriptionContactsByFilters(
    filters: Record<string, any>,
    channelId: number,
    isSubscribe: boolean,
    addEvent?: boolean,
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
            mass_action: "update_subscription",
            channelId,
            isSubscribe,
            addEvent: !!addEvent,
        };

        const res = await fetch(
            `${env.CRM_DAL_API_URL}${API_ROUTES_DAL.MASS_UPDATE_SUBSCRIPTION}`,
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
            console.error("Updating subscription failed:", errorText);
            throw new Error("Failed to update subscription to contacts");
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
