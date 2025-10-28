module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/compositions/create-reference',
            handler: 'composition.createReference',
        },
        {
            method: 'POST',
            path: '/compositions/duplicate',
            handler: 'composition.duplicate',
        }
    ]
}