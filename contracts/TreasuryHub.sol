// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

/// @notice Formal treasury balance sheet: one stablecoin, five governance-controlled categories.
/// @dev `RevenueRouter` (or any payer) calls `creditFromRouter` after fees arrive; withdrawals are timelock/executor gated.
contract TreasuryHub is AccessControl {
    using SafeERC20 for IERC20;

    bytes32 public constant GOVERNANCE_ROLE = keccak256("GOVERNANCE_ROLE");
    bytes32 public constant ROUTER_ROLE = keccak256("ROUTER_ROLE");
    bytes32 public constant EXECUTOR_ROLE = keccak256("EXECUTOR_ROLE");

    IERC20 public immutable asset;

    enum Category {
        ProtocolRevenue,
        ReserveCapital,
        Operational,
        Incentives,
        InsuranceBackstop
    }

    mapping(Category => uint256) public balanceOfCategory;

    struct TreasuryBucketBps {
        uint16 protocolRevenue;
        uint16 reserveCapital;
        uint16 operational;
        uint16 incentives;
        uint16 insuranceBackstop;
    }

    TreasuryBucketBps public buckets;

    uint256 public totalCredited;

    event TreasuryRevenueReceived(uint256 grossAmount, uint256 timestamp);
    event TreasuryAllocated(Category indexed category, uint256 amount, uint256 newBalance);
    event TreasuryBucketsUpdated(
        uint16 protocolRevenue,
        uint16 reserveCapital,
        uint16 operational,
        uint16 incentives,
        uint16 insuranceBackstop
    );
    event TreasuryWithdrawal(Category indexed category, address indexed to, uint256 amount);
    event TreasurySpendingApproved(Category indexed category, address indexed to, uint256 amount, string memo);

    constructor(address _asset, address admin, address router) {
        require(_asset != address(0) && admin != address(0), "TreasuryHub: zero");
        asset = IERC20(_asset);
        _grantRole(DEFAULT_ADMIN_ROLE, admin);
        _grantRole(GOVERNANCE_ROLE, admin);
        _grantRole(EXECUTOR_ROLE, admin);
        if (router != address(0)) {
            _grantRole(ROUTER_ROLE, router);
        }
        buckets = TreasuryBucketBps(3000, 3500, 1500, 1000, 1000);
    }

    function grantRouter(address router) external onlyRole(GOVERNANCE_ROLE) {
        _grantRole(ROUTER_ROLE, router);
    }

    function setBuckets(
        uint16 protocolRevenue,
        uint16 reserveCapital,
        uint16 operational,
        uint16 incentives,
        uint16 insuranceBackstop
    ) external onlyRole(GOVERNANCE_ROLE) {
        require(
            uint256(protocolRevenue) + reserveCapital + operational + incentives + insuranceBackstop == 10000,
            "TreasuryHub: bps"
        );
        buckets = TreasuryBucketBps(protocolRevenue, reserveCapital, operational, incentives, insuranceBackstop);
        emit TreasuryBucketsUpdated(protocolRevenue, reserveCapital, operational, incentives, insuranceBackstop);
    }

    /// @notice Pulls `amount` from caller (typically `RevenueRouter`) and credits internal categories.
    function creditFromRouter(uint256 amount) external onlyRole(ROUTER_ROLE) {
        if (amount == 0) return;
        asset.safeTransferFrom(msg.sender, address(this), amount);
        _allocate(amount);
    }

    /// @notice Direct donation / manual top-up with same category split (optional operational path).
    function creditInbound(uint256 amount) external {
        if (amount == 0) return;
        asset.safeTransferFrom(msg.sender, address(this), amount);
        _allocate(amount);
    }

    function _allocate(uint256 amount) internal {
        TreasuryBucketBps memory b = buckets;
        uint256 toPR = (amount * b.protocolRevenue) / 10000;
        uint256 toRC = (amount * b.reserveCapital) / 10000;
        uint256 toOp = (amount * b.operational) / 10000;
        uint256 toInc = (amount * b.incentives) / 10000;
        uint256 toIns = amount - toPR - toRC - toOp - toInc;

        balanceOfCategory[Category.ProtocolRevenue] += toPR;
        balanceOfCategory[Category.ReserveCapital] += toRC;
        balanceOfCategory[Category.Operational] += toOp;
        balanceOfCategory[Category.Incentives] += toInc;
        balanceOfCategory[Category.InsuranceBackstop] += toIns;

        totalCredited += amount;
        emit TreasuryRevenueReceived(amount, block.timestamp);
        emit TreasuryAllocated(Category.ProtocolRevenue, toPR, balanceOfCategory[Category.ProtocolRevenue]);
        emit TreasuryAllocated(Category.ReserveCapital, toRC, balanceOfCategory[Category.ReserveCapital]);
        emit TreasuryAllocated(Category.Operational, toOp, balanceOfCategory[Category.Operational]);
        emit TreasuryAllocated(Category.Incentives, toInc, balanceOfCategory[Category.Incentives]);
        emit TreasuryAllocated(Category.InsuranceBackstop, toIns, balanceOfCategory[Category.InsuranceBackstop]);
    }

    function withdraw(
        Category category,
        address to,
        uint256 amount,
        string calldata memo
    ) external onlyRole(EXECUTOR_ROLE) {
        require(to != address(0), "TreasuryHub: zero to");
        uint256 bal = balanceOfCategory[category];
        require(bal >= amount, "TreasuryHub: insufficient");
        balanceOfCategory[category] = bal - amount;
        asset.safeTransfer(to, amount);
        emit TreasuryWithdrawal(category, to, amount);
        emit TreasurySpendingApproved(category, to, amount, memo);
    }

    function totalBalance() external view returns (uint256) {
        return asset.balanceOf(address(this));
    }
}
