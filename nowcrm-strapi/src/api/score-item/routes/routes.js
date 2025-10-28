module.exports = {
    routes: [
        {
            method: 'POST',
            path: '/score-items/contact-aggregations',
            handler: 'score-item.getScoreAgregations',
        }
    ]
}