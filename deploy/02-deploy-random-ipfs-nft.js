const { network } = require("hardhat");
const { developmentChains, networkConfig } = require("../helper-hardhat-config");
const { verify } = require("../utils/verify");
const { storeImages, storeTokenUriMetadata } = require("../utils/uploadToPinata");

const FUND_AMOUNT = "1000000000000000000000";
const imagesLocation = "./images/random";

const metadataTemplate = {
    name: "",
    description: "",
    image: "",
    atributes: [
        {
            trait_type: "Cuteness",
            value: 100,
        },
    ],
};

let tokenUris = [
    "ipfs://QmaVkBn2tKmjbhphU7eyztbvSQU5EXDdqRyXZtRhSGgJGo",
    "ipfs://QmYQC5aGZu2PTH8XzbJrbDnvhj3gVs7ya33H9mqUNvST3d",
    "ipfs://QmZYmH5iDbD6v3U2ixoVAjioSzvWJszDzYdbeCLquGSpVm",
];

module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments;
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    // Upload to Pinata
    if (process.env.UPLOAD_TO_PINATA == "true") {
        tokenUris = await handleTokenUris();
    }

    // VRF Coordinator variables
    let vrfCoordinatorV2Address, subscriptionId, vrfCoordinatorV2Mock;

    if (developmentChains.includes(network.name)) {
        vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock");
        vrfCoordinatorV2Address = vrfCoordinatorV2Mock.address;
        const tx = await vrfCoordinatorV2Mock.createSubscription();
        const txReceipt = await tx.wait(1);
        subscriptionId = txReceipt.events[0].args.subId;
        await vrfCoordinatorV2Mock.fundSubscription(subscriptionId, FUND_AMOUNT);
    } else {
        vrfCoordinatorV2Address = networkConfig[chainId].vrfCoordinatorV2;
        subscriptionId = networkConfig[chainId].subscriptionId;
    }

    log("------------------------------------------------");
    // Arguments for the RandomIpfsContract

    const args = [
        vrfCoordinatorV2Address,
        subscriptionId,
        networkConfig[chainId].gasLane,
        networkConfig[chainId].callbackGasLimit,
        tokenUris,
        networkConfig[chainId].mintFee,
    ];

    const randomIpfsNft = await deploy("RandomIpfsNFT", {
        from: deployer,
        args: args,
        log: true,
        waitConfirmations: network.config.blockConfirmations || 1,
    });
    log("------------------------------------------------");
    if (chainId == 31337) {
        await vrfCoordinatorV2Mock.addConsumer(subscriptionId, randomIpfsNft.address);
    }

    if (!developmentChains.includes(network.name) && process.env.ETHERSCAN_API_KEY) {
        log("Verifying..");
        await verify(randomIpfsNft.address, args);
    }
};

async function handleTokenUris() {
    tokenUris = [];
    //store image in IPFS
    const { responses: imageUploadResponses, files } = await storeImages(imagesLocation);
    for (imageUploadResponseIndex in imageUploadResponses) {
        //create metadata
        let tokenUriMetadata = { ...metadataTemplate };
        tokenUriMetadata.name = files[imageUploadResponseIndex].replace(".png", "");
        tokenUriMetadata.description = `An adorable ${tokenUriMetadata.name}`;
        tokenUriMetadata.image = `ipfs://${imageUploadResponses[imageUploadResponseIndex].IpfsHash}`;
        console.log(`Uploading ${tokenUriMetadata.name}...`);
        //upload the metadata
        const metadataUploadResponse = await storeTokenUriMetadata(tokenUriMetadata);
        tokenUris.push(`ipfs://${metadataUploadResponse.IpfsHash}`);
    }
    console.log("Token URIs uploaded: ");
    console.log(tokenUris);
    return tokenUris;
}

module.exports.tags = ["all", "randomipfs", "main"];
