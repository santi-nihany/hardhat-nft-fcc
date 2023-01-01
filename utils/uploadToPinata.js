const pinataSDK = require("@pinata/sdk")
const path = require("path")
const fs = require("fs")
const console = require("console")
require("dotenv").config

// Pinata Variables
const pinataApiKey = process.env.PINATA_API_KEY
const pinataApiSecret = process.env.PINATA_API_SECRET
const pinata = pinataSDK(pinataApiKey, pinataApiSecret)

async function storeImages(imagesFilePath) {
    const fullImagesPath = path.resolve(imagesFilePath)
    // array of files
    const files = fs.readdirSync(fullImagesPath)
    console.log("FILES:")
    console.log(files)
    let responses = []
    console.log("Uploading to IPFS")
    for (fileIndex in files) {
        console.log(`Working on ${fileIndex}...`)
        const readableStreamForFile = fs.createReadStream(`${fullImagesPath}/${files[fileIndex]}`)
        try {
            // response: ipfs hash of the file
            const response = await pinata.pinFileToIPFS(readableStreamForFile)
            responses.push(response)
        } catch (e) {
            console.log(e)
        }
    }
    return { responses, files }
}

async function storeTokenUriMetadata(metadata) {
    try {
        const response = await pinata.pinJSONToIPFS(metadata)
        return response
    } catch (e) {
        console.log(e)
    }
}

module.exports = { storeImages, storeTokenUriMetadata }
