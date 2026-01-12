// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * =================================================================================================
 *  El Mino - Halal Supply Chain Tracking (Part 1)
 *
 *  Minimum Requirements Covered (from Overall specification file in Italeem):
 *  1) Roles: producer, halalAuthority, distributor, retailer (+ admin deployer)
 *  2) Batch Data: productName, batchId, producer, currentOwner, status, halalCertHash, createdAt
 *  3) Core Functions:
 *     - createBatch(batchId, productName) -> only producer
 *     - setHalalCertificate(batchId, certHash) -> only halalAuthority (and must own batch)
 *     - updateStatus(batchId, newStatus) -> only currentOwner OR authorized roles
 *     - transferBatch(batchId, to) -> enforce sequence
 *     - getBatch(batchId) -> returns full details
 *  4) Events: BatchCreated, HalalCertified, StatusUpdated, BatchTransferred
 * =================================================================================================
 */

contract ElMinoHalalSupplyChain {

    // ROLES & ACCESS CONTROL
    /**
     * Role values (important for Remix testing):
     * 0 = None
     * 1 = Admin (deployer)
     * 2 = Producer
     * 3 = HalalAuthority
     * 4 = Distributor
     * 5 = Retailer
     */
    enum Role { None, Admin, Producer, HalalAuthority, Distributor, Retailer }

    /// Contract deployer becomes Admin
    address public admin;

    /// Store role of each address
    mapping(address => Role) public roles;

    /// Admin assigns roles (whitelisting)
    event ActorAuthorized(address indexed actor, Role role);

    // BATCH DATA STRUCTURE (as per requirement)
    /**
     * Batch structure:
     * - batchId is string 
     * - status is string ("Produced", "Certified Halal", etc.)
     * - halalCertHash can store hash or IPFS CID
     */
    struct Batch {
        string productName;
        string batchId;

        address producer;
        address currentOwner;

        string status;         // e.g. "Produced", "Certified Halal", "In Transit", "At Retailer"
        string halalCertHash;  // hash / IPFS CID for cert proof

        uint256 createdAt;

        bool exists;           // prevents duplicates
        bool halalCertified;   // prevents multiple halal certifications
    }

    /// Store batches using batchId (string) as key
    mapping(string => Batch) private batches;

    // REQUIRED EVENTS
    event BatchCreated(string indexed batchId, string productName, address indexed producer);
    event HalalCertified(string indexed batchId, string certHash, address indexed halalAuthority);
    event StatusUpdated(string indexed batchId, string newStatus, address indexed updatedBy);
    event BatchTransferred(string indexed batchId, address indexed from, address indexed to);

    // MODIFIERS (VALIDATIONS / ACCESS RULES)

    /// Only Admin
    modifier onlyAdmin() {
        require(msg.sender == admin, "Only admin can call this");
        _;
    }

    /// Only specific role
    modifier onlyRole(Role r) {
        require(roles[msg.sender] == r, "Invalid role for this action");
        _;
    }

    /// Batch must exist
    modifier batchExists(string memory batchId) {
        require(batches[batchId].exists, "Batch does not exist");
        _;
    }

    /// Only current owner of the batch
    modifier onlyCurrentOwner(string memory batchId) {
        require(batches[batchId].currentOwner == msg.sender, "Not current owner");
        _;
    }

    // CONSTRUCTOR
    constructor() {
        admin = msg.sender;
        roles[msg.sender] = Role.Admin;
        emit ActorAuthorized(msg.sender, Role.Admin);
    }

    // ROLE MANAGEMENT (Admin assigns roles)
    /**
     * assignRole
     * Admin assigns one of: Producer, HalalAuthority, Distributor, Retailer
     */
    function assignRole(address actor, Role role) external onlyAdmin {
        require(actor != address(0), "Zero address not allowed");
        require(role != Role.None, "Role cannot be None");
        require(role != Role.Admin, "Cannot assign Admin role");

        roles[actor] = role;
        emit ActorAuthorized(actor, role);
    }


    // CORE FUNCTION 1: CREATE BATCH (only producer)
    /**
     * createBatch(batchId, productName) — only Producer
     * - prevents duplicates
     * - initializes status as "Produced"
     */
    function createBatch(string calldata batchId, string calldata productName)
        external
        onlyRole(Role.Producer)
    {
        require(bytes(batchId).length > 0, "batchId required");
        require(bytes(productName).length > 0, "productName required");
        require(!batches[batchId].exists, "Duplicate batchId");

        batches[batchId] = Batch({
            productName: productName,
            batchId: batchId,
            producer: msg.sender,
            currentOwner: msg.sender,
            status: "Produced",
            halalCertHash: "",
            createdAt: block.timestamp,
            exists: true,
            halalCertified: false
        });

        emit BatchCreated(batchId, productName, msg.sender);
        emit StatusUpdated(batchId, "Produced", msg.sender);
    }


    // CORE FUNCTION 4: TRANSFER BATCH (enforce sequence)
    /**
     * transferBatch(batchId, to)
     * Enforced sequence (patched):
     * Producer -> HalalAuthority -> Distributor -> Retailer
     *
     * Rules:
     * - batch exists
     * - only currentOwner can transfer
     * - recipient must be authorized
     */
    function transferBatch(string calldata batchId, address to)
        external
        batchExists(batchId)
        onlyCurrentOwner(batchId)
    {
        require(to != address(0), "Zero address");
        require(roles[to] != Role.None, "Recipient not authorized");

        Role fromRole = roles[msg.sender];
        Role toRole = roles[to];

        // Flow includes HalalAuthority
        if (fromRole == Role.Producer) {
            require(toRole == Role.HalalAuthority, "Producer -> HalalAuthority only");
        } else if (fromRole == Role.HalalAuthority) {
            require(toRole == Role.Distributor, "HalalAuthority -> Distributor only");
        } else if (fromRole == Role.Distributor) {
            require(toRole == Role.Retailer, "Distributor -> Retailer only");
        } else {
            revert("This role cannot transfer batch");
        }

        address from = batches[batchId].currentOwner;

        // Update owner + status
        batches[batchId].currentOwner = to;
        batches[batchId].status = "Transferred";

        emit BatchTransferred(batchId, from, to);
        emit StatusUpdated(batchId, "Transferred", msg.sender);
    }


    // CORE FUNCTION 2: HALAL CERTIFICATION (only halalAuthority)
    /**
     * setHalalCertificate(batchId, certHash)
     * - Only HalalAuthority
     * - Must OWN the batch first (onlyCurrentOwner)
     * - Only certify once
     * - Sets status to "Certified Halal"
     */
    function setHalalCertificate(string calldata batchId, string calldata certHash)
        external
        batchExists(batchId)
        onlyRole(Role.HalalAuthority)
        onlyCurrentOwner(batchId) // 
    {
        require(bytes(certHash).length > 0, "certHash required");
        require(!batches[batchId].halalCertified, "Halal already certified");

        batches[batchId].halalCertHash = certHash;
        batches[batchId].halalCertified = true;
        batches[batchId].status = "Certified Halal";

        emit HalalCertified(batchId, certHash, msg.sender);
        emit StatusUpdated(batchId, "Certified Halal", msg.sender);
    }


    // CORE FUNCTION 3: UPDATE STATUS (owner OR authorized roles)
    /**
     * updateStatus(batchId, newStatus)
     * Requirement: only currentOwner OR authorized roles.
     *
     * Implementation:
     * - If caller is currentOwner => allowed
     * - OR if caller has any authorized role (not None) => allowed
     */
    function updateStatus(string calldata batchId, string calldata newStatus)
        external
        batchExists(batchId)
    {
        require(bytes(newStatus).length > 0, "newStatus required");

        bool isOwner = (batches[batchId].currentOwner == msg.sender);
        bool isAuth = (roles[msg.sender] != Role.None);

        require(isOwner || isAuth, "Not allowed to update status");

        batches[batchId].status = newStatus;

        emit StatusUpdated(batchId, newStatus, msg.sender);
    }


    // CORE FUNCTION 5: GET BATCH (Read-only full details)
    /**
     * getBatch(batchId) returns full details for consumer verification
     */
    function getBatch(string calldata batchId)
        external
        view
        batchExists(batchId)
        returns (
            string memory productName,
            string memory id,
            address producer,
            address currentOwner,
            string memory status,
            string memory halalCertHash,
            uint256 createdAt
        )
    {
        Batch storage b = batches[batchId];
        return (
            b.productName,
            b.batchId,
            b.producer,
            b.currentOwner,
            b.status,
            b.halalCertHash,
            b.createdAt
        );
    }


    //  HELPER (good for testing evidence)
    function isBatchExists(string calldata batchId) external view returns (bool) {
        return batches[batchId].exists;
    }
}
