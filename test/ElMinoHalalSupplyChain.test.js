const { expect } = require("chai");
const { loadFixture } = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("ElMinoHalalSupplyChain (Part-2)", function () {
  async function deployFixture() {
    const [admin, producer, halalOwner, halalOther, distributor, retailer, other] =
      await ethers.getSigners();

    const Factory = await ethers.getContractFactory("ElMinoHalalSupplyChain");
    const contract = await Factory.deploy();
    await contract.waitForDeployment();

    return {
      contract,
      admin,
      producer,
      halalOwner,
      halalOther,
      distributor,
      retailer,
      other,
    };
  }

  const Roles = {
    None: 0,
    Admin: 1,
    Producer: 2,
    HalalAuthority: 3,
    Distributor: 4,
    Retailer: 5,
  };

  it("Producer creates batch successfully, duplicate batchId reverts", async function () {
    const { contract, admin, producer } = await loadFixture(deployFixture);
    const batchId = "BATCH-001";
    const productName = "Halal Beef";

    // Admin assigns Producer role
    await contract.connect(admin).assignRole(producer.address, Roles.Producer);

    // Producer creates a batch
    await contract.connect(producer).createBatch(batchId, productName);
    expect(await contract.isBatchExists(batchId)).to.equal(true);

    // Duplicate batchId should revert
    await expect(
      contract.connect(producer).createBatch(batchId, productName)
    ).to.be.revertedWith("Duplicate batchId");
  });

  it("Transfer sequence enforcement (Producer -> HalalAuthority -> Distributor)", async function () {
    const { contract, admin, producer, halalOwner, distributor } = await loadFixture(
      deployFixture
    );
    const batchId = "BATCH-SEQ";

    // Assign roles needed for the sequence test
    await contract.connect(admin).assignRole(producer.address, Roles.Producer);
    await contract
      .connect(admin)
      .assignRole(halalOwner.address, Roles.HalalAuthority);
    await contract
      .connect(admin)
      .assignRole(distributor.address, Roles.Distributor);

    await contract.connect(producer).createBatch(batchId, "Olive Oil");

    // Producer cannot transfer directly to Distributor
    await expect(
      contract.connect(producer).transferBatch(batchId, distributor.address)
    ).to.be.revertedWith("Producer -> HalalAuthority only");

    // Producer -> HalalAuthority works, ownership updates
    await contract.connect(producer).transferBatch(batchId, halalOwner.address);
    const batch = await contract.getBatch(batchId);
    expect(batch.currentOwner).to.equal(halalOwner.address);
  });

  it("Halal certification rules (role, ownership, once only)", async function () {
    const { contract, admin, producer, halalOwner, halalOther } = await loadFixture(
      deployFixture
    );
    const batchId = "BATCH-CERT";

    // Assign roles: Producer and two HalalAuthority accounts
    await contract.connect(admin).assignRole(producer.address, Roles.Producer);
    await contract
      .connect(admin)
      .assignRole(halalOwner.address, Roles.HalalAuthority);
    await contract
      .connect(admin)
      .assignRole(halalOther.address, Roles.HalalAuthority);

    await contract.connect(producer).createBatch(batchId, "Dates");
    await contract.connect(producer).transferBatch(batchId, halalOwner.address);

    // Only HalalAuthority can certify
    await expect(
      contract.connect(producer).setHalalCertificate(batchId, "QmCertHash")
    ).to.be.revertedWith("Invalid role for this action");

    // Caller must be current owner
    await expect(
      contract.connect(halalOther).setHalalCertificate(batchId, "QmCertHash")
    ).to.be.revertedWith("Not current owner");

    // Cert can only be set once
    await contract
      .connect(halalOwner)
      .setHalalCertificate(batchId, "QmCertHash");
    await expect(
      contract.connect(halalOwner).setHalalCertificate(batchId, "QmCertHash2")
    ).to.be.revertedWith("Halal already certified");
  });
});
