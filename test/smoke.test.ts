import { expect } from "chai";
import hre from "hardhat";

const { ethers } = await hre.network.connect();

describe("smoke", function () {
  it("ethers is available", async function () {
    const signers = await ethers.getSigners();
    expect(signers.length).to.be.greaterThan(0);
  });
});
