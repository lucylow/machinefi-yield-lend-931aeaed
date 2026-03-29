const { ethers } = require("hardhat");

async function main() {
    // 1. Deploy MACH token with initial supply
    const MACH = await ethers.getContractFactory("MACH");
    const initialSupply = ethers.parseEther("1000000"); // 1 million MACH
    const mach = await MACH.deploy(initialSupply);
    await mach.waitForDeployment();
    console.log("MACH token deployed to:", await mach.getAddress());

    // 2. Deploy TimelockController
    const Timelock = await ethers.getContractFactory("MachineFiTimelock");
    const minDelay = 172800; // 2 days
    const proposers = []; // will be set after governor deployment
    const executors = []; // can be empty for anyone
    const admin = ethers.ZeroAddress; // Timelock admin, often set to deployer first then revoked
    const timelock = await Timelock.deploy(minDelay, proposers, executors, admin);
    await timelock.waitForDeployment();
    const timelockAddr = await timelock.getAddress();
    console.log("Timelock deployed to:", timelockAddr);

    // 3. Deploy Treasury
    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(timelockAddr);
    await treasury.waitForDeployment();
    console.log("Treasury deployed to:", await treasury.getAddress());
    const treasuryAddr = await treasury.getAddress();

    // 4. Deploy Governor
    const MachineFiGovernor = await ethers.getContractFactory("MachineFiGovernor");
    const votingDelay = 7200; // 1 day (assuming ~12s block time)
    const votingPeriod = 43200; // ~1 week or 3 days depending on block time
    const proposalThreshold = ethers.parseEther("1000"); // 1000 MACH needed to propose

    const quorumNumerator = 4; // 4% of total supply at vote snapshot (GovernorVotesQuorumFraction)
    const initialTrustedTargets = [treasuryAddr];
    const enforceTargetAllowlist = true;

    const governor = await MachineFiGovernor.deploy(
        "MachineFi Governor",
        await mach.getAddress(),
        timelockAddr,
        votingDelay,
        votingPeriod,
        proposalThreshold,
        quorumNumerator,
        initialTrustedTargets,
        enforceTargetAllowlist
    );
    await governor.waitForDeployment();
    const governorAddr = await governor.getAddress();
    console.log("Governor deployed to:", governorAddr);

    // 5. Grant roles: timelock proposers and executors
    const PROPOSER_ROLE = await timelock.PROPOSER_ROLE();
    const EXECUTOR_ROLE = await timelock.EXECUTOR_ROLE();
    const CANCELLER_ROLE = await timelock.CANCELLER_ROLE();

    await timelock.grantRole(PROPOSER_ROLE, governorAddr);
    await timelock.grantRole(EXECUTOR_ROLE, governorAddr);
    await timelock.grantRole(CANCELLER_ROLE, governorAddr);

    // Provide the LendingPool address if it is already deployed, to set the Governor
    // e.g. 
    // const leadingPoolAddress = "FILL_ME_IN";
    // const LendingPool = await ethers.getContractFactory("LendingPool");
    // const lendingPool = LendingPool.attach(leadingPoolAddress);
    // await lendingPool.setGovernor(governorAddr);
    // console.log("Set LendingPool governor role.");

    console.log("Governance setup complete.");
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
