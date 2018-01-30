const Web3 = require('web3');
const chai = require('chai');
const fs = require('fs');

const assert = chai.assert;
const abi = JSON.parse(fs.readFileSync('./out/Competition.abi', 'utf8'));
const bin = fs.readFileSync('./out/Competition.bin', 'utf8');
const simpleCertifierAbi = JSON.parse(fs.readFileSync('./out/SimpleCertifier.abi', 'utf8'));
const simpleCertifierBin = fs.readFileSync('./out/SimpleCertifier.bin', 'utf8');
const tokenAbi = JSON.parse(fs.readFileSync('./out/ERC20Interface.abi', 'utf8'));
const tokenBin = fs.readFileSync('./out/ERC20Interface.bin', 'utf8');
const TERMS_AND_CONDITIONS = '0x1A46B45CC849E26BB3159298C3C218EF300D015ED3E23495E77F0E529CE9F69E';

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

const sign = async (account) => {
  let sig = await web3.eth.sign(TERMS_AND_CONDITIONS, account);
  sig = sig.substr(2, sig.length);
  const r = `0x${sig.substr(0, 64)}`;
  const s = `0x${sig.substr(64, 64)}`;
  const v = parseFloat(sig.substr(128, 2)) + 27;
  return { r, s, v };
}

let accounts;
let contract;
let simpleCertifier;
let token;

before('Deploy contract', async () => {
  accounts = await web3.eth.getAccounts();
  simpleCertifier = await new web3.eth.Contract(simpleCertifierAbi)
    .deploy({
      data: simpleCertifierBin,
      arguments: [],
    })
    .send({ from: accounts[0], gas: 2000000 });
  token = await new web3.eth.Contract(tokenAbi)
    .deploy({
      data: tokenBin,
      arguments: [10000],
    })
    .send({ from: accounts[0], gas: 2000000 })
  contract = await new web3.eth.Contract(abi)
    .deploy({
      data: bin,
      arguments: [token.options.address, accounts[0], simpleCertifier.options.address, 900000000000, 0, 600, 80],
    })
    .send({ from: accounts[0], gas: 2000000 });
});

describe('Competition', () => {

  it('Check if contract initialised', async () => {
    assert.equal(await contract.methods.MAX_CONTRIBUTION_DURATION().call(), 4 * 7 * 24 * 3600);
    assert.equal(await contract.methods.TERMS_AND_CONDITIONS().call(), TERMS_AND_CONDITIONS);
  });

  it('Check if Registration leads to Hopeful Entry', async () => {
    const { r, s, v } = await sign(accounts[1]);
    await simpleCertifier.methods
      .certify(accounts[1])
      .send({ from: accounts[0], gas: 1000000 });
    await contract.methods
      .registerForCompetition(token.options.address, token.options.address, token.options.address, 20, v, r, s)
      .send({ from: accounts[1], gas: 1000000 });
    const hopeful = await contract.methods.hopefuls(0).call();
    assert.equal(hopeful.registrant, accounts[1]);
  });

  it('Check if getHopefulId works', async () => {
    const hopefulId = await contract.methods.getHopefulId(accounts[1]).call();
    assert.equal(hopefulId, 0);
  });

  it('Check if Double Registration fails', async () => {
    let error;
    try {
      const { r, s, v } = await sign(accounts[1]);
      await contract.methods
        .registerForCompetition(token.options.address, token.options.address, token.options.address, 20, v, r, s)
        .send({ from: accounts[1], gas: 1000000 });
    }
    catch (err) {error = err;}
    assert.isDefined(error, 'Exception must be thrown');
  });

  it('Check if Registration fails on non-verified SMS', async () => {
    let error;
    try {
      const { r, s, v } = await sign(accounts[2]);
      await contract.methods
        .registerForCompetition(token.options.address, token.options.address, token.options.address, 20, v, r, s)
        .send({ from: accounts[2], gas: 1000000 });
    }
    catch (err) {error = err;}
    assert.isDefined(error, 'Exception must be thrown');
  });

  it('Check if isCompeting is set to true on Attestation', async () => {
    await contract.methods
      .attestForHopeful(0, 10 ** 18)
      .send({ from: accounts[0], gas: 1000000 });
    const hopeful = await contract.methods.hopefuls(0).call();
    assert.isTrue(hopeful.isCompeting);
  });

  it('Check if finalizeAndPayoutForHopeful pays correctly', async () => {
    await token.methods.transfer(contract.options.address, 1000).send({ from: accounts[0], gas: 1000000 })
    await contract.methods
      .finalizeAndPayoutForHopeful(0, 1000, 10, 1)
      .send({ from: accounts[0], gas: 1000000 });
    const balance = await token.methods.balanceOf(accounts[1]).call();
    assert.equal(balance, 1000);
  });
});
