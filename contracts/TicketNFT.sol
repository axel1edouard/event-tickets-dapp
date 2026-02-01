// SPDX-License-Identifier: MIT
pragma solidity ^0.8.28;

import "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract TicketNFT is ERC721URIStorage, Ownable {
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
        uint256 value,
        string memory uri
    ) external onlyOwner {
        require(balanceOf(to) < MAX_TICKETS_PER_WALLET, "Max tickets reached");
        require(block.timestamp >= lastTxAt[to] + COOLDOWN, "Cooldown not finished");

        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);

        // IPFS tokenURI (ex: ipfs://CID)
        _setTokenURI(tokenId, uri);

        TicketData storage d = ticketData[tokenId];
        d.ticketType = t;
        d.value = value;
        d.createdAt = block.timestamp;
        d.lastTransferAt = block.timestamp;
        d.mintedAt = block.timestamp;

        lastTxAt[to] = block.timestamp;
    }

    // OpenZeppelin v5: _update est le point central (mint/transfer/burn)
    function _update(address to, uint256 tokenId, address auth)
        internal
        override(ERC721)
        returns (address from)
    {
        from = super._update(to, tokenId, auth);

        // Mint: from == address(0)
        if (from == address(0)) {
            return from;
        }

        // Burn: to == address(0) (pas utilisé ici, mais on n'empêche pas)
        if (to == address(0)) {
            return from;
        }

        // IMPORTANT: à ce stade, le solde de "to" a déjà été incrémenté par super._update
        require(balanceOf(to) <= MAX_TICKETS_PER_WALLET, "Receiver max tickets reached");

        TicketData storage d = ticketData[tokenId];

        // 1) Lock d'abord
        require(block.timestamp >= d.mintedAt + LOCK_DURATION, "Ticket still locked");

        // 2) Cooldown ensuite (sur l'émetteur)
        require(block.timestamp >= lastTxAt[from] + COOLDOWN, "Cooldown not finished");

        // Mise à jour historique + timestamps
        d.previousOwners.push(from);
        d.lastTransferAt = block.timestamp;

        // Cooldown appliqué aux deux parties
        lastTxAt[from] = block.timestamp;
        lastTxAt[to] = block.timestamp;

        return from;
    }

    // Requis avec ERC721URIStorage
    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    // Requis avec ERC721URIStorage
    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721URIStorage)
        returns (bool)
    {
        return super.supportsInterface(interfaceId);
    }
}
