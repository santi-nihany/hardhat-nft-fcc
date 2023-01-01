const { ethers, network } = require("hardhat");

module.exports = async function ({ getNamedAccounts }) {
    const { deployer } = await getNamedAccounts();
    const chainId = network.config.chainId;

    // Basic NFT
    const basicNft = await ethers.getContract("BasicNFT", deployer);
    const basicMintTx = await basicNft.mintNFT();
    await basicMintTx.wait(1);
    console.log(`Basic NFT index 0 has tokenURI: ${await basicNft.tokenURI(0)}`);

    // Dynamic SVG NFT
    const dynamicSvgNft = await ethers.getContract("DynamicSvgNft", deployer);
    const highValue = ethers.utils.parseEther("1200");
    const dynamicSvgMintTx = await dynamicSvgNft.mintNft(highValue.toString());
    await dynamicSvgMintTx.wait(1);
    console.log(`Dynamic SVG NFT  index 1 has tokenURI: ${await dynamicSvgNft.tokenURI(1)}`);

    // Random IPFS NFT
    const randomIpfsNft = await ethers.getContract("RandomIpfsNFT", deployer);
    const mintFee = await randomIpfsNft.getMintFee();
    const randomIpfsNftMintTx = await randomIpfsNft.requestNFT({ value: mintFee.toString() });
    const randomIpfsNftMintTxReceipt = await randomIpfsNftMintTx.wait(1);
    /// Need to listen for response
    await new Promise(async (resolve, reject) => {
        randomIpfsNft.once("NftMinted", async () => {
            resolve();
        });
        setTimeout(() => reject("Timeout: 'NFTMinted' event did not fire"), 300000); // 5 minute timeout time
        /// setup listener for our event
        if (chainId == 31337) {
            const requestId = randomIpfsNftMintTxReceipt.events[1].args.requestId.toString();
            const vrfCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer);
            await vrfCoordinatorV2Mock.fulfillRandomWords(requestId, randomIpfsNft.address);
        }
    });
    console.log(`Random IPFS NFT  index 0 has tokenURI: ${await randomIpfsNft.tokenURI(0)}`);
};

module.exports.tags = ["all", "mint"];
