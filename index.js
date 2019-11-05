const request = require('request')
const md5File = require('md5-file')

const AWS = require('aws-sdk')
AWS.config.apiVersions = { sns: '2010-03-31' }
AWS.config.update({ region: 'us-east-1' })
const sns = new AWS.SNS()

const fs = require('fs')

const url = process.env.URL
const searchString = process.env.SEARCH_STRING
const hashCompare = process.env.HASH_COMPARE
const snsARN = process.env.SNS_ARN

const fileLocation = '/tmp/webpage.html'

async function getWebpage(url) {
    return new Promise(resolve => {
        request(url, (error, response, body) => {
            if (error) console.log('error:', error)

            console.log('Status code of GET request:', response.statusCode)
            resolve(body)
            return
        })
    })
}

async function writeFile(content, location) {
    return new Promise(resolve => {
        fs.writeFile(location, content, err => {
            if (err) return console.log(err)

            console.log('File saved.')
            resolve()
            return
        })
    })
}

async function getHash(content) {
    return new Promise(resolve => {
        const hash = md5File.sync(content)
        console.log(`hash: ${hash}`)
        resolve(hash)
        return
    })
}

function stringCheck(content, string) {
    if (!string || content.indexOf(string) > 0) return true
    else return false
}

function hashCheck(comparisonHash, hashToCheck) {
    if (!comparisonHash || comparisonHash === hashToCheck) return true
    return false
}

async function sendNotification(stringBoolean, hashBoolean, hash) {
    if (stringBoolean && hashBoolean) {
        console.log('No changes to website detected.')
        return
    }

    let notification = `The website has been modified: ${url}\n`

    if (!stringBoolean)
        notification += `The following search string was NOT found on the website: ${searchString}\n`

    if (!hashBoolean)
        notification += `The website hash HAS changed and is now: ${hash}`

    console.log(notification)

    if (snsARN) {
        return new Promise(resolve => {
            sns.publish(
                {
                    Message: notification,
                    TopicArn: snsARN,
                },
                (error, data) => {
                    if (error) console.log(error)

                    console.log(
                        `SNS message sent.Data response from push: ${JSON.stringify(
                            data,
                            '',
                            2
                        )}`
                    )
                    resolve()
                    return
                }
            )
        })
    }
    console.log('No notification sent. SNS not configured.')
}

exports.handler = async event => {
    console.log(event)

    const webPage = await getWebpage(url)

    await writeFile(webPage, fileLocation)

    const hash = await getHash(fileLocation)

    const doesStringExist = stringCheck(webPage, searchString)
    const isHashSame = hashCheck(hashCompare, hash)

    console.log(`doesStringExist: ${doesStringExist}`)
    console.log(`isHashSame: ${isHashSame}`)

    await sendNotification(doesStringExist, isHashSame, hash)
}
