var Bitcoin = require('bitcoinjs-lib');
var request = require('request-promise');
var Promise = require('bluebird');

var Balance = require('../models/balance').model;
var Transaction = require('../models/transaction').model;

var config = require('./config');

// TODO: make these configurable
var LATEST_BLOCK_URL = 'https://blockchain.info/latestblock';
var GET_BLOCK_URL = 'https://blockchain.info/block-index/###?format=json';
var UNCONFIRMED_TRANSACTIONS_URL = 'https://blockchain.info/unconfirmed-transactions?format=json';

// TODO: store wallets instead of generating them each time
function generateDeterministicWallet(index) {

  if (!config.get('bitcoin_bip32_extended_public_key')) {
    throw new Error('No Bitcoin public key supplied');
  }

  var hdnode = Bitcoin.HDNode.fromBase58(config.get('bitcoin_bip32_extended_public_key'));
  return hdnode.derive(index).getAddress().toString();
}

function convertSatoshisToComputeUnits(satoshis) {
  return satoshis / 100000000 * config.get('compute_units_per_bitcoin');
}

function BitcoinMonitor(opts) {
  var self = this;

  if (!opts) {
    opts = {};
  }

  self.pollInterval = opts.pollInterval || 10000;
  self.generatedAddresses = [];
}

// Note that blockIndex is an identifier unique to Blockchain.info
BitcoinMonitor.prototype.getLatestBlock = function() {
  return new Transaction().query(function(qb){
    qb.max('blockchain_block_index');
  }).fetch().then(function(latestTransaction) {
    if (latestTransaction && latestTransaction.get('blockchain_block_index')) {
      return latestTransaction.get('blockchain_block_index');
    } else {
      return request({
        url: LATEST_BLOCK_URL,
        json: true
      }).then(function(latestBlock){
        return latestBlock.block_index;
      });
    }
  });
};

BitcoinMonitor.prototype.pollNetwork = function(blockIndex) {
  var self = this;

  if (!blockIndex) {
    return self.getLatestBlock().then(self.pollNetwork.bind(self));
  }

  console.log('requesting block', blockIndex);

  return request({
    url: GET_BLOCK_URL.replace('###', blockIndex),
    json: true
  }).then(self.parseTransactions.bind(self))
  .delay(self.pollInterval)
  .then(self.pollNetwork.bind(self, blockIndex + 1))
  .catch(function(error){
    if (error.statusCode === 500) {
      console.log('block not found');
      return self.pollUnconfirmedTransactions()
      .then(self.pollNetwork.bind(self, blockIndex));      
    } else {
      console.log(error);
      throw new Error('Error monitoring the Bitcoin Network: ' + error);
    }
  })
};

BitcoinMonitor.prototype.pollUnconfirmedTransactions = function(previousNumber) {
  var self = this;

  // How do you differentiate between unconfirmed transactions and then the txs once they are confirmed?
  console.log('waiting 1 min before polling again');
  return Promise.delay(60000);
};

BitcoinMonitor.prototype.getAddressesToMonitor = function() {
  var self = this;

  return new Balance()
  .query('where', 'id', '>=', self.generatedAddresses.length)
  .fetchAll().then(function(collection){
    return collection.models;
  }).each(function(balance){
    var id = balance.get('id');
    self.generatedAddresses[id] = generateDeterministicWallet(id);
  }).then(function(){
    return self.generatedAddresses;
  });
}

BitcoinMonitor.prototype.parseTransactions = function(block) {
  var self = this;

  self.getAddressesToMonitor().then(function(addressesToMonitor){
    // Parse all transactions looking for blocks 
    var outputsToConsider = [];
    for (var t = 0; t < block.tx.length; t++) {
      var tx = block.tx[t];
      for (var out = 0; out < tx.out.length; out++) {
        var output = tx.out[out];
        if (addressesToMonitor.indexOf(output.addr) !== -1 && !output.spent) {
          output.transaction_hash = tx.hash;
          output.blockchain_block_index = block.block_index;
          output.block_height = block.height;
          outputsToConsider.push(output);
        }
      }
    }
    return outputsToConsider;
  }).map(self.applyIncomingPayment.bind(self))
  .catch(function(error){
    if (error) {
      console.log(error);
      throw new Error('Error parsing transactions: ' + error);
    }
  })
};

BitcoinMonitor.prototype.applyIncomingPayment = function(output) {
  var self = this;

  var balanceId = self.generatedAddresses.indexOf(output.addr);
  if (balanceId < 0) {
    // This should never happen
    throw new Error('Attempting to apply payment to balanceId ' + balanceId);
  }

  var balanceDelta = convertSatoshisToComputeUnits(output.value);

  var balanceEntry;
  return new Balance({
    id: balanceId
  }).fetch().then(function(balance){
    balanceEntry = balance;
    return balanceEntry.get('balance');
  }).then(function(previousBalance){

    return new Transaction({
      bitcoin_transaction_hash: output.transaction_hash,
      bitcoin_output_index: output.n
    }).fetch().then(function(transaction){
      if (transaction) {
        // Transaction already applied
        return;
      } else {

        Transaction.forge({
          balance_id: balanceId,
          balance_previous: previousBalance,
          balance_delta: balanceDelta,
          bitcoin_transaction_hash: output.transaction_hash,
          bitcoin_output_index: output.n,
          bitcoin_block_height: output.block_height,
          blockchain_block_index: output.blockchain_block_index
        }).save().then(function(transaction){
          console.log('saved transaction', transaction.toJSON());

          balanceEntry.query(function(qb){
            qb.increment('balance', balanceDelta)
          }).save().then(function(balance){
            console.log('updated balance', balance.toJSON());
          })
        })
      }
    })
    
  })
};

exports.BitcoinMonitor = BitcoinMonitor;
exports.generateDeterministicWallet = generateDeterministicWallet;