export default {
  routes: [
    {
      method: 'POST',
      path: '/forms/form-submit',
      handler: 'form.formSubmit',
    },
    {
      method: 'POST',
      path: '/forms/export-results',
      handler: 'form.exportResults',
    },
    {
      method: 'POST',
      path: '/forms/duplicate',
      handler: 'form.duplicate',
    }
  ]
}
