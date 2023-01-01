const { assert } = require("chai")
const { network, deployments, ethers } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("BasicNFT test", function () {
          let basicNFT, deployer
          beforeEach(async function () {
              accounts = await ethers.getSigners()
              deployer = accounts[0]
              await deployments.fixture(["basicnft"])
              basicNFT = await ethers.getContract("BasicNFT", deployer)
          })
          describe("Constructor", () => {
              it("Initializes the NFT Correctly", async () => {
                  const name = await basicNFT.name()
                  const symbol = await basicNFT.symbol()
                  const tokenCounter = await basicNFT.getTokenCounter()
                  assert.equal(name, "Perrito")
                  assert.equal(symbol, "PERRO")
                  assert.equal(tokenCounter.toString(), "0")
              })
          })
          describe("Mint NFT", () => {
              beforeEach(async () => {
                  const txResponse = await basicNFT.mintNFT()
                  await txResponse.wait(1)
              })
              it("Allows users to mint an NFT, and updates appropriately", async () => {
                  const tokenURI = await basicNFT.tokenURI(0)
                  const tokenCounter = await basicNFT.getTokenCounter()
                  assert.equal(tokenURI, await basicNFT.TOKEN_URI())
                  assert.equal(tokenCounter.toString(), "1")
              })
              it("Show the correct balance and owner of an NFT", async () => {
                  const owner = await basicNFT.ownerOf("0")
                  const deployerAddress = deployer.address
                  const deployerBalance = await basicNFT.balanceOf(deployerAddress)

                  assert.equal(deployerBalance.toString(), "1")
                  assert.equal(owner, deployerAddress)
              })
          })
      })
