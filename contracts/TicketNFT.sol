// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketNFT is ERC721, Ownable {
    enum TicketType { STANDARD, VIP, BACKSTAGE }

    struct TicketData {
        TicketType ticketType;
        uint256 value;
        uint256 createdAt;
        uint256 lastTransferAt;
        address[] previousOwners;
        uint256 mintedAt; // pour le lock 10 min
    }

    uint256 public constant MAX_TICKETS_PER_WALLET = 4;
    uint256 public constant COOLDOWN = 5 minutes;
    uint256 public constant LOCK_DURATION = 10 minutes;

    uint256 private _nextTokenId;

    mapping(uint256 => TicketData) public ticketData;
    mapping(address => uint256) public lastTxAt;

    constructor() ERC721("EventTicket", "ETK") Ownable(msg.sender) {}

    function mintTicket(
        address to,
        TicketType t,
        uint256 value
    ) external onlyOwner {
        require(balanceOf(to) < MAX_TICKETS_PER_WALLET, "Max tickets reached");
        require(block.timestamp >= lastTxAt[to] + COOLDOWN, "Cooldown not finished");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        TicketData storage d = ticketData[tokenId];
        d.ticketType = t;
        d.value = value;
        d.createdAt = block.timestamp;
        d.lastTransferAt = block.timestamp;
        d.mintedAt = block.timestamp;

        lastTxAt[to] = block.timestamp;
    }

    // Hardhat/ethers test-friendly: on garde le contrôle des règles via ce hook
    function _update(address to, uint256 tokenId, address auth)
        internal
        override
        returns (address from)
    {
        from = super._update(to, tokenId, auth);

        // Mint: from == address(0)
        if (from == address(0)) {
            return from;
        }

        // Burn: to == address(0) (on ne l’utilise pas, mais on évite de bloquer)
        if (to == address(0)) {
            return from;
        }

        // Règles transfert
        require(balanceOf(to) < MAX_TICKETS_PER_WALLET, "Receiver max tickets reached");
        require(block.timestamp >= lastTxAt[from] + COOLDOWN, "Cooldown not finished");

        TicketData storage d = ticketData[tokenId];
        require(block.timestamp >= d.mintedAt + LOCK_DURATION, "Ticket still locked");

        d.previousOwners.push(from);
        d.lastTransferAt = block.timestamp;

        lastTxAt[from] = block.timestamp;

        return from;
    }
}
