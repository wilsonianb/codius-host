var Bitcoin = require('bitcoinjs-lib');

var config = require('./config');

function generateDeterministicWallet(index) {

  if (!config.get('bitcoin_bip32_extended_public_key')) {
    throw new Error('No Bitcoin public key supplied');
  }

  var hdnode = Bitcoin.HDNode.fromBase58(config.get('bitcoin_bip32_extended_public_key'));
  return hdnode.derive(index).getAddress().toString();
}

exports.generateDeterministicWallet = generateDeterministicWallet;