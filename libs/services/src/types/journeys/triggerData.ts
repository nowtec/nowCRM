export type STRAPI_WEBHOOK_EVENTS =
	| "entry.create"
	| "entry.update"
	| "entry.delete"
	| "entry.publish"
	| "entry.unpublish";

export type triggerData = {
	event: STRAPI_WEBHOOK_EVENTS;
	model: string; // here we have a table which is used
	uid: string; // api which was used exp: api::contact.contact
	createdAt: Date;
	//TODO: think how we can ensyre typing
	entry: any; // entry - data about changed object
};
