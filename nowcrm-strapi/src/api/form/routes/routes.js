module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/forms/form-submit',
            handler: 'form.formSubmit',
        },
        {
            method: 'POST',
            path: '/forms/duplicate',
            handler: 'form.duplicate',
        }
    ]
}