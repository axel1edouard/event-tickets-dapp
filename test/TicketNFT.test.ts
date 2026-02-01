import { expect } from "chai";
import hre from "hardhat";

const URI = "ipfs://bafkreifilrx2wp7uygffeoygkkkhxwkziuhb5blud5hqjo4zcbfamdsvoe";

describe("TicketNFT - Tests métiers", function () {
  async function deployFixture() {
    const { ethers, networkHelpers } = await hre.network.connect();
    const [owner, alice, bob] = await ethers.getSigners();
    const TicketNFT = await ethers.getContractFactory("TicketNFT");
    const ticket = await TicketNFT.deploy();
    await ticket.waitForDeployment();
    return { ticket, owner, alice, bob, networkHelpers };
  }

  it("Mint : un utilisateur ne peut pas avoir plus de 4 tickets", async () => {
    const { ticket, owner, alice, networkHelpers } = await deployFixture();

    for (let i = 0; i < 4; i++) {
      if (i > 0) {
        await networkHelpers.time.increase(5 * 60);
        await networkHelpers.mine();
      }
      await ticket.connect(owner).mintTicket(alice.address, 0, 100, URI);
    }

    expect(await ticket.balanceOf(alice.address)).to.equal(4);

    await networkHelpers.time.increase(5 * 60);
    await networkHelpers.mine();

    await expect(
      ticket.connect(owner).mintTicket(alice.address, 0, 100, URI)
    ).to.be.revertedWith("Max tickets reached");
  });

  it("Lock : impossible de transférer avant 10 minutes après le mint", async () => {
    const { ticket, owner, alice, bob, networkHelpers } = await deployFixture();

    await ticket.connect(owner).mintTicket(alice.address, 1, 200, URI);

    await expect(
      ticket.connect(alice).transferFrom(alice.address, bob.address, 0)
    ).to.be.revertedWith("Ticket still locked");

    await networkHelpers.time.increase(10 * 60);
    await networkHelpers.mine();

    await ticket.connect(alice).transferFrom(alice.address, bob.address, 0);
  });

  it("Cooldown : empêche deux transferts trop rapprochés", async () => {
    const { ticket, owner, alice, bob, networkHelpers } = await deployFixture();

    await ticket.connect(owner).mintTicket(alice.address, 1, 200, URI);

    await networkHelpers.time.increase(10 * 60);
    await networkHelpers.mine();

    await ticket.connect(alice).transferFrom(alice.address, bob.address, 0);

    await expect(
      ticket.connect(bob).transferFrom(bob.address, alice.address, 0)
    ).to.be.revertedWith("Cooldown not finished");

    await networkHelpers.time.increase(5 * 60);
    await networkHelpers.mine();

    await ticket.connect(bob).transferFrom(bob.address, alice.address, 0);
  });

  it("Receiver : impossible de transférer vers un wallet ayant déjà 4 tickets", async () => {
    const { ticket, owner, alice, bob, networkHelpers } = await deployFixture();

    // Bob reçoit 4 tickets
    for (let i = 0; i < 4; i++) {
      if (i > 0) {
        await networkHelpers.time.increase(5 * 60);
        await networkHelpers.mine();
      }
      await ticket.connect(owner).mintTicket(bob.address, 0, 100, URI);
    }

    // Alice reçoit 1 ticket
    await networkHelpers.time.increase(5 * 60);
    await networkHelpers.mine();
    await ticket.connect(owner).mintTicket(alice.address, 0, 100, URI);

    await networkHelpers.time.increase(10 * 60);
    await networkHelpers.mine();

    await expect(
      ticket.connect(alice).transferFrom(alice.address, bob.address, 4)
    ).to.be.revertedWith("Receiver max tickets reached");
  });

  it("tokenURI : le ticket minté a bien une URI IPFS", async () => {
    const { ticket, owner, alice } = await deployFixture();

    await ticket.connect(owner).mintTicket(alice.address, 0, 100, URI);
    expect(await ticket.tokenURI(0)).to.equal(URI);
  });
});
