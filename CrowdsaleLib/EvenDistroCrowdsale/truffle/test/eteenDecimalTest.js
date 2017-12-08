var Promise = require('bluebird');
var time = require('../helpers/time');

const CrowdsaleTestTokenEteenD = artifacts.require("./CrowdsaleTestTokenEteenD");
const EvenDistroTestEteenD = artifacts.require("./EvenDistroTestEteenD.sol");

var saleContract;
var token;
var errorThrown;

contract('Setting Variables', ()=>{
  it("should properly set variables", async () => {
    saleContract = await EvenDistroTestEteenD.deployed();
    token = await CrowdsaleTestTokenEteenD.deployed();
  });
});

contract('CrowdsaleTestTokenEteenD', (accounts) => {

  it("should properly initialize token data", async () => {
    const name = await token.name.call();
    const symbol = await token.symbol.call();
    const decimals = await token.decimals.call();
    const totalSupply = await token.totalSupply.call();

    assert.equal(name.valueOf(), 'Eighteen Decimals', "Name should be set to Eighteen Decimals.");
    assert.equal(symbol.valueOf(), 'ETEEN', "Symbol should be set to ETEEN.");
    assert.equal(decimals.valueOf(), 18, "Decimals should be set to 18.");
    assert.equal(totalSupply.valueOf(), 50000000000000000000000000, "Total supply should reflect 50000000000000000000000000.");
  });
});

/*************************************************************************

This version is testing the even distribution version of the sale where
the cap per address is calculated after all the addresses have registered
and no more registration is allowed

**************************************************************************/

contract('EvenDistroTestEteenD', function(accounts) {
  it("should initialize the even crowdsale contract data", async () => {
      const owner = await saleContract.getOwner.call();
      const tokensPerEth = await saleContract.getTokensPerEth.call();
      const capAmount = await saleContract.getCapAmount.call();
      const startTime = await saleContract.getStartTime.call();
      const endTime = await saleContract.getEndTime.call();
      const exchangeRate = await saleContract.getExchangeRate.call();
      const ownerBalance = await saleContract.getEthRaised.call();
      const saleData = await saleContract.getSaleData.call(0);
      const saleDataEnd = await saleContract.getSaleData.call(endTime.valueOf());

      assert.equal(owner.valueOf(), accounts[5], "Owner should be set to the account 5");
      assert.equal(tokensPerEth.valueOf(), 900000000000000000000, "Tokens per ETH should be 900000000000000000000");
      assert.equal(capAmount.valueOf(), 201000000000000000000, "capAmount should be set to 201000000000000000000 wei");
      assert.equal(endTime.valueOf() - 2592000,startTime.valueOf(), "end time should be 30 days");
      assert.equal(exchangeRate.valueOf(),45000, "exchangeRate should be 45000");
      assert.equal(ownerBalance.valueOf(), 0, "Amount of wei raised in the crowdsale should be zero");
  });

  it("accept tokens from the owner", async () => {
    const tokenTransfer = await token.transfer(saleContract.address, 160000000000000000000000,{ from:accounts[0] });
    const balance = await token.balanceOf.call(saleContract.address);
    assert.equal(balance.valueOf(), 160000000000000000000000,  "crowdsale's token balance should be 50000000000000000000000000!");
  });

  it("should deny non-owner transactions pre-crowdsale, allow user registration, and set exchange rate and address cap", async () => {

    const crowdsaleActive = await saleContract.crowdsaleActive.call();
    assert.equal(crowdsaleActive.valueOf(), false, "Crowsale should not be active!");

    const crowdsaleEnded = await saleContract.crowdsaleEnded.call();
    assert.equal(crowdsaleEnded.valueOf(), false, "Crowsale should not be ended!");

    const withdrawTokens = await saleContract.withdrawTokens({ from:accounts[0] });
    assert.equal(withdrawTokens.logs[0].args.Msg,
                'Sender has no tokens to withdraw!',
                "should give message that token sale has not ended");

    try{
      await saleContract.sendPurchase({ value: 40000000000000000000, from: accounts[1] });
    } catch(e) {
      errorThrown = true;
    }
    assert.isTrue(errorThrown, "should give an error message since sale has not started");
    errorThrown = false;

    try{
      await saleContract.sendPurchase({ value: 20000000000000000000, from: accounts[0] });
    } catch(e) {
      errorThrown = true;
    }
    assert.isTrue(errorThrown, "should give an error message since sale has not started");
    errorThrown = false;

    await saleContract.registerUser(accounts[0],{from:accounts[5]});
    const registerTwice = await saleContract.registerUser(accounts[0],{from:accounts[5]});
    assert.equal(registerTwice.logs[0].args.Msg, 'Registrant address is already registered for the sale!', "Should give error message that the user is already registered");

    const accountZeroReg = await saleContract.isRegistered(accounts[0]);
    assert.equal(accountZeroReg.valueOf(),true, "accounts[0] should be registered");

    const accountOneReg = await saleContract.isRegistered(accounts[1]);
    assert.equal(accountOneReg.valueOf(),false, "accounts[1] should not be registered");

    const accountOneUnreg = await saleContract.unregisterUser(accounts[1],{from:accounts[5]});
    assert.equal(accountOneUnreg.logs[0].args.Msg,
                 'Registrant address not registered for the sale!',
                 "Should give error message that the user is not registered");

    await saleContract.registerUser(accounts[1],{from:accounts[5]});
    const accountOneRegTwo = await saleContract.isRegistered(accounts[1]);
    assert.equal(accountOneRegTwo.valueOf(),true, "accounts[1] should now be registered");

    await saleContract.unregisterUser(accounts[1],{from:accounts[5]});
    const accountOneUnregTwo = await saleContract.isRegistered(accounts[1]);
    assert.equal(accountOneUnregTwo.valueOf(),false, "accounts[1] should now be unregistered");

    await saleContract.registerUser(accounts[1],{from:accounts[5]});
    await saleContract.registerUser(accounts[2],{from:accounts[5]});
    await saleContract.registerUser(accounts[3],{from:accounts[5]});

    let numReg = await saleContract.getNumRegistered.call();
    assert.equal(numReg.valueOf(),4,"Four Users should be registered!");

    await saleContract.unregisterUsers([accounts[0],accounts[1],accounts[2]],{from:accounts[5]});

    const accountOneRegThree = await saleContract.isRegistered(accounts[1]);
    assert.equal(accountOneRegThree.valueOf(),false, "accounts[1] should not be registered");

    numReg = await saleContract.getNumRegistered.call();
    assert.equal(numReg.valueOf(),1,"One User should be registered!");

    await saleContract.registerUsers([accounts[0],accounts[1],accounts[2]],{from:accounts[5]});

    const accountOneRegFour = await saleContract.isRegistered(accounts[1]);
    assert.equal(accountOneRegFour.valueOf(),true, "accounts[1] should be registered");

    numReg = await saleContract.getNumRegistered.call();
    assert.equal(numReg.valueOf(),4,"Four users should be registered!");

  });

  it("moves 2 hours and sets the exchange rate", async () => {
    await time.move(web3, 7200);
    await web3.eth.sendTransaction({from: accounts[3]});
    await saleContract.setTokenExchangeRate(45000,{from:accounts[5]});
  });

  it("move time 3 days and 2 hours", async () => {
    await time.move(web3, 266400);
    await web3.eth.sendTransaction({from: accounts[3]});
  });

  it("denies an exchange rate change after being set", async () => {
    try{
      await saleContract.setTokenExchangeRate(30000,{from:accounts[5]});
    } catch(e) {
      errorThrown = true;
    }
    assert.isTrue(errorThrown, "should give an error message since the rate has been set");
    errorThrown = false;
  });

  it("should have set all values correctly", async () => {
    const exchValue = await saleContract.getExchangeRate.call();
    assert.equal(exchValue.valueOf(), 45000, "exchangeRate should have been set to 45000!");

    const tokensPerEth = await saleContract.getTokensPerEth.call();
    assert.equal(tokensPerEth.valueOf(), 900000000000000000000, "tokensPerEth should have been set to 900000000000000000000!");

    const addrCap = await saleContract.getAddressTokenCap.call();
    assert.equal(addrCap.valueOf(),
                 40000000000000000000000,
                 "Address token cap should have been calculated to correct number!");

  });

  it("should deny invalid payments during the sale and accept payments that are reflected in token balance", async () => {

    let withdraw = await saleContract.withdrawTokens({from:accounts[0]});
    assert.equal(withdraw.logs[0].args.Msg,
                 'Sender has no tokens to withdraw!',
                 "should give message that the sender cannot withdraw any tokens");

    withdraw = await saleContract.withdrawLeftoverWei({from:accounts[3]});
    assert.equal(withdraw.logs[0].args.Msg,
                 'Sender has no extra wei to withdraw!',
                 "should give message that the sender cannot withdraw any wei");


    let tokenPurchase = await saleContract.sendPurchase({value:39990000000000000000,from:accounts[0]});
    withdraw = await saleContract.getLeftoverWei.call(accounts[0]);
    assert.equal(withdraw.valueOf(),0, "should show that accounts0 has 0 leftover wei");

    let contrib = await saleContract.getContribution.call(accounts[0], {from:accounts[0]});
    assert.equal(contrib.valueOf(),39990000000000000000, "accounts[0] amount of wei contributed should be 39990000000000000000 wei");

    tokenPurchase = await saleContract.getTokenPurchase.call(accounts[0]);
    assert.equal(tokenPurchase.valueOf(), 35991000000000000000000, "accounts[0] tokens purchased should be 35991000000000000000000");

    try{
      await saleContract.sendPurchase({from:accounts[0]});
    } catch(e) {
      errorThrown = true;
    }
    assert.isTrue(errorThrown, "should give an error message since no value was sent");
    errorThrown = false;

    tokenPurchase = await saleContract.sendPurchase({value:67000000000000000000,from:accounts[2]});
    const tAmount = await saleContract.getSaleData.call(new Date().valueOf()/1000);
    console.log(tAmount.valueOf());
    leftover = await saleContract.getLeftoverWei.call(accounts[2]);
    assert.equal(leftover.valueOf(),100, "should show that accounts2 has 100 leftover wei");

    tokenPurchase = await saleContract.sendPurchase({value:5000000000000000000,from:accounts[2]});
    assert.equal(withdraw.logs[0].args.Msg,
                 "Cannot but anymore tokens!",
                 "should give message that owner cannot withdraw tokens");

    leftover = await saleContract.getLeftoverWei.call(accounts[0], {from:accounts[0]});
    assert.equal(leftover.valueOf(),0, "should show that accounts0 has 0 leftover wei");

    withdraw = await saleContract.withdrawTokens({from:accounts[5]});
    assert.equal(withdraw.logs[0].args.Msg,
                 "Owner cannot withdraw extra tokens until after the sale!",
                 "should give message that owner cannot withdraw tokens");

    withdraw = await saleContract.withdrawOwnerEth({from:accounts[5]});
    assert.equal(withdraw.logs[0].args.Msg,
                 "Cannot withdraw owner ether until after the sale!",
                 "should give message that owner cannot withdraw ether");
  });

  it("move time 8 days", async () => {
    await time.move(web3, 691200);
    await web3.eth.sendTransaction({from: accounts[3]});
  });

  it("should update the token price", async () => {
    await saleContract.sendPurchase({value:1000000000000000000,from:accounts[1]});
    const tokensPerEth = await saleContract.getTokensPerEth.call();
    assert.equal(tokensPerEth.valueOf(),0, "");
  });

  it("move time 22 days and 1 hour", async () => {
    await time.move(web3, 1900800);
    await web3.eth.sendTransaction({from: accounts[3]});
  });


  ///********************************************************
  //  AFTER SALE
  //******************************************************
  it("should deny payments after the sale and allow users to withdraw their tokens/owner to withdraw ether", async () => {

    const active = await saleContract.crowdsaleActive.call();
    assert.equal(active.valueOf(), false, "Crowsale should not be active!");

    const ended = await saleContract.crowdsaleEnded.call();
    assert.equal(ended.valueOf(), true, "Crowsale should be ended!");

    const regUser = await saleContract.registerUser(accounts[4],{from:accounts[5]});
    assert.equal(regUser.logs[0].args.Msg,
                 'Can only register users earlier than 2 hours before the sale!',
                 "Should give an error that users cannot be registered close to the sale");

    const unregUser = await saleContract.unregisterUser(accounts[1],{from:accounts[5]});
    assert.equal(unregUser.logs[0].args.Msg, 'Can only unregister users earlier than 2 hours before the sale!', "Should give an error that users cannot be unregistered close to the sale");

    let tokenPurchase = await saleContract.getTokenPurchase.call(accounts[0],{from:accounts[0]});
    assert.equal(tokenPurchase.valueOf(),35991000000000000000000, "accounts[0] amount of tokens purchased should be 35991000000000000000000 tokens");

    tokenPurchase = await saleContract.getTokenPurchase.call(accounts[3],{from:accounts[3]});
    assert.equal(tokenPurchase.valueOf(),0,"accounts[3] should have withdrawn all tokens and should now have zero in the contract");

    withdraw = await saleContract.withdrawOwnerEth({from:accounts[5]});
    assert.equal(withdraw.logs[0].args.Msg,
                 'Crowdsale owner has withdrawn all funds!',
                 "Should give message that the owner has withdrawn all funds");


    //******************
    //* TOKEN CONTRACT BALANCE CHECKS
    //******************

    balance = await token.balanceOf.call(accounts[2],{from:accounts[2]});
    assert.equal(balance.valueOf(), 0, "accounts2 token balance should be 0");

    balance = await token.balanceOf.call(accounts[4],{from:accounts[4]});
    assert.equal(balance.valueOf(), 0, "accounts4 token balance should be 0");

    balance = await token.balanceOf.call(saleContract.address);
    assert.equal(balance.valueOf(), 50000000000000000000000000,  "crowdsale's token balance should be 50000000000000000000000000!");

    tokenPurchase = await saleContract.getTokenPurchase.call(accounts[5],{from:accounts[5]});
    assert.equal(tokenPurchase.valueOf(),49964009000000000000000000, "Owners available tokens to withdraw should be 49964009000000000000000000");

    const tokensSold = await saleContract.getTokensSold.call();
    assert.equal(tokensSold.valueOf(),35991000000000000000000, "35991000000000000000000 tokens should have been sold.")

    withdraw = await saleContract.withdrawTokens({from:accounts[5]});

    tokenPurchase = await saleContract.getTokenPurchase.call(accounts[5],{from:accounts[5]});
    assert.equal(tokenPurchase.valueOf(),0, "Owner should have withdrawn all the leftover tokens from the sale!");

    balance = await token.balanceOf.call(accounts[5],{from:accounts[5]});
    assert.equal(balance.valueOf(), 0, "accounts5 token balance should be 0 because all tokens were burned");

    await saleContract.withdrawTokens({from:accounts[0]});
    balance = await token.balanceOf.call(saleContract.address);
    assert.equal(balance.valueOf(), 0,  "crowdsale's token balance should be 0!");

    const initSupply = await token.initialSupply();
    assert.equal(initSupply.valueOf(), 50000000000000000000000000,  "The token's initial supply was 50M");

    const totalSupply = await token.totalSupply();
    assert.equal(totalSupply.valueOf(), 35991000000000000000000,  "The token's new supply is 35991000000000000000000");
  });
});



/******************************************************************************
*
*  This version is for testing when the contract is deployed with a static address
*  cap and allows buyer registration before and during the sale
*
*******************************************************************************/
/*contract('TimeEvenDistroCrowdsaleTestContract', function(accounts) {
  it("should initialize the even crowdsale contract data", function() {
    var returnObj = {};
    var c;

    return TimeEvenDistroCrowdsaleTestContract.deployed().then(function(instance) {
      c = instance;

      return c.owner.call();
    }).then(function(o){
      returnObj.owner = o;
      return c.tokensPerEth.call();
    }).then(function(tpe) {
      returnObj.tokensPerEth = tpe;
      return c.capAmount.call();
    }).then(function(ca){
      returnObj.capAmount = ca;
      return c.startTime.call();
    }).then(function(st){
      returnObj.startTime = st;
      return c.endTime.call();
    }).then(function(et){
      returnObj.endTime = et;
      return c.capPercentMultiplier.call();
    }).then(function(pm) {
      returnObj.pm = pm;
      return c.exchangeRate.call();
    }).then(function(er) {
      returnObj.exchangeRate = er;
      return c.changeInterval.call();
    }).then(function(ci) {
      returnObj.changeInterval = ci;
      return c.percentBurn.call();
    }).then(function(pb) {
      returnObj.percentBurn = pb;
      return c.ownerBalance.call();
    }).then(function(ob){
      returnObj.ownerBalance = ob;
      assert.equal(returnObj.owner.valueOf(), accounts[5], "Owner should be set to the account5");
      assert.equal(returnObj.tokensPerEth.valueOf(), 206, "Tokens per ETH should be 205");
      assert.equal(returnObj.capAmount.valueOf(), 58621000000000000000000, "capAmount should be set to 56821000000000000000000 wei");
      assert.equal(returnObj.pm.valueOf(), 100, "Address Cap percentage multiplier should be 250!");
      assert.equal(returnObj.startTime.valueOf(),105, "start time should be 105");
      assert.equal(returnObj.endTime.valueOf(),125, "end time should be 125");
      assert.equal(returnObj.exchangeRate.valueOf(),29000, "exchangeRate should be 29000");
      assert.equal(returnObj.changeInterval.valueOf(),0, "changeInterval should be 5");
      assert.equal(returnObj.ownerBalance.valueOf(), 0, "Amount of wei raised in the crowdsale should be zero");
      assert.equal(returnObj.percentBurn.valueOf(), 50, "Percentage of Tokens to burn after the crowdsale should be 50!");
    });
  });
  it("should deny non-owner transactions pre-crowdsale, allow user registration, and set exchange rate and address cap", function() {
    var c;

    return TimeEvenDistroCrowdsaleTestContract.deployed().then(function(instance) {
      c = instance;

      return CrowdsaleToken.deployed().then(function(instance) {
      t = instance;
      return t.transfer(c.contract.address,12000000000000000000000000,{from:accounts[5]});
    }).then(function(ret) {
      return t.balanceOf.call(c.contract.address);
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 12000000000000000000000000,  "crowdsale's token balance should be 20000000000000000000000000!");
      return c.crowdsaleActive.call(101);
    }).then(function(ret) {
      assert.equal(ret.valueOf(), false, "Crowsale should not be active!");
      return c.crowdsaleEnded.call(101);
    }).then(function(ret) {
      assert.equal(ret.valueOf(), false, "Crowsale should not be ended!");
      return c.withdrawTokens(103,{from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Sender has no tokens to withdraw!', "should give message that token sale has not ended");
      return c.receivePurchase(103,{value: 40000000000000000000, from: accounts[1]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Invalid Purchase! Check send time and amount of ether.', "should give an error message since sale has not started");
      return c.receivePurchase(103,{value: 20000000000000000000, from: accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Owner cannot send ether to contract', "should give an error message since sale has not started");
      return c.withdrawOwnerEth(104,{from: accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Cannot withdraw owner ether until after the sale', "Should give an error that sale ether cannot be withdrawn till after the sale");
      return c.getContribution.call(accounts[1]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(),0,"accounts[1] ether contribution should be 0");
      return c.getTokenPurchase.call(accounts[1]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 0,"accounts[1] token balance should be 0");
      return c.registerUser(accounts[0],99,{from:accounts[5]});
    }).then(function(ret) {
      return c.registerUser(accounts[0],99,{from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Registrant address is already registered for the sale!', "Should give error message that the user is already registered");
      return c.isRegistered(accounts[0]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(),true, "accounts[0] should be registered");
      return c.isRegistered(accounts[1]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(),false, "accounts[1] should not be registered");
      return c.unregisterUser(accounts[1],100,{from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Registrant address not registered for the sale!', "Should give error message that the user is not registered");
      return c.registerUser(accounts[1],99,{from:accounts[5]});
    }).then(function(ret) {
      return c.isRegistered(accounts[1]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(),true, "accounts[1] should be registered");
      return c.unregisterUser(accounts[1],100,{from:accounts[5]});
    }).then(function(ret) {
      return c.isRegistered(accounts[1]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(),false, "accounts[1] should not be registered");
      return c.registerUser(accounts[1],99,{from:accounts[5]});
    }).then(function(ret) {
      return c.isRegistered(accounts[1]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(),true, "accounts[1] should be registered");
      return c.registerUser(accounts[2],99,{from:accounts[5]});
    }).then(function(ret) {
      return c.registerUser(accounts[3],99,{from:accounts[5]});
    }).then(function(ret) {
      return c.numRegistered.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(),4,"Four Users should be registered!");
      return c.unregisterUsers([accounts[0],accounts[1],accounts[2]],103,{from:accounts[5]});
    }).then(function(ret) {
      return c.isRegistered(accounts[1]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(),false, "accounts[1] should not be registered");
      return c.numRegistered.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(),1,"One User should be registered!");
      return c.registerUsers([accounts[0],accounts[1],accounts[2]],103,{from:accounts[5]});
    }).then(function(ret) {
      return c.isRegistered(accounts[1]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(),true, "accounts[1] should be registered");
      return c.numRegistered.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(),4,"Four Users should be registered!");
      return c.setTokenExchangeRate(30000,101, {from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Owner can only set the exchange rate once up to three days before the sale!', "Should give an error message that timing for setting the exchange rate is wrong.");
      return c.setTokenExchangeRate(30000,104, {from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, "Owner has sent the exchange Rate and tokens bought per ETH!", "Should give success message that the exchange rate was set.");
      return c.setTokenExchangeRate(30000,101, {from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Owner can only set the exchange rate once up to three days before the sale!', "Should give an error message that timing for setting the exchange rate is wrong.");
      return c.exchangeRate.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 30000, "exchangeRate should have been set to 30000!");
      return c.tokensPerEth.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 213, "tokensPerEth should have been set to 213!");
      return c.addressTokenCap.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 1.465525e+22, "Address cap should have been calculated to correct number!");
      return c.withdrawOwnerEth(104, {from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, "Cannot withdraw owner ether until after the sale", "Should give error message that the owner cannot withdraw any ETH yet");
      return c.withdrawTokens(104, {from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, "Owner cannot withdraw extra tokens until after the sale!", "Should give error message that the owner cannot withdraw any extra tokens yet");
      return c.withdrawLeftoverWei({from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Sender has no extra wei to withdraw!', "should give message that the sender cannot withdraw any wei");
    });
  });
  });

  it("should deny invalid payments during the sale and accept payments that are reflected in token balance", function() {
    var c;

    return TimeEvenDistroCrowdsaleTestContract.deployed().then(function(instance) {
      c = instance;

      return c.crowdsaleActive.call(106);
    }).then(function(ret) {
      assert.equal(ret.valueOf(), true, "Crowsale should be active!");
      return c.crowdsaleEnded.call(106);
    }).then(function(ret) {
      assert.equal(ret.valueOf(), false, "Crowsale should not be ended!");
      return c.registerUser(accounts[4],106,{from:accounts[5]});
    }).then(function(ret) {
      return c.numRegistered.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 5, "Number of users registered should be 5!");
      return c.unregisterUser(accounts[4],106,{from:accounts[5]});
    }).then(function(ret) {
      return c.numRegistered.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(),4,"Four Users should be registered!");
      return c.changeInterval.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(),0, "Price Change time interval should be 0!");
      return c.withdrawTokens(106,{from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Sender has no tokens to withdraw!', "should give message that the sender cannot withdraw any tokens");
      return c.withdrawLeftoverWei({from:accounts[3]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Sender has no extra wei to withdraw!', "should give message that the sender cannot withdraw any wei");
      return c.withdrawLeftoverWei({from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Sender has no extra wei to withdraw!', "should give message that the sender cannot withdraw any wei");
      return c.receivePurchase(106,{from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Invalid Purchase! Check send time and amount of ether.', "should give an error message since no ether was sent");
      return c.receivePurchase(106,{value:39990000000000000000,from:accounts[0]});
    }).then(function(ret) {
      return c.getLeftoverWei.call(accounts[0]);
    }).then(function(ret) {
      return c.receivePurchase(106,{value:10000000000000000,from:accounts[0]});
    }).then(function(ret) {
      return c.getLeftoverWei.call(accounts[0]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(),0, "should show that accounts0 has 0 leftover wei");
      //assert.equal(ret.logs[0].args.Msg, 'Sender has no extra wei to withdraw!', "should give message that the sender cannot withdraw any wei");
      return c.getContribution.call(accounts[0], {from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),40000000000000000000, "accounts[0] amount of wei contributed should be 40000000000000000000 wei");
      return c.getTokenPurchase.call(accounts[0]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 8520000000000000000000, "accounts[0] tokens purchased should be 8520000000000000000000");
      return c.receivePurchase(108,{value: 40000000000000000000000, from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, "Cap Per Address has been exceeded! Please withdraw leftover Wei!","should show message that the addressTokenCap was exceeded");
      return c.receivePurchase(108,{value: 40000000000000000000, from:accounts[4]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, "Buyer is not registered for the sale!", "should give error message that the buyer is not registered for the sale");
      return c.receivePurchase(108,{value: 40000000000000000000000, from:accounts[1]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, "Cap Per Address has been exceeded! Please withdraw leftover Wei!","should show message that the addressTokenCap was exceeded");
      return c.getLeftoverWei.call(accounts[0]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(),2.538475E22,"accounts0 LeftoverWei should be 2.538475E22");
      return c.getLeftoverWei.call(accounts[1]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(),2.534475E22,"accounts1 LeftoverWei should be 2.534475E22");
      return c.tokensPerEth.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 213, "tokensPerEth should stay the same!");
      return c.getContribution.call(accounts[0], {from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),14655250000000000000000, "accounts[0] amount of wei contributed should be 14655250000000000000000 wei");
      return c.getContribution.call(accounts[1], {from:accounts[1]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),14655250000000000000000, "accounts[1] amount of wei contributed should be 14655250000000000000000 wei");
      return c.getTokenPurchase.call(accounts[0],{from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),3.12156825e+24, "accounts0 amount of tokens purchased should be 3.12156825e+24 tokens");
      return c.getTokenPurchase.call(accounts[1],{from:accounts[1]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),3.12156825e+24, "accounts1 amount of tokens purchased should be 3.12156825e+24 tokens");
      return c.receivePurchase(111, {value: 40000000000000000000, from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, "Cap Per Address has been exceeded! Please withdraw leftover Wei!", "Should give message the the address cap has been exceeded");
      return c.getLeftoverWei.call(accounts[0]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(),2.542475E22,"accounts0 LeftoverWei should be 2.542475E22");
      return c.getContribution.call(accounts[0], {from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),14655250000000000000000, "accounts[0] amount of wei contributed should be 14655250000000000000000 wei");
      return c.addressTokenCap.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(),1.465525e+22, "Address cap should not have changed!");
      return c.getTokenPurchase.call(accounts[0],{from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),3.12156825e+24, "accounts[0] amount of tokens purchased should still be 3.12156825e+24 tokens");
      return c.setTokenExchangeRate(30000,112, {from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Owner can only set the exchange rate once up to three days before the sale!', "Should give an error message that timing for setting the exchange rate is wrong.");
      return c.setTokenExchangeRate(30000,112, {from:accounts[4]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Owner can only set the exchange rate!', "Should give an error message that timing for setting the exchange rate is wrong.");
      return c.receivePurchase(112,{value: 120000000000000000000, from: accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Owner cannot send ether to contract', "should give an error message since the owner cannot donate to its own contract");
      return c.withdrawOwnerEth(112,{from: accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Cannot withdraw owner ether until after the sale', "Should give an error that sale ether cannot be withdrawn till after the sale");
      return c.getContribution.call(accounts[5]);
    }).then(function(ret) {
      assert.equal(ret.valueOf(),0,"accounts[5] (owner) ether contribution should be 0");
      return c.receivePurchase(114, {value: 500000000000000111111, from:accounts[3]});
    }).then(function(ret) {
      return c.getContribution.call(accounts[3],{from:accounts[3]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),500000000000000111111, "accounts[3] amount of wei contributed should be 50000000000000111111 wei");
      return c.getTokenPurchase.call(accounts[3],{from:accounts[3]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),1.065000000000000213e+23, "accounts[3] amount of tokens purchased should be 1.065000000000000213e+23 tokens");
      return c.withdrawTokens(116,{from:accounts[0]});
    }).then(function(ret) {
      return c.getTokenPurchase.call(accounts[0],{from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),0,"accounts[0] should have withdrawn all tokens and should now have zero in the contract");
      return c.withdrawTokens(104, {from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, "Owner cannot withdraw extra tokens until after the sale!", "Should give error message that the owner cannot withdraw any extra tokens yet");
      return c.setTokenExchangeRate(100, 116, {from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Owner can only set the exchange rate once up to three days before the sale!', "Should give an error message that timing for setting the exchange rate is wrong.");
      return c.receivePurchase(121, {value: 56670000000000000000000, from: accounts[3]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'buyer ether sent exceeds cap of ether to be raised!', "should give error message that the raise cap has been exceeded");
      return c.receivePurchase(121, {value: 60000000000000000000000, from: accounts[3]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'buyer ether sent exceeds cap of ether to be raised!', "should give error message that the raise cap has been exceeded");
      return c.receivePurchase(122, {value: 50000000000000010000, from:accounts[1]});
    }).then(function(ret) {
      return c.addressTokenCap.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(),1.465525e+22, "addressTokenCap should not have changed!");
      return c.getContribution.call(accounts[1],{from:accounts[4]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),1.465525e+22, "accounts[1] amount of wei contributed should be 1.465525e+22 wei");
      return c.getTokenPurchase.call(accounts[1],{from:accounts[4]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),3.12156825e+24, "accounts[1] amount of tokens purchased should be 3.12156825e+24 tokens");
      return c.getLeftoverWei.call(accounts[1],{from:accounts[4]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),2.539475E22, "accounts[1] leftover wei should be 2.539475E22");
      return c.withdrawLeftoverWei({from:accounts[1]});
    }).then(function(ret) {
      return c.getLeftoverWei.call(accounts[1],{from:accounts[4]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),0, "accounts[1] should have no leftover wei because it was just withdrawn");
    });
  });
//});



  //********************************************************
  //  AFTER SALE
  //*******************************************************
  it("should deny payments after the sale and allow users to withdraw their tokens/owner to withdraw ether", function() {
    var c;

    return TimeEvenDistroCrowdsaleTestContract.deployed().then(function(instance) {
      c = instance;
      return c.crowdsaleActive.call(126);
    }).then(function(ret) {
      assert.equal(ret.valueOf(), false, "Crowsale should not be active!");
      return c.crowdsaleEnded.call(126);
    }).then(function(ret) {
      assert.equal(ret.valueOf(), true, "Crowsale should be ended!");
      return c.numRegistered.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(),4,"Four Users should be registered!");
      return c.ownerBalance.call();
    }).then(function(ret) {
      return c.getTokenPurchase.call(accounts[0],{from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),0, "accounts[0] amount of tokens purchased should be 0 tokens");
      return c.withdrawTokens(126,{from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, "Sender has no tokens to withdraw!", "Accounts[0] alread withdrew all tokens. should be error");
      return c.getTokenPurchase.call(accounts[3],{from:accounts[3]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),1.065000000000000213e+23, "accounts[3] amount of tokens purchased should be 1.065000000000000213e+23 tokens");
      return c.withdrawTokens(126,{from:accounts[3]});
    }).then(function(ret) {
      return c.getTokenPurchase.call(accounts[3],{from:accounts[3]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),0,"accounts[3] should have withdrawn all tokens and should now have zero in the contract");
      return c.withdrawLeftoverWei({from:accounts[4]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, "Sender has no extra wei to withdraw!", "should give error message because accounts4 already withdrew wei");
      return c.withdrawLeftoverWei({from:accounts[3]});
    }).then(function(ret) {
      return c.getLeftoverWei.call(accounts[3],{from:accounts[3]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),0, "accounts[4] should have no leftover wei because it was just withdrawn");
      return c.receivePurchase(126,{from:accounts[2]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Invalid Purchase! Check send time and amount of ether.', "should give an error message since no ether was sent");
      return c.withdrawTokens(127,{from:accounts[2]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'Sender has no tokens to withdraw!', "should give message that the sender cannot withdraw any tokens");
      return c.withdrawOwnerEth(127,{from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.logs[0].args.Msg, 'crowdsale owner has withdrawn all funds', "Should give message that the owner has withdrawn all funds");
      return c.getTokenPurchase.call(accounts[1],{from:accounts[1]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),3.12156825e+24,"accounts[1] should have 3.12156825e+24 tokens available to withdraw");
      return c.withdrawTokens(126,{from:accounts[1]});
    }).then(function(ret) {
      return c.getTokenPurchase.call(accounts[1],{from:accounts[1]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),0,"accounts[1] should have withdrawn all tokens and should now have zero in the contract");

      return c.ownerBalance.call();
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 0, "Owner's ether balance in the contract should be zero!");

      //******************
      // TOKEN CONTRACT BALANCE CHECKS
      //*******************
      return CrowdsaleToken.deployed().then(function(instance) {
      t = instance;
      return t.balanceOf.call(accounts[0],{from:accounts[0]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 3.12156825e+24, "accounts0 token balance should be 24040000000000000000000");
      return t.balanceOf.call(accounts[1],{from:accounts[1]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 3.12156825e+24, "accounts1 token balance should be 3.2280682500000000213e+24");
      return t.balanceOf.call(accounts[2],{from:accounts[2]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 0, "accounts2 token balance should be 0");
      return t.balanceOf.call(accounts[3],{from:accounts[3]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 1.065000000000000213e+23, "accounts3 token balance should be 1.065000000000000213e+23");
      return t.balanceOf.call(accounts[4],{from:accounts[4]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 0, "accounts4 token balance should be 0");
      return t.balanceOf.call(accounts[5],{from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 8000000000000000000000000, "accounts5 token balance should be 8000000000000000000000000");
      return t.balanceOf.call(c.contract.address);
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 5.6503635E24,  "crowdsale's token balance should be 5.6503635E24!");
      return c.getTokenPurchase.call(accounts[5],{from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),5.6503635E24, "Owners available tokens to withdraw should be 5.6503635E24");
      return c.withdrawTokens(128,{from:accounts[5]});
    }).then(function(ret) {
      return c.getTokenPurchase.call(accounts[5],{from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(),0, "Owner should have withdrawn all the leftover tokens from the sale!");
      return t.balanceOf.call(accounts[5],{from:accounts[5]});
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 1.082518175E25, "accounts5 token balance should be 1.082518175E25");
      return t.balanceOf.call(c.contract.address);
    }).then(function(ret) {
      assert.equal(ret.valueOf(), 0,  "crowdsale's token balance should be 0!");
      return t.initialSupply();
    }).then(function(ret){
      assert.equal(ret.valueOf(), 20000000000000000000000000,  "The token's initial supply was 20M");
      return t.totalSupply();
    }).then(function(ret){
      assert.equal(ret.valueOf(), 1.717481825E25,  "The token's new supply is 1.723232825E25");
    });
  });
});*/
