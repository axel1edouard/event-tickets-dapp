import { expect } from "chai";
import { ethers } from "hardhat";


describe("TicketNFT - Tests métiers", function () {
  async function deployFixture() {
  const [owner, alice, bob] = await ethers.getSigners();
  const TicketNFT = await ethers.getContractFactory("TicketNFT");
  const ticket = await TicketNFT.deploy();
  await ticket.waitForDeployment();
  return { ticket, owner, alice, bob };
}

it("Mint : un utilisateur ne peut pas avoir plus de 4 tickets", async () => {
  const { ticket, owner, alice } = await deployFixture();

  for (let i = 0; i < 4; i++) {
  if (i > 0) {
    await ethers.provider.send("evm_increaseTime", [5 * 60]);
    await ethers.provider.send("evm_mine", []);
  }
  await ticket.connect(owner).mintTicket(alice.address, 0, 100);
}

  expect(await ticket.balanceOf(alice.address)).to.equal(4);

  await ethers.provider.send("evm_increaseTime", [5 * 60]);

  await ethers.provider.send("evm_mine", []);

  await expect(
  ticket.connect(owner).mintTicket(alice.address, 0, 100)
  ).to.be.revertedWith("Max tickets reached");
});

it("Lock : impossible de transférer avant 10 minutes après le mint", async () => {
  const { ticket, owner, alice, bob } = await deployFixture();

  await ticket.connect(owner).mintTicket(alice.address, 1, 200);

  await expect(
    ticket.connect(alice).transferFrom(alice.address, bob.address, 0)
  ).to.be.revertedWith("Ticket still locked");


await ethers.provider.send("evm_increaseTime", [10 * 60]);
await ethers.provider.send("evm_mine", []);

await ticket.connect(alice).transferFrom(alice.address, bob.address, 0);
});


it("Cooldown : empêche deux transferts trop rapprochés", async () => {
  const { ticket, owner, alice, bob } = await deployFixture();

  await ticket.connect(owner).mintTicket(alice.address, 1, 200);

  await ethers.provider.send("evm_increaseTime", [10 * 60]);

  await ethers.provider.send("evm_mine", []);

  await ticket.connect(alice).transferFrom(alice.address, bob.address, 0);

  await expect(
    ticket.connect(bob).transferFrom(bob.address, alice.address, 0)
  ).to.be.revertedWith("Cooldown not finished");


  await ethers.provider.send("evm_increaseTime", [5 * 60]);
  await ethers.provider.send("evm_mine", []);

  await ticket.connect(bob).transferFrom(bob.address, alice.address, 0);
});


it("Receiver : impossible de transférer vers un wallet ayant déjà 4 tickets", async () => {
  const { ticket, owner, alice, bob } = await deployFixture();

// Bob reçoit 4 tickets
for (let i = 0; i < 4; i++) {
  if (i > 0) {
    await ethers.provider.send("evm_increaseTime", [5 * 60]);
    await ethers.provider.send("evm_mine", []);
}
  await ticket.connect(owner).mintTicket(bob.address, 0, 100);
}

// Alice reçoit 1 ticket
await ethers.provider.send("evm_increaseTime", [5 * 60]);
await ethers.provider.send("evm_mine", []);
await ticket.connect(owner).mintTicket(alice.address, 0, 100);

await ethers.provider.send("evm_increaseTime", [10 * 60]);
await ethers.provider.send("evm_mine", []);

await expect(
  ticket.connect(alice).transferFrom(alice.address, bob.address, 4)
).to.be.revertedWith("Receiver max tickets reached");
});
});
