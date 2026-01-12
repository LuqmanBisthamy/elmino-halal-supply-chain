async function main() {
    const Contract = await ethers.getContractFactory("ElMinoHalalSupplyChain");
    const contract = await Contract.deploy();

    await contract.waitForDeployment();

    const address = await contract.getAddress();
    console.log("Contract deployed to:", address);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});