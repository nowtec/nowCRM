export default {
  routes: [
    // Duplicate a organization
    {
      method: 'POST',
      path: '/organizations/duplicate',
      handler: 'organization.duplicate',
    },
  ],
};
