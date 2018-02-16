const Web3 = require('web3');
const chai = require('chai');
const fs = require('fs');


const assert = chai.assert;
const competitionAbi = JSON.parse(fs.readFileSync('./out/Competition.abi', 'utf8'));
const competitionBin = fs.readFileSync('./out/Competition.bin', 'utf8');
const simpleCertifierAbi = JSON.parse(fs.readFileSync('./out/SimpleCertifier.abi', 'utf8'));
const simpleCertifierBin = fs.readFileSync('./out/SimpleCertifier.bin', 'utf8');
const tokenAbi = JSON.parse(fs.readFileSync('./out/PreminedAsset.abi', 'utf8'));
const tokenBin = fs.readFileSync('./out/PreminedAsset.bin', 'utf8');
const TERMS_AND_CONDITIONS = '0x1a46b45cc849e26bb3159298c3c218ef300d015ed3e23495e77f0e529ce9f69e';

const web3 = new Web3(new Web3.providers.HttpProvider('http://localhost:8545'));

// Helper functions
const sign = async (account) => {
  let sig = await web3.eth.sign(TERMS_AND_CONDITIONS, account);
  sig = sig.substr(2, sig.length);
  const r = `0x${sig.substr(0, 64)}`;
  const s = `0x${sig.substr(64, 64)}`;
  const v = parseFloat(sig.substr(128, 2)) + 27;
  return { r, s, v };
}

const transferAndIncreaseUntilEnd = async (amount) => {
  await token.methods.transfer(competition.options.address, amount).send({ from: deployer, gas: 1000000 })
  // 2 weeks + 1 day, no error handling
  await web3.currentProvider.send({jsonrpc: "2.0", method: "evm_increaseTime", params: [86400*15], id: 0}, (e, r) => {});
}

let accounts;
let deployer;
let oracle;
let fund;
let manager;
let investor1;
let investor2;
let competition;
let simpleCertifier;
let token;

before('Deploy contract', async () => {

  accounts = await web3.eth.getAccounts();
  [deployer, oracle, fund, manager, investor1, investor2] = accounts;
  simpleCertifier = await new web3.eth.Contract(simpleCertifierAbi)
    .deploy({
      data: simpleCertifierBin,
      arguments: [],
    })
    .send({ from: deployer, gas: 4000000 });
  token = await new web3.eth.Contract(tokenAbi)
    .deploy({
      data: tokenBin,
    })
    .send({ from: deployer, gas: 4000000 })

  // Need to know what is the current time stamp to define startTime
  const number = await web3.eth.getBlockNumber();
  const latestBlock = await web3.eth.getBlock(number);

  competition = await new web3.eth.Contract(competitionAbi)
    .deploy({
      data: competitionBin,
      arguments: [token.options.address, oracle, simpleCertifier.options.address, latestBlock.timestamp, 600, 80],
    })
    .send({ from: deployer, gas: 4000000 });

    // TODO: is this really necessary?
    simpleCertifier.setProvider(web3.currentProvider);
    token.setProvider(web3.currentProvider);
    competition.setProvider(web3.currentProvider);
});

describe('Competition', () => {

  it('Check if competition is initialised', async () => {
    assert.equal(await competition.methods.TERMS_AND_CONDITIONS().call(), TERMS_AND_CONDITIONS);
  });

  it('Check if Registration leads to Hopeful Entry', async () => {
    const { r, s, v } = await sign(manager);
    await simpleCertifier.methods
      .certify(investor1)
      .send({ from: deployer, gas: 1000000 });
    await competition.methods
      .registerForCompetition(fund, manager, token.options.address, token.options.address, investor1, 20, v, r, s)
      .send({ from: investor1, gas: 1000000 });
    const hopeful = await competition.methods.hopefuls(0).call();
    assert.equal(hopeful.registrant, investor1);
  });

  it('Check if getHopefulId works', async () => {
    const hopefulId = await competition.methods.getHopefulId(investor1).call();
    assert.equal(hopefulId, 0);
  });

  it('Check if Double Registration fails', async () => {
    let error;
    try {
      const { r, s, v } = await sign(manager);
      await competition.methods
        .registerForCompetition(fund, manager, token.options.address, token.options.address, investor1, 20, v, r, s)
        .send({ from: manager, gas: 1000000 });
    }
    catch (err) { error = err; }
    assert.isDefined(error, 'Exception must be thrown');
  });

  it('Check if Registration fails on non-verified SMS', async () => {
    let error;
    try {
      const { r, s, v } = await sign(manager);
      await competition.methods
        .registerForCompetition(fund, manager, token.options.address, token.options.address, investor2, 20, v, r, s)
        .send({ from: manager, gas: 1000000 });
    }
    catch (err) { error = err; }
    assert.isDefined(error, 'Exception must be thrown');
  });

  it('Check if getCompetitionStatusOfHopefuls works (data integrity check)', async () => {
    const hopefuls = await competition.methods.getCompetitionStatusOfHopefuls().call();

    // All non-empty?
    assert.isTrue(hopefuls[0].length !== 0);
    assert.isTrue(hopefuls[1].length !== 0);
    assert.isTrue(hopefuls[2].length !== 0);
    assert.isTrue(hopefuls[3].length !== 0);

    // Compare all returned arrays with expected results. Must be synced with added competitors.
    assert.isTrue(hopefuls[0].every((elem, idx) => elem === [fund][idx]));  // fundAddrs ok?
    assert.isTrue(hopefuls[1].every((elem, idx) => elem === [manager][idx]));  // fundManagers ok?
    assert.isTrue(hopefuls[2].every((elem) => elem === true));  // all areCompeting?
    assert.isTrue(hopefuls[3].every((elem) => elem === false));  // none areDisqualified?
  });

  it('Check if finalizeAndPayoutForHopeful pays correctly', async () => {
    const hopefulId = await competition.methods.getHopefulId(investor1).call();
    const amount = 1000;
    await transferAndIncreaseUntilEnd(amount);

    await competition.methods
      .finalizeAndPayoutForHopeful(hopefulId, amount, 10, 1)
      .send({ from: oracle, gas: 1000000 });
    const balance = await token.methods.balanceOf(investor1).call();
    assert.equal(balance, amount);
  });

  it('Check if finalizeAndPayoutForHopeful for disqualified fails', async () => {
    const hopefulId = await competition.methods.getHopefulId(investor1).call();
    const amount = 1000;
    await transferAndIncreaseUntilEnd(amount);
    await competition.methods
      .disqualifyHopeful(hopefulId)
      .send({ from: oracle, gas: 1000000 });

    let error;
    try {
      await competition.methods
        .finalizeAndPayoutForHopeful(hopefulId, amount, 10, 1)
        .send({ from: oracle, gas: 1000000 });
    }
    catch (err) { error = err; }
    assert.isDefined(error, 'Exception must be thrown');
  });
});
