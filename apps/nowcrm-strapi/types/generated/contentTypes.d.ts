import type { Schema, Struct } from '@strapi/strapi';

export interface AdminApiToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_tokens';
  info: {
    description: '';
    displayName: 'Api Token';
    name: 'Api Token';
    pluralName: 'api-tokens';
    singularName: 'api-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    encryptedKey: Schema.Attribute.Text &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::api-token'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<['read-only', 'full-access', 'custom']> &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'read-only'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminApiTokenPermission extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_api_token_permissions';
  info: {
    description: '';
    displayName: 'API Token Permission';
    name: 'API Token Permission';
    pluralName: 'api-token-permissions';
    singularName: 'api-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::api-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::api-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminPermission extends Struct.CollectionTypeSchema {
  collectionName: 'admin_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'Permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    actionParameters: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    conditions: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<[]>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::permission'> &
      Schema.Attribute.Private;
    properties: Schema.Attribute.JSON & Schema.Attribute.DefaultTo<{}>;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<'manyToOne', 'admin::role'>;
    subject: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminRole extends Struct.CollectionTypeSchema {
  collectionName: 'admin_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'Role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::role'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<'oneToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<'manyToMany', 'admin::user'>;
  };
}

export interface AdminSession extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_sessions';
  info: {
    description: 'Session Manager storage';
    displayName: 'Session';
    name: 'Session';
    pluralName: 'sessions';
    singularName: 'session';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
    i18n: {
      localized: false;
    };
  };
  attributes: {
    absoluteExpiresAt: Schema.Attribute.DateTime & Schema.Attribute.Private;
    childId: Schema.Attribute.String & Schema.Attribute.Private;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    deviceId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    expiresAt: Schema.Attribute.DateTime &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::session'> &
      Schema.Attribute.Private;
    origin: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    sessionId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique;
    status: Schema.Attribute.String & Schema.Attribute.Private;
    type: Schema.Attribute.String & Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    userId: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferToken extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_tokens';
  info: {
    description: '';
    displayName: 'Transfer Token';
    name: 'Transfer Token';
    pluralName: 'transfer-tokens';
    singularName: 'transfer-token';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    accessKey: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }> &
      Schema.Attribute.DefaultTo<''>;
    expiresAt: Schema.Attribute.DateTime;
    lastUsedAt: Schema.Attribute.DateTime;
    lifespan: Schema.Attribute.BigInteger;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminTransferTokenPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_transfer_token_permissions';
  info: {
    description: '';
    displayName: 'Transfer Token Permission';
    name: 'Transfer Token Permission';
    pluralName: 'transfer-token-permissions';
    singularName: 'transfer-token-permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'admin::transfer-token-permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    token: Schema.Attribute.Relation<'manyToOne', 'admin::transfer-token'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface AdminUser extends Struct.CollectionTypeSchema {
  collectionName: 'admin_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'User';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    blocked: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    firstname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    isActive: Schema.Attribute.Boolean &
      Schema.Attribute.Private &
      Schema.Attribute.DefaultTo<false>;
    lastname: Schema.Attribute.String &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'admin::user'> &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    preferedLanguage: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    registrationToken: Schema.Attribute.String & Schema.Attribute.Private;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    roles: Schema.Attribute.Relation<'manyToMany', 'admin::role'> &
      Schema.Attribute.Private;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String;
  };
}

export interface ApiActionScoreItemActionScoreItem
  extends Struct.CollectionTypeSchema {
  collectionName: 'action_score_items';
  info: {
    displayName: 'Action-ScoreItem';
    pluralName: 'action-score-items';
    singularName: 'action-score-item';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    action: Schema.Attribute.Relation<'manyToOne', 'api::action.action'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::action-score-item.action-score-item'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    value: Schema.Attribute.Decimal;
  };
}

export interface ApiActionTypeActionType extends Struct.CollectionTypeSchema {
  collectionName: 'action_types';
  info: {
    displayName: 'ActionType';
    pluralName: 'action-types';
    singularName: 'action-type';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::action-type.action-type'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiActionAction extends Struct.CollectionTypeSchema {
  collectionName: 'actions';
  info: {
    displayName: 'Action';
    pluralName: 'actions';
    singularName: 'action';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    action_type: Schema.Attribute.Relation<
      'oneToOne',
      'api::action-type.action-type'
    >;
    campaign: Schema.Attribute.Relation<'manyToOne', 'api::campaign.campaign'>;
    contact: Schema.Attribute.Relation<'manyToOne', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    effort: Schema.Attribute.Text;
    entity: Schema.Attribute.Text;
    external_id: Schema.Attribute.Text;
    journey_step: Schema.Attribute.Relation<
      'oneToOne',
      'api::journey-step.journey-step'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::action.action'
    > &
      Schema.Attribute.Private;
    partnership: Schema.Attribute.Text;
    payload: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    score_items: Schema.Attribute.Relation<
      'oneToMany',
      'api::action-score-item.action-score-item'
    >;
    source: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    value: Schema.Attribute.Text;
  };
}

export interface ApiActivityLogActivityLog extends Struct.CollectionTypeSchema {
  collectionName: 'activity_logs';
  info: {
    displayName: 'ActivityLog';
    pluralName: 'activity-logs';
    singularName: 'activity-log';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    action: Schema.Attribute.Text;
    contact: Schema.Attribute.Relation<'oneToOne', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::activity-log.activity-log'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users_permissions_user: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiCampaignCategoryCampaignCategory
  extends Struct.CollectionTypeSchema {
  collectionName: 'campaign_categories';
  info: {
    displayName: 'CampaignCategory';
    pluralName: 'campaign-categories';
    singularName: 'campaign-category';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::campaign-category.campaign-category'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCampaignCampaign extends Struct.CollectionTypeSchema {
  collectionName: 'campaigns';
  info: {
    displayName: 'Campaign';
    pluralName: 'campaigns';
    singularName: 'campaign';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    actions: Schema.Attribute.Relation<'oneToMany', 'api::action.action'>;
    campaign_category: Schema.Attribute.Relation<
      'oneToOne',
      'api::campaign-category.campaign-category'
    >;
    compositions: Schema.Attribute.Relation<
      'oneToMany',
      'api::composition.composition'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    donation_transactions: Schema.Attribute.Relation<
      'oneToMany',
      'api::donation-transaction.donation-transaction'
    >;
    journeys: Schema.Attribute.Relation<'oneToMany', 'api::journey.journey'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::campaign.campaign'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiChannelChannel extends Struct.CollectionTypeSchema {
  collectionName: 'channels';
  info: {
    displayName: 'Channel';
    pluralName: 'channels';
    singularName: 'channel';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    editor_text_type: Schema.Attribute.Enumeration<['html', 'text']>;
    file_upload_type: Schema.Attribute.Enumeration<['image', 'all', 'none']>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::channel.channel'
    > &
      Schema.Attribute.Private;
    max_content_lenght: Schema.Attribute.Integer;
    max_sending_quota: Schema.Attribute.Integer;
    max_sending_rate: Schema.Attribute.Integer;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    removeHtml: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    throttle: Schema.Attribute.Integer;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCompositionItemCompositionItem
  extends Struct.CollectionTypeSchema {
  collectionName: 'composition_items';
  info: {
    displayName: 'CompositionItem';
    pluralName: 'composition-items';
    singularName: 'composition-item';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    additional_prompt: Schema.Attribute.Text;
    attached_files: Schema.Attribute.Media<
      'images' | 'files' | 'videos' | 'audios',
      true
    >;
    channel: Schema.Attribute.Relation<'oneToOne', 'api::channel.channel'>;
    composition: Schema.Attribute.Relation<
      'manyToOne',
      'api::composition.composition'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    item_status: Schema.Attribute.Enumeration<
      ['Published', 'Not published', 'Scheduled', 'None']
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::composition-item.composition-item'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    result: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCompositionScheduledCompositionScheduled
  extends Struct.CollectionTypeSchema {
  collectionName: 'composition_scheduleds';
  info: {
    displayName: 'Composition-Scheduled';
    pluralName: 'composition-scheduleds';
    singularName: 'composition-scheduled';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    channel: Schema.Attribute.Relation<'oneToOne', 'api::channel.channel'>;
    color: Schema.Attribute.Text;
    composition: Schema.Attribute.Relation<
      'oneToOne',
      'api::composition.composition'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::composition-scheduled.composition-scheduled'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publish_date: Schema.Attribute.DateTime;
    publishedAt: Schema.Attribute.DateTime;
    scheduled_status: Schema.Attribute.Enumeration<
      ['scheduled', 'processing', 'published']
    >;
    send_to: Schema.Attribute.JSON;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiCompositionComposition extends Struct.CollectionTypeSchema {
  collectionName: 'compositions';
  info: {
    displayName: 'Composition';
    pluralName: 'compositions';
    singularName: 'composition';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    add_unsubscribe: Schema.Attribute.Boolean;
    campaign: Schema.Attribute.Relation<'manyToOne', 'api::campaign.campaign'>;
    category: Schema.Attribute.Text;
    composition_items: Schema.Attribute.Relation<
      'oneToMany',
      'api::composition-item.composition-item'
    >;
    composition_status: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    language: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::composition.composition'
    > &
      Schema.Attribute.Private;
    model: Schema.Attribute.Text;
    name: Schema.Attribute.Text;
    persona: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    reference_prompt: Schema.Attribute.Text;
    reference_result: Schema.Attribute.Text;
    subject: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiConsentConsent extends Struct.CollectionTypeSchema {
  collectionName: 'consents';
  info: {
    description: '';
    displayName: 'Consent';
    pluralName: 'consents';
    singularName: 'consent';
  };
  options: {
    draftAndPublish: true;
  };
  pluginOptions: {
    i18n: {
      localized: true;
    };
  };
  attributes: {
    active: Schema.Attribute.Boolean &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::consent.consent'
    >;
    publishedAt: Schema.Attribute.DateTime;
    text: Schema.Attribute.RichText &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    title: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    version: Schema.Attribute.String &
      Schema.Attribute.SetPluginOptions<{
        i18n: {
          localized: true;
        };
      }>;
  };
}

export interface ApiContactDocumentContactDocument
  extends Struct.CollectionTypeSchema {
  collectionName: 'contact_documents';
  info: {
    displayName: 'Contact-Document';
    pluralName: 'contact-documents';
    singularName: 'contact-document';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    contact: Schema.Attribute.Relation<'manyToOne', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    file: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact-document.contact-document'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiContactInterestContactInterest
  extends Struct.CollectionTypeSchema {
  collectionName: 'contact_interests';
  info: {
    displayName: 'ContactInterest';
    pluralName: 'contact-interests';
    singularName: 'contact-interest';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact-interest.contact-interest'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiContactNoteContactNote extends Struct.CollectionTypeSchema {
  collectionName: 'contact_notes';
  info: {
    displayName: 'Contact-Note';
    pluralName: 'contact-notes';
    singularName: 'contact-note';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    contact: Schema.Attribute.Relation<'manyToOne', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact-note.contact-note'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    text: Schema.Attribute.Blocks;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiContactRankContactRank extends Struct.CollectionTypeSchema {
  collectionName: 'contact_ranks';
  info: {
    displayName: 'ContactRank';
    pluralName: 'contact-ranks';
    singularName: 'contact-rank';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact-rank.contact-rank'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiContactSalutationContactSalutation
  extends Struct.CollectionTypeSchema {
  collectionName: 'contact_salutations';
  info: {
    displayName: 'ContactSalutation';
    pluralName: 'contact-salutations';
    singularName: 'contact-salutation';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact-salutation.contact-salutation'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiContactTitleContactTitle
  extends Struct.CollectionTypeSchema {
  collectionName: 'contact_titles';
  info: {
    displayName: 'ContactTitle';
    pluralName: 'contact-titles';
    singularName: 'contact-title';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact-title.contact-title'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiContactTypeContactType extends Struct.CollectionTypeSchema {
  collectionName: 'contact_types';
  info: {
    displayName: 'ContactType';
    pluralName: 'contact-types';
    singularName: 'contact-type';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact-type.contact-type'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiContactContact extends Struct.CollectionTypeSchema {
  collectionName: 'contacts';
  info: {
    displayName: 'Contact';
    pluralName: 'contacts';
    singularName: 'contact';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    account_created_at: Schema.Attribute.DateTime;
    actions: Schema.Attribute.Relation<'oneToMany', 'api::action.action'>;
    address_line1: Schema.Attribute.Text;
    address_line2: Schema.Attribute.Text;
    birth_date: Schema.Attribute.Date;
    canton: Schema.Attribute.Text;
    connection_degree: Schema.Attribute.Text;
    consent: Schema.Attribute.Relation<'oneToOne', 'api::consent.consent'>;
    contact_documents: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact-document.contact-document'
    >;
    contact_interests: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact-interest.contact-interest'
    >;
    contact_notes: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact-note.contact-note'
    >;
    contact_status: Schema.Attribute.Text;
    contact_types: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact-type.contact-type'
    >;
    country: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    department: Schema.Attribute.Relation<
      'oneToOne',
      'api::department.department'
    >;
    description: Schema.Attribute.Text;
    donation_subscriptions: Schema.Attribute.Relation<
      'oneToMany',
      'api::donation-subscription.donation-subscription'
    >;
    donation_transactions: Schema.Attribute.Relation<
      'oneToMany',
      'api::donation-transaction.donation-transaction'
    >;
    duration_role: Schema.Attribute.Text;
    events: Schema.Attribute.Relation<'oneToMany', 'api::event.event'>;
    facebook_url: Schema.Attribute.Text;
    first_name: Schema.Attribute.Text;
    function: Schema.Attribute.Text;
    gender: Schema.Attribute.Text;
    industry: Schema.Attribute.Relation<'oneToOne', 'api::industry.industry'>;
    job_description: Schema.Attribute.Text;
    job_title: Schema.Attribute.Relation<
      'manyToOne',
      'api::job-title.job-title'
    >;
    journey_passed_steps: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey-passed-step.journey-passed-step'
    >;
    journey_steps: Schema.Attribute.Relation<
      'manyToMany',
      'api::journey-step.journey-step'
    >;
    journeys: Schema.Attribute.Relation<'manyToMany', 'api::journey.journey'>;
    keywords: Schema.Attribute.Relation<'oneToMany', 'api::keyword.keyword'>;
    language: Schema.Attribute.Text;
    last_access: Schema.Attribute.DateTime;
    last_name: Schema.Attribute.Text;
    linkedin_url: Schema.Attribute.Text;
    lists: Schema.Attribute.Relation<'manyToMany', 'api::list.list'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact.contact'
    > &
      Schema.Attribute.Private;
    location: Schema.Attribute.Text;
    media_types: Schema.Attribute.Relation<
      'oneToMany',
      'api::media-type.media-type'
    >;
    mobile_phone: Schema.Attribute.Text;
    organization: Schema.Attribute.Relation<
      'manyToOne',
      'api::organization.organization'
    >;
    phone: Schema.Attribute.Text;
    plz: Schema.Attribute.Text;
    priority: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    ranks: Schema.Attribute.Relation<
      'oneToMany',
      'api::contact-rank.contact-rank'
    >;
    salutation: Schema.Attribute.Relation<
      'oneToOne',
      'api::contact-salutation.contact-salutation'
    >;
    sources: Schema.Attribute.Relation<'oneToMany', 'api::source.source'>;
    subscriptions: Schema.Attribute.Relation<
      'oneToMany',
      'api::subscription.subscription'
    >;
    surveys: Schema.Attribute.Relation<'oneToMany', 'api::survey.survey'>;
    tags: Schema.Attribute.Relation<'oneToMany', 'api::tag.tag'>;
    title: Schema.Attribute.Relation<
      'oneToOne',
      'api::contact-title.contact-title'
    >;
    twitter_url: Schema.Attribute.Text;
    unsubscribe_token: Schema.Attribute.UID;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    website_url: Schema.Attribute.Text;
    zip: Schema.Attribute.Integer;
  };
}

export interface ApiDepartmentDepartment extends Struct.CollectionTypeSchema {
  collectionName: 'departments';
  info: {
    displayName: 'Department';
    pluralName: 'departments';
    singularName: 'department';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::department.department'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDonationSubscriptionDonationSubscription
  extends Struct.CollectionTypeSchema {
  collectionName: 'donation_subscriptions';
  info: {
    displayName: 'DonationSubscription';
    pluralName: 'donation-subscriptions';
    singularName: 'donation-subscription';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    amount: Schema.Attribute.Decimal;
    contact: Schema.Attribute.Relation<'manyToOne', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.Text;
    interval: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::donation-subscription.donation-subscription'
    > &
      Schema.Attribute.Private;
    payment_method: Schema.Attribute.Text;
    payment_provider: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    raw_data: Schema.Attribute.Text;
    subscription_token: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiDonationTransactionDonationTransaction
  extends Struct.CollectionTypeSchema {
  collectionName: 'donation_transactions';
  info: {
    displayName: 'DonationTransaction';
    pluralName: 'donation-transactions';
    singularName: 'donation-transaction';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    amount: Schema.Attribute.Decimal;
    campaign: Schema.Attribute.Relation<'manyToOne', 'api::campaign.campaign'>;
    card_holder_name: Schema.Attribute.Text;
    contact: Schema.Attribute.Relation<'manyToOne', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    currency: Schema.Attribute.Text;
    epp_transaction_id: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::donation-transaction.donation-transaction'
    > &
      Schema.Attribute.Private;
    payment_method: Schema.Attribute.Text;
    payment_provider: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    purpose: Schema.Attribute.Text;
    raw_data: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    user_agent: Schema.Attribute.Text;
    user_ip: Schema.Attribute.Text;
  };
}

export interface ApiEventEvent extends Struct.CollectionTypeSchema {
  collectionName: 'events';
  info: {
    displayName: 'Event';
    pluralName: 'events';
    singularName: 'event';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    action: Schema.Attribute.Text;
    channel: Schema.Attribute.Relation<'oneToOne', 'api::channel.channel'>;
    composition: Schema.Attribute.Relation<
      'oneToOne',
      'api::composition.composition'
    >;
    composition_item: Schema.Attribute.Relation<
      'oneToOne',
      'api::composition-item.composition-item'
    >;
    contact: Schema.Attribute.Relation<'manyToOne', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    destination: Schema.Attribute.Text;
    event_status: Schema.Attribute.String;
    external_id: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::event.event'> &
      Schema.Attribute.Private;
    payload: Schema.Attribute.Text;
    pinpoint_campaign_id: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    source: Schema.Attribute.Text;
    step_id: Schema.Attribute.Text;
    title: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFormItemFormItem extends Struct.CollectionTypeSchema {
  collectionName: 'form_items';
  info: {
    displayName: 'FormItem';
    pluralName: 'form-items';
    singularName: 'form-item';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    form: Schema.Attribute.Relation<'manyToOne', 'api::form.form'>;
    hidden: Schema.Attribute.Boolean;
    label: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::form-item.form-item'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    options: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    rank: Schema.Attribute.BigInteger;
    required: Schema.Attribute.Boolean;
    type: Schema.Attribute.Enumeration<
      [
        'text',
        'email',
        'number',
        'text_area',
        'checkbox',
        'select',
        'date',
        'single_choice',
        'multi_choice',
        'attachment',
        'multi_checkbox',
      ]
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiFormForm extends Struct.CollectionTypeSchema {
  collectionName: 'forms';
  info: {
    displayName: 'Form';
    pluralName: 'forms';
    singularName: 'form';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    active: Schema.Attribute.Boolean;
    brand_color: Schema.Attribute.Text;
    cover: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    excel_url: Schema.Attribute.Text;
    form_items: Schema.Attribute.Relation<
      'oneToMany',
      'api::form-item.form-item'
    >;
    form_view: Schema.Attribute.Boolean;
    google_sheets_url: Schema.Attribute.Text;
    keep_contact: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::form.form'> &
      Schema.Attribute.Private;
    logo: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    name: Schema.Attribute.Text;
    override_contact: Schema.Attribute.Boolean;
    publishedAt: Schema.Attribute.DateTime;
    slug: Schema.Attribute.Text;
    submission_success_text: Schema.Attribute.Text;
    submit_confirm_text: Schema.Attribute.Text;
    submit_text: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    webhook_url: Schema.Attribute.Text;
  };
}

export interface ApiFrequencyFrequency extends Struct.CollectionTypeSchema {
  collectionName: 'frequencies';
  info: {
    displayName: 'Frequency';
    pluralName: 'frequencies';
    singularName: 'frequency';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::frequency.frequency'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiIdentityIdentity extends Struct.CollectionTypeSchema {
  collectionName: 'identities';
  info: {
    displayName: 'Identity';
    pluralName: 'identities';
    singularName: 'identity';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::identity.identity'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiIndustryIndustry extends Struct.CollectionTypeSchema {
  collectionName: 'industries';
  info: {
    displayName: 'Industry';
    pluralName: 'industries';
    singularName: 'industry';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::industry.industry'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiJobTitleJobTitle extends Struct.CollectionTypeSchema {
  collectionName: 'job_titles';
  info: {
    displayName: 'JobTitle';
    pluralName: 'job-titles';
    singularName: 'job-title';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    contacts: Schema.Attribute.Relation<'oneToMany', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::job-title.job-title'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiJourneyPassedStepJourneyPassedStep
  extends Struct.CollectionTypeSchema {
  collectionName: 'journey_passed_steps';
  info: {
    displayName: 'JourneyPassedStep';
    pluralName: 'journey-passed-steps';
    singularName: 'journey-passed-step';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    channel: Schema.Attribute.Relation<'oneToOne', 'api::channel.channel'>;
    composition: Schema.Attribute.Relation<
      'oneToOne',
      'api::composition.composition'
    >;
    contact: Schema.Attribute.Relation<'manyToOne', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    journey: Schema.Attribute.Relation<'manyToOne', 'api::journey.journey'>;
    journey_step: Schema.Attribute.Relation<
      'manyToOne',
      'api::journey-step.journey-step'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey-passed-step.journey-passed-step'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiJourneyStepConnectionJourneyStepConnection
  extends Struct.CollectionTypeSchema {
  collectionName: 'journey_step_connections';
  info: {
    displayName: 'JourneyStepConnection';
    pluralName: 'journey-step-connections';
    singularName: 'journey-step-connection';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    condition_type: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    journey_step_rules: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey-step-rule.journey-step-rule'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey-step-connection.journey-step-connection'
    > &
      Schema.Attribute.Private;
    priority: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    source_step: Schema.Attribute.Relation<
      'manyToOne',
      'api::journey-step.journey-step'
    >;
    target_step: Schema.Attribute.Relation<
      'manyToOne',
      'api::journey-step.journey-step'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiJourneyStepRuleScoreJourneyStepRuleScore
  extends Struct.CollectionTypeSchema {
  collectionName: 'journey_step_rule_scores';
  info: {
    displayName: 'JourneyStepRuleScore';
    pluralName: 'journey-step-rule-scores';
    singularName: 'journey-step-rule-score';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    journey_step_rule: Schema.Attribute.Relation<
      'manyToOne',
      'api::journey-step-rule.journey-step-rule'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey-step-rule-score.journey-step-rule-score'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    value: Schema.Attribute.Text;
  };
}

export interface ApiJourneyStepRuleJourneyStepRule
  extends Struct.CollectionTypeSchema {
  collectionName: 'journey_step_rules';
  info: {
    displayName: 'JourneyStepRule';
    pluralName: 'journey-step-rules';
    singularName: 'journey-step-rule';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    additional_condition: Schema.Attribute.Text;
    additional_data: Schema.Attribute.JSON;
    condition: Schema.Attribute.Text;
    condition_entity: Schema.Attribute.Text;
    condition_operator: Schema.Attribute.Text;
    condition_value: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    journey_step_connection: Schema.Attribute.Relation<
      'manyToOne',
      'api::journey-step-connection.journey-step-connection'
    >;
    journey_step_rule_scores: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey-step-rule-score.journey-step-rule-score'
    >;
    label: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey-step-rule.journey-step-rule'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    ready_condition: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiJourneyStepJourneyStep extends Struct.CollectionTypeSchema {
  collectionName: 'journey_steps';
  info: {
    displayName: 'JourneyStep';
    pluralName: 'journey-steps';
    singularName: 'journey-step';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    additional_data: Schema.Attribute.JSON;
    channel: Schema.Attribute.Relation<'oneToOne', 'api::channel.channel'>;
    composition: Schema.Attribute.Relation<
      'oneToOne',
      'api::composition.composition'
    >;
    connections_from_this_step: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey-step-connection.journey-step-connection'
    >;
    connections_to_this_step: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey-step-connection.journey-step-connection'
    >;
    contacts: Schema.Attribute.Relation<'manyToMany', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    identity: Schema.Attribute.Relation<'oneToOne', 'api::identity.identity'>;
    journey: Schema.Attribute.Relation<'manyToOne', 'api::journey.journey'>;
    journey_passed_steps: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey-passed-step.journey-passed-step'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey-step.journey-step'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.Enumeration<
      ['trigger', 'scheduler-trigger', 'channel', 'wait']
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiJourneyJourney extends Struct.CollectionTypeSchema {
  collectionName: 'journeys';
  info: {
    displayName: 'Journey';
    pluralName: 'journeys';
    singularName: 'journey';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    active: Schema.Attribute.Boolean;
    campaign: Schema.Attribute.Relation<'manyToOne', 'api::campaign.campaign'>;
    contacts: Schema.Attribute.Relation<'manyToMany', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    flow: Schema.Attribute.JSON;
    journey_passed_steps: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey-passed-step.journey-passed-step'
    >;
    journey_steps: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey-step.journey-step'
    >;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::journey.journey'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiKeywordKeyword extends Struct.CollectionTypeSchema {
  collectionName: 'keywords';
  info: {
    displayName: 'Keyword';
    pluralName: 'keywords';
    singularName: 'keyword';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::keyword.keyword'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiListList extends Struct.CollectionTypeSchema {
  collectionName: 'lists';
  info: {
    displayName: 'List';
    pluralName: 'lists';
    singularName: 'list';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    contacts: Schema.Attribute.Relation<'manyToMany', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::list.list'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    tags: Schema.Attribute.Relation<'oneToMany', 'api::tag.tag'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiMediaTypeMediaType extends Struct.CollectionTypeSchema {
  collectionName: 'media_types';
  info: {
    displayName: 'MediaType';
    pluralName: 'media-types';
    singularName: 'media-type';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::media-type.media-type'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiOrganizationTypeOrganizationType
  extends Struct.CollectionTypeSchema {
  collectionName: 'organization_types';
  info: {
    displayName: 'OrganizationType';
    pluralName: 'organization-types';
    singularName: 'organization-type';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::organization-type.organization-type'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiOrganizationOrganization
  extends Struct.CollectionTypeSchema {
  collectionName: 'organizations';
  info: {
    displayName: 'Organization';
    pluralName: 'organizations';
    singularName: 'organization';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    address_line1: Schema.Attribute.Text;
    canton: Schema.Attribute.Text;
    city: Schema.Attribute.Text;
    company_size: Schema.Attribute.Text;
    contact_person: Schema.Attribute.Text;
    contacts: Schema.Attribute.Relation<'oneToMany', 'api::contact.contact'>;
    country: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    email: Schema.Attribute.Email;
    facebook_url: Schema.Attribute.String;
    frequency: Schema.Attribute.Relation<
      'oneToOne',
      'api::frequency.frequency'
    >;
    industry: Schema.Attribute.Relation<'oneToOne', 'api::industry.industry'>;
    instagram_url: Schema.Attribute.String;
    language: Schema.Attribute.String;
    linkedin_url: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::organization.organization'
    > &
      Schema.Attribute.Private;
    location: Schema.Attribute.Text;
    media_type: Schema.Attribute.Relation<
      'oneToOne',
      'api::media-type.media-type'
    >;
    name: Schema.Attribute.Text;
    organization_type: Schema.Attribute.Relation<
      'oneToOne',
      'api::organization-type.organization-type'
    >;
    phone: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    sources: Schema.Attribute.Relation<'oneToMany', 'api::source.source'>;
    tags: Schema.Attribute.Relation<'oneToMany', 'api::tag.tag'>;
    telegram_channel: Schema.Attribute.String;
    telegram_url: Schema.Attribute.String;
    tiktok_url: Schema.Attribute.String;
    twitter_url: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.Text;
    whatsapp_channel: Schema.Attribute.String;
    whatsapp_phone: Schema.Attribute.String;
    zip: Schema.Attribute.Text;
  };
}

export interface ApiSearchHistoryTemplateSearchHistoryTemplate
  extends Struct.CollectionTypeSchema {
  collectionName: 'search_history_templates';
  info: {
    displayName: 'SearchHistory-Template';
    pluralName: 'search-history-templates';
    singularName: 'search-history-template';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    favorite: Schema.Attribute.Boolean;
    filters: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::search-history-template.search-history-template'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    query: Schema.Attribute.JSON;
    type: Schema.Attribute.Enumeration<['contacts', 'organizations']>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiSearchHistorySearchHistory
  extends Struct.CollectionTypeSchema {
  collectionName: 'search_histories';
  info: {
    displayName: 'SearchHistory';
    pluralName: 'search-histories';
    singularName: 'search-history';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    filters: Schema.Attribute.JSON;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::search-history.search-history'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    query: Schema.Attribute.JSON;
    type: Schema.Attribute.Enumeration<['contacts', 'organizations']>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiSettingCredentialSettingCredential
  extends Struct.CollectionTypeSchema {
  collectionName: 'setting_credentials';
  info: {
    displayName: 'Setting-credential';
    pluralName: 'setting-credentials';
    singularName: 'setting-credential';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    access_token: Schema.Attribute.Text;
    client_id: Schema.Attribute.Text;
    client_secret: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    credential_status: Schema.Attribute.Enumeration<
      ['active', 'invalid', 'disconnected']
    >;
    error_message: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::setting-credential.setting-credential'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    organization_urn: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    refresh_token: Schema.Attribute.Text;
    setting: Schema.Attribute.Relation<'manyToOne', 'api::setting.setting'>;
    twitter_access_secret: Schema.Attribute.Text;
    twitter_access_token: Schema.Attribute.Text;
    twitter_app_key: Schema.Attribute.Text;
    twitter_app_secret: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    wp_app_password: Schema.Attribute.Text;
    wp_url: Schema.Attribute.Text;
  };
}

export interface ApiSettingSetting extends Struct.CollectionTypeSchema {
  collectionName: 'settings';
  info: {
    displayName: 'Setting';
    pluralName: 'settings';
    singularName: 'setting';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::setting.setting'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    setting_credentials: Schema.Attribute.Relation<
      'oneToMany',
      'api::setting-credential.setting-credential'
    >;
    subscription: Schema.Attribute.Enumeration<['verify', 'ignore']>;
    subscription_journeys: Schema.Attribute.Enumeration<['verify', 'ignore']>;
    unsubscribe_text: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiSourceSource extends Struct.CollectionTypeSchema {
  collectionName: 'sources';
  info: {
    displayName: 'Source';
    pluralName: 'sources';
    singularName: 'source';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::source.source'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiSubscriptionTypeSubscriptionType
  extends Struct.CollectionTypeSchema {
  collectionName: 'subscription_types';
  info: {
    displayName: 'SubscriptionType';
    pluralName: 'subscription-types';
    singularName: 'subscription-type';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::subscription-type.subscription-type'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiSubscriptionSubscription
  extends Struct.CollectionTypeSchema {
  collectionName: 'subscriptions';
  info: {
    displayName: 'Subscription';
    pluralName: 'subscriptions';
    singularName: 'subscription';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    active: Schema.Attribute.Boolean;
    channel: Schema.Attribute.Relation<'oneToOne', 'api::channel.channel'>;
    consent: Schema.Attribute.Relation<'oneToOne', 'api::consent.consent'>;
    contact: Schema.Attribute.Relation<'manyToOne', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::subscription.subscription'
    > &
      Schema.Attribute.Private;
    period: Schema.Attribute.Integer;
    publishedAt: Schema.Attribute.DateTime;
    subscribed_at: Schema.Attribute.DateTime;
    subscription_type: Schema.Attribute.Relation<
      'oneToOne',
      'api::subscription-type.subscription-type'
    >;
    unsubscribe_token: Schema.Attribute.UID;
    unsubscribed_at: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiSurveyItemSurveyItem extends Struct.CollectionTypeSchema {
  collectionName: 'survey_items';
  info: {
    displayName: 'SurveyItem';
    pluralName: 'survey-items';
    singularName: 'survey-item';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    answer: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    file: Schema.Attribute.Media<'images' | 'files' | 'videos' | 'audios'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::survey-item.survey-item'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    question: Schema.Attribute.Text;
    survey: Schema.Attribute.Relation<'manyToOne', 'api::survey.survey'>;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiSurveySurvey extends Struct.CollectionTypeSchema {
  collectionName: 'surveys';
  info: {
    displayName: 'Survey';
    pluralName: 'surveys';
    singularName: 'survey';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    contact: Schema.Attribute.Relation<'manyToOne', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    form_id: Schema.Attribute.Text;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::survey.survey'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    survey_items: Schema.Attribute.Relation<
      'oneToMany',
      'api::survey-item.survey-item'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiTagTag extends Struct.CollectionTypeSchema {
  collectionName: 'tags';
  info: {
    displayName: 'Tag';
    pluralName: 'tags';
    singularName: 'tag';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    color: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::tag.tag'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiTaskTask extends Struct.CollectionTypeSchema {
  collectionName: 'tasks';
  info: {
    displayName: 'Task';
    pluralName: 'tasks';
    singularName: 'task';
  };
  options: {
    draftAndPublish: true;
  };
  attributes: {
    action: Schema.Attribute.Text;
    contact: Schema.Attribute.Relation<'oneToOne', 'api::contact.contact'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.Text;
    due_date: Schema.Attribute.Date;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<'oneToMany', 'api::task.task'> &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['planned', 'in progress', 'done', 'expired']
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users_permissions_user: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::users-permissions.user'
    >;
  };
}

export interface ApiTextBlockTextBlock extends Struct.CollectionTypeSchema {
  collectionName: 'text_blocks';
  info: {
    displayName: 'TextBlock';
    pluralName: 'text-blocks';
    singularName: 'text-block';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::text-block.text-block'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    text: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface ApiUnipileIdentityUnipileIdentity
  extends Struct.CollectionTypeSchema {
  collectionName: 'unipile_identities';
  info: {
    displayName: 'UnipileIdentity';
    pluralName: 'unipile-identities';
    singularName: 'unipile-identity';
  };
  options: {
    draftAndPublish: false;
  };
  attributes: {
    account_id: Schema.Attribute.Text;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'api::unipile-identity.unipile-identity'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.Text;
    publishedAt: Schema.Attribute.DateTime;
    unipile_status: Schema.Attribute.Text;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesRelease
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_releases';
  info: {
    displayName: 'Release';
    pluralName: 'releases';
    singularName: 'release';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    actions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    >;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    publishedAt: Schema.Attribute.DateTime;
    releasedAt: Schema.Attribute.DateTime;
    scheduledAt: Schema.Attribute.DateTime;
    status: Schema.Attribute.Enumeration<
      ['ready', 'blocked', 'failed', 'done', 'empty']
    > &
      Schema.Attribute.Required;
    timezone: Schema.Attribute.String;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginContentReleasesReleaseAction
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_release_actions';
  info: {
    displayName: 'Release Action';
    pluralName: 'release-actions';
    singularName: 'release-action';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentType: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    entryDocumentId: Schema.Attribute.String;
    isEntryValid: Schema.Attribute.Boolean;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::content-releases.release-action'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    release: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::content-releases.release'
    >;
    type: Schema.Attribute.Enumeration<['publish', 'unpublish']> &
      Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginI18NLocale extends Struct.CollectionTypeSchema {
  collectionName: 'i18n_locale';
  info: {
    collectionName: 'locales';
    description: '';
    displayName: 'Locale';
    pluralName: 'locales';
    singularName: 'locale';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    code: Schema.Attribute.String & Schema.Attribute.Unique;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::i18n.locale'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.SetMinMax<
        {
          max: 50;
          min: 1;
        },
        number
      >;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflow
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows';
  info: {
    description: '';
    displayName: 'Workflow';
    name: 'Workflow';
    pluralName: 'workflows';
    singularName: 'workflow';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    contentTypes: Schema.Attribute.JSON &
      Schema.Attribute.Required &
      Schema.Attribute.DefaultTo<'[]'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    stageRequiredToPublish: Schema.Attribute.Relation<
      'oneToOne',
      'plugin::review-workflows.workflow-stage'
    >;
    stages: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginReviewWorkflowsWorkflowStage
  extends Struct.CollectionTypeSchema {
  collectionName: 'strapi_workflows_stages';
  info: {
    description: '';
    displayName: 'Stages';
    name: 'Workflow Stage';
    pluralName: 'workflow-stages';
    singularName: 'workflow-stage';
  };
  options: {
    draftAndPublish: false;
    version: '1.1.0';
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    color: Schema.Attribute.String & Schema.Attribute.DefaultTo<'#4945FF'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::review-workflows.workflow-stage'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String;
    permissions: Schema.Attribute.Relation<'manyToMany', 'admin::permission'>;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    workflow: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::review-workflows.workflow'
    >;
  };
}

export interface PluginUploadFile extends Struct.CollectionTypeSchema {
  collectionName: 'files';
  info: {
    description: '';
    displayName: 'File';
    pluralName: 'files';
    singularName: 'file';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    alternativeText: Schema.Attribute.String;
    caption: Schema.Attribute.String;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    ext: Schema.Attribute.String;
    folder: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'> &
      Schema.Attribute.Private;
    folderPath: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    formats: Schema.Attribute.JSON;
    hash: Schema.Attribute.String & Schema.Attribute.Required;
    height: Schema.Attribute.Integer;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.file'
    > &
      Schema.Attribute.Private;
    mime: Schema.Attribute.String & Schema.Attribute.Required;
    name: Schema.Attribute.String & Schema.Attribute.Required;
    previewUrl: Schema.Attribute.String;
    provider: Schema.Attribute.String & Schema.Attribute.Required;
    provider_metadata: Schema.Attribute.JSON;
    publishedAt: Schema.Attribute.DateTime;
    related: Schema.Attribute.Relation<'morphToMany'>;
    size: Schema.Attribute.Decimal & Schema.Attribute.Required;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    url: Schema.Attribute.String & Schema.Attribute.Required;
    width: Schema.Attribute.Integer;
  };
}

export interface PluginUploadFolder extends Struct.CollectionTypeSchema {
  collectionName: 'upload_folders';
  info: {
    displayName: 'Folder';
    pluralName: 'folders';
    singularName: 'folder';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    children: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.folder'>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    files: Schema.Attribute.Relation<'oneToMany', 'plugin::upload.file'>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::upload.folder'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    parent: Schema.Attribute.Relation<'manyToOne', 'plugin::upload.folder'>;
    path: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 1;
      }>;
    pathId: Schema.Attribute.Integer &
      Schema.Attribute.Required &
      Schema.Attribute.Unique;
    publishedAt: Schema.Attribute.DateTime;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsPermission
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_permissions';
  info: {
    description: '';
    displayName: 'Permission';
    name: 'permission';
    pluralName: 'permissions';
    singularName: 'permission';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    action: Schema.Attribute.String & Schema.Attribute.Required;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    > &
      Schema.Attribute.Private;
    publishedAt: Schema.Attribute.DateTime;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
  };
}

export interface PluginUsersPermissionsRole
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_roles';
  info: {
    description: '';
    displayName: 'Role';
    name: 'role';
    pluralName: 'roles';
    singularName: 'role';
  };
  options: {
    draftAndPublish: false;
  };
  pluginOptions: {
    'content-manager': {
      visible: false;
    };
    'content-type-builder': {
      visible: false;
    };
  };
  attributes: {
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    description: Schema.Attribute.String;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.role'
    > &
      Schema.Attribute.Private;
    name: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
    permissions: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.permission'
    >;
    publishedAt: Schema.Attribute.DateTime;
    type: Schema.Attribute.String & Schema.Attribute.Unique;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    users: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    >;
  };
}

export interface PluginUsersPermissionsUser
  extends Struct.CollectionTypeSchema {
  collectionName: 'up_users';
  info: {
    description: '';
    displayName: 'User';
    name: 'user';
    pluralName: 'users';
    singularName: 'user';
  };
  options: {
    draftAndPublish: false;
    timestamps: true;
  };
  attributes: {
    blocked: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    confirmationToken: Schema.Attribute.String & Schema.Attribute.Private;
    confirmed: Schema.Attribute.Boolean & Schema.Attribute.DefaultTo<false>;
    createdAt: Schema.Attribute.DateTime;
    createdBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    email: Schema.Attribute.Email &
      Schema.Attribute.Required &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    locale: Schema.Attribute.String & Schema.Attribute.Private;
    localizations: Schema.Attribute.Relation<
      'oneToMany',
      'plugin::users-permissions.user'
    > &
      Schema.Attribute.Private;
    password: Schema.Attribute.Password &
      Schema.Attribute.Private &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 6;
      }>;
    provider: Schema.Attribute.String;
    publishedAt: Schema.Attribute.DateTime;
    resetPasswordToken: Schema.Attribute.String & Schema.Attribute.Private;
    role: Schema.Attribute.Relation<
      'manyToOne',
      'plugin::users-permissions.role'
    >;
    updatedAt: Schema.Attribute.DateTime;
    updatedBy: Schema.Attribute.Relation<'oneToOne', 'admin::user'> &
      Schema.Attribute.Private;
    username: Schema.Attribute.String &
      Schema.Attribute.Required &
      Schema.Attribute.Unique &
      Schema.Attribute.SetMinMaxLength<{
        minLength: 3;
      }>;
  };
}

declare module '@strapi/strapi' {
  export module Public {
    export interface ContentTypeSchemas {
      'admin::api-token': AdminApiToken;
      'admin::api-token-permission': AdminApiTokenPermission;
      'admin::permission': AdminPermission;
      'admin::role': AdminRole;
      'admin::session': AdminSession;
      'admin::transfer-token': AdminTransferToken;
      'admin::transfer-token-permission': AdminTransferTokenPermission;
      'admin::user': AdminUser;
      'api::action-score-item.action-score-item': ApiActionScoreItemActionScoreItem;
      'api::action-type.action-type': ApiActionTypeActionType;
      'api::action.action': ApiActionAction;
      'api::activity-log.activity-log': ApiActivityLogActivityLog;
      'api::campaign-category.campaign-category': ApiCampaignCategoryCampaignCategory;
      'api::campaign.campaign': ApiCampaignCampaign;
      'api::channel.channel': ApiChannelChannel;
      'api::composition-item.composition-item': ApiCompositionItemCompositionItem;
      'api::composition-scheduled.composition-scheduled': ApiCompositionScheduledCompositionScheduled;
      'api::composition.composition': ApiCompositionComposition;
      'api::consent.consent': ApiConsentConsent;
      'api::contact-document.contact-document': ApiContactDocumentContactDocument;
      'api::contact-interest.contact-interest': ApiContactInterestContactInterest;
      'api::contact-note.contact-note': ApiContactNoteContactNote;
      'api::contact-rank.contact-rank': ApiContactRankContactRank;
      'api::contact-salutation.contact-salutation': ApiContactSalutationContactSalutation;
      'api::contact-title.contact-title': ApiContactTitleContactTitle;
      'api::contact-type.contact-type': ApiContactTypeContactType;
      'api::contact.contact': ApiContactContact;
      'api::department.department': ApiDepartmentDepartment;
      'api::donation-subscription.donation-subscription': ApiDonationSubscriptionDonationSubscription;
      'api::donation-transaction.donation-transaction': ApiDonationTransactionDonationTransaction;
      'api::event.event': ApiEventEvent;
      'api::form-item.form-item': ApiFormItemFormItem;
      'api::form.form': ApiFormForm;
      'api::frequency.frequency': ApiFrequencyFrequency;
      'api::identity.identity': ApiIdentityIdentity;
      'api::industry.industry': ApiIndustryIndustry;
      'api::job-title.job-title': ApiJobTitleJobTitle;
      'api::journey-passed-step.journey-passed-step': ApiJourneyPassedStepJourneyPassedStep;
      'api::journey-step-connection.journey-step-connection': ApiJourneyStepConnectionJourneyStepConnection;
      'api::journey-step-rule-score.journey-step-rule-score': ApiJourneyStepRuleScoreJourneyStepRuleScore;
      'api::journey-step-rule.journey-step-rule': ApiJourneyStepRuleJourneyStepRule;
      'api::journey-step.journey-step': ApiJourneyStepJourneyStep;
      'api::journey.journey': ApiJourneyJourney;
      'api::keyword.keyword': ApiKeywordKeyword;
      'api::list.list': ApiListList;
      'api::media-type.media-type': ApiMediaTypeMediaType;
      'api::organization-type.organization-type': ApiOrganizationTypeOrganizationType;
      'api::organization.organization': ApiOrganizationOrganization;
      'api::search-history-template.search-history-template': ApiSearchHistoryTemplateSearchHistoryTemplate;
      'api::search-history.search-history': ApiSearchHistorySearchHistory;
      'api::setting-credential.setting-credential': ApiSettingCredentialSettingCredential;
      'api::setting.setting': ApiSettingSetting;
      'api::source.source': ApiSourceSource;
      'api::subscription-type.subscription-type': ApiSubscriptionTypeSubscriptionType;
      'api::subscription.subscription': ApiSubscriptionSubscription;
      'api::survey-item.survey-item': ApiSurveyItemSurveyItem;
      'api::survey.survey': ApiSurveySurvey;
      'api::tag.tag': ApiTagTag;
      'api::task.task': ApiTaskTask;
      'api::text-block.text-block': ApiTextBlockTextBlock;
      'api::unipile-identity.unipile-identity': ApiUnipileIdentityUnipileIdentity;
      'plugin::content-releases.release': PluginContentReleasesRelease;
      'plugin::content-releases.release-action': PluginContentReleasesReleaseAction;
      'plugin::i18n.locale': PluginI18NLocale;
      'plugin::review-workflows.workflow': PluginReviewWorkflowsWorkflow;
      'plugin::review-workflows.workflow-stage': PluginReviewWorkflowsWorkflowStage;
      'plugin::upload.file': PluginUploadFile;
      'plugin::upload.folder': PluginUploadFolder;
      'plugin::users-permissions.permission': PluginUsersPermissionsPermission;
      'plugin::users-permissions.role': PluginUsersPermissionsRole;
      'plugin::users-permissions.user': PluginUsersPermissionsUser;
    }
  }
}
