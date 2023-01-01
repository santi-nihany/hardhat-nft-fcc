// SPDX-License-Identifier: MIT

import "@chainlink/contracts/src/v0.8/interfaces/VRFCoordinatorV2Interface.sol";
import "@chainlink/contracts/src/v0.8/VRFConsumerBaseV2.sol";
import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

pragma solidity ^0.8.7;

error RandomIpfsNft__AlreadyInitialized();
error RandomIpfsNFT__RangeOutOfBounds();
error RandomIpfsNFT__NeedMoreETHSent();
error RandomIpfsNFT__TransferFailed();

contract RandomIpfsNFT is VRFConsumerBaseV2, ERC721URIStorage, Ownable {
    // Type declaration
    enum Breed {
        PUG,
        SHIBA_INU,
        ST_BERNARD
    }
    //Chainlink VRF Variables
    VRFCoordinatorV2Interface private immutable i_vrfCoordinator;
    uint64 private immutable i_subscriptionId;
    bytes32 private immutable i_gasLane;
    uint32 private immutable i_callbackGasLimit;
    uint16 private constant REQUEST_CONFIRMATIONS = 3;
    uint32 private constant NUM_WORDS = 1;

    // VRF Helpers
    mapping(uint256 => address) public s_requestIdToSender;

    // NFT Variables
    uint256 private immutable i_mintFee;
    uint256 private s_tokenCounter;
    uint256 internal constant MAX_CHANCE_VALUE = 100;
    string[] internal s_nftTokenUris;
    bool private s_initialized;

    //Events
    event NftRequested(uint256 indexed requestId, address requester);
    event NftMinted(Breed dogBreed, address minter);

    constructor(
        address vrfCoordinatorV2,
        uint64 subscriptionId,
        bytes32 gasLane,
        uint32 callbackGasLimit,
        string[3] memory nftTokenUris,
        uint256 mintFee
    ) VRFConsumerBaseV2(vrfCoordinatorV2) ERC721("Random IPFS NFT", "RIN") {
        i_vrfCoordinator = VRFCoordinatorV2Interface(vrfCoordinatorV2);
        i_subscriptionId = subscriptionId;
        i_gasLane = gasLane;
        i_callbackGasLimit = callbackGasLimit;
        i_mintFee = mintFee;
        _initializeContract(nftTokenUris);
        s_tokenCounter = 0;
    }

    function requestNFT() public payable returns (uint256 requestId) {
        if (msg.value < i_mintFee) {
            revert RandomIpfsNFT__NeedMoreETHSent();
        }
        requestId = i_vrfCoordinator.requestRandomWords(
            i_gasLane,
            i_subscriptionId,
            REQUEST_CONFIRMATIONS,
            i_callbackGasLimit,
            NUM_WORDS
        );
        // assign the address which requested the NFT to the requestId
        s_requestIdToSender[requestId] = msg.sender;
        // emit event
        emit NftRequested(requestId, msg.sender);
    }

    //Called by the chainlink node
    function fulfillRandomWords(uint256 requestId, uint256[] memory randomWords) internal override {
        address nftOwner = s_requestIdToSender[requestId];
        uint256 newTokenId = s_tokenCounter;
        s_tokenCounter++;

        // number between 0-99
        // 0-10: PUG
        // 10-30: SHIBA
        // 30-100: BERNARD
        uint256 moddedRng = randomWords[0] % MAX_CHANCE_VALUE;

        Breed dogBreed = getBreedFromModdedRng(moddedRng);
        _safeMint(nftOwner, newTokenId);
        _setTokenURI(newTokenId, s_nftTokenUris[uint256(dogBreed)]);
        emit NftMinted(dogBreed, nftOwner);
    }

    function withdraw() public onlyOwner {
        uint256 amount = address(this).balance;
        (bool success, ) = payable(msg.sender).call{value: amount}("");
        if (!success) {
            revert RandomIpfsNFT__TransferFailed();
        }
    }

    function _initializeContract(string[3] memory nftTokenUris) private {
        if (s_initialized) {
            revert RandomIpfsNft__AlreadyInitialized();
        }
        s_nftTokenUris = nftTokenUris;
        s_initialized = true;
    }

    function getBreedFromModdedRng(uint256 moddedRng) public pure returns (Breed b) {
        if (moddedRng > 99) {
            revert RandomIpfsNFT__RangeOutOfBounds();
        }
        uint256 cumulativeSum = 0;
        uint256[3] memory chanceArray = getChanceArray();
        // Determines range of the moddedRng to know the breed
        for (uint256 i = 0; i < chanceArray.length; i++) {
            if ((moddedRng >= cumulativeSum) && (moddedRng < cumulativeSum + chanceArray[i])) {
                return Breed(i);
            }
            cumulativeSum = chanceArray[i];
        }
    }

    function getChanceArray() public pure returns (uint256[3] memory) {
        // 1st NFT (PUG): 10% chance
        // 2nd NFT (SHIBA): 20% chance (30-10)
        // 3rd NFT (ST. BERNARD): 60% chance (100-30-10)

        return [10, 40, MAX_CHANCE_VALUE];
    }

    function getMintFee() public view returns (uint256) {
        return i_mintFee;
    }

    function getNftTokenUri(uint256 i) public view returns (string memory) {
        return s_nftTokenUris[i];
    }

    function getTokenCounter() public view returns (uint256) {
        return s_tokenCounter;
    }

    function getInitialized() public view returns (bool) {
        return s_initialized;
    }
}
