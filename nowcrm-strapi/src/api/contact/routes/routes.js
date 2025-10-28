module.exports = {
  routes: [
    {
      method: 'POST',
      path: '/contacts/export-user-data',
      handler: 'contact.exportUserData'
    },
    {
      method: 'POST',
      path: '/contacts/anonymize-user',
      handler: 'contact.anonymizeUserData'
    },
    // Bulk create contacts
    {
      method: 'POST',
      path: '/contacts/bulk-create',
      handler: 'contact.bulkCreate',
    },
    // Bulk update contacts
    {
      method: 'POST',
      path: '/contacts/bulk-update',
      handler: 'contact.bulkUpdate',
    },
    // Bulk delete contacts
    {
      method: 'POST',
      path: '/contacts/bulk-delete',
      handler: 'contact.bulkDelete',
    },
    // Duplicate a contact
    {
      method: 'POST',
      path: '/contacts/duplicate',
      handler: 'contact.duplicate',
    },
  ],
};
