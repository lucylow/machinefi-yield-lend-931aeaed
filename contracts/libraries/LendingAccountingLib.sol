// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

/**
 * @title LendingAccountingLib
 * @notice Single source of truth for borrow interest accrual chunks and health-factor WAD math.
 * @dev Interest accrues linearly on principal by APR (bps), split into LP vs protocol spread.
 *      Health factor (1e18 scale): HF = collateral * liqThresholdBps * WAD / (totalOwed * 10000).
 *      At HF == WAD the position sits exactly at the liquidation LTV line (before grace timing).
 */
library LendingAccountingLib {
    uint256 internal constant WAD = 1e18;
    uint256 internal constant SECONDS_PER_YEAR = 365 days;

    /// @notice Borrower APR interest for `elapsed` seconds; LP and protocol chunks sum to this.
    function accrueInterestChunks(
        uint256 principal,
        uint256 borrowerAprBps,
        uint256 lenderAprBps,
        uint256 elapsed
    )
        internal
        pure
        returns (uint256 lenderChunk, uint256 protocolChunk, uint256 borrowerChunk)
    {
        if (elapsed == 0 || principal == 0) {
            return (0, 0, 0);
        }
        borrowerChunk = (principal * borrowerAprBps * elapsed) / (10000 * SECONDS_PER_YEAR);
        lenderChunk = (principal * lenderAprBps * elapsed) / (10000 * SECONDS_PER_YEAR);
        if (lenderChunk > borrowerChunk) {
            lenderChunk = borrowerChunk;
        }
        protocolChunk = borrowerChunk - lenderChunk;
    }

    /// @return hfWad type(uint256).max if `totalOwed == 0` (no debt); 0 if `collateralValue == 0` with debt
    function healthFactorWad(uint256 collateralValue, uint256 totalOwed, uint256 liquidationThresholdBps)
        internal
        pure
        returns (uint256 hfWad)
    {
        if (totalOwed == 0) {
            return type(uint256).max;
        }
        if (collateralValue == 0) {
            return 0;
        }
        hfWad = (collateralValue * liquidationThresholdBps * WAD) / (totalOwed * 10000);
    }

    /// @param hfWad Output of `healthFactorWad`; `cautionMinWad` > `atRiskMinWad` > `WAD`
    function healthBand(uint256 hfWad, uint256 cautionMinWad, uint256 atRiskMinWad, uint256 wad)
        internal
        pure
        returns (uint8 band)
    {
        if (hfWad == type(uint256).max) return 0; // None / no debt
        if (hfWad >= cautionMinWad) return 1; // Healthy
        if (hfWad >= atRiskMinWad) return 2; // Caution
        if (hfWad >= wad) return 3; // AtRisk (still above liquidation line)
        return 4; // Liquidatable (HF below 1.0)
    }
}
