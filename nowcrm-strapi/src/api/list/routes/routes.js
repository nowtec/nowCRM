module.exports = {
  routes: [
    {
      method: 'GET',
      path: '/lists/:id/active-contacts-count',
      handler: 'list.activeContactsCount',
    },
    {
      method: 'POST',
      path: '/lists/duplicate',
      handler: 'list.duplicate',
    },
  ],
};