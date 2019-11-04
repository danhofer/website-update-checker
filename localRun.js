const lambda = require('./index.js')
const event = require('./localEvent.js')

const thisEvent = new event()

lambda.handler(thisEvent)
