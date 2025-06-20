const dataProcessor = artifacts.require("./DataProcessor.sol");

module.exports = function(deployer) {
  deployer.deploy(dataProcessor);
};
