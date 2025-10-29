// all entities in strapi have this field except name(name we ommit when it not used for entity)
export type DocumentId = string;

export interface BaseType {
	documentId: DocumentId;
	id: number;
	name: string;
	createdAt: string;
	updatedAt: string;
}

export interface BaseFormType {
	name: string;
	publishedAt: Date;
}
