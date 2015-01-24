//------------------------------------------------------------------------------
/*
    This file is part of Codius: https://github.com/codius
    Copyright (c) 2014 Ripple Labs Inc.

    Permission to use, copy, modify, and/or distribute this software for any
    purpose  with  or without fee is hereby granted, provided that the above
    copyright notice and this permission notice appear in all copies.

    THE  SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES
    WITH  REGARD  TO  THIS  SOFTWARE  INCLUDING  ALL  IMPLIED  WARRANTIES  OF
    MERCHANTABILITY  AND  FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR
    ANY  SPECIAL ,  DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
    WHATSOEVER  RESULTING  FROM  LOSS  OF USE, DATA OR PROFITS, WHETHER IN AN
    ACTION  OF  CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF
    OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.
*/
//==============================================================================
module.exports = function(codius) {

  if (codius.features.isEnabled('RIPPLE_BILLING')) {
    var billing              = new codius.BillingService();
    var RippleAccountMonitor = require('ripple-account-monitor');
    var _                    = require('lodash');

    if (!codius.config.get('RIPPLE_ADDRESS')) {
      throw new Error('RIPPLE_ADDRESS must be set in environment to enable Ripple billing');
    }

    codius.Ledger.findOrCreate({ name: 'ripple' }).then(function(ledger) {
      var lastPaymentHash = getLastHash(ledger, codius);
    
      new RippleAccountMonitor({
        rippleRestUrl: 'https://api.ripple.com/',
        account: codius.config.get('RIPPLE_ADDRESS'),
        lastHash: lastPaymentHash,
        timeout: 1000,
        onTransaction: function(transaction, next) {
          ledger.set('last_hash', transaction.hash).save().then(next);
        },
        onPayment: function(payment, next) {
          handlePayment(payment, ledger, next);
        },
        onError: function(error) {
          console.log('RippleAccountMonitor::Error', error);
        }
      }).start();
    })

    function handlePayment(payment, ledger, next) {
      console.log('handle payment', payment.hash, payment);
      var tag = Number(payment.DestinationTag);
      if (tag) {
        new codius.Token({ id: tag }).fetch().then(function(token) {
          if (token) {
            var btcPaid = _.reject(payment.destination_balance_changes, function(change) {
              return change.currency !== 'BTC';
            })[0]
            if (btcPaid) {
              console.log('crediting account', btcPaid);
              billing.credit(token, btcPaid.amount).then(function(credit) {
                ledger.set('last_hash', payment.hash).save().then(next);
              })
            } else {
              console.log('no BTC paid, skipping...');
              ledger.set('last_hash', payment.hash).save().then(next);
            }
          } else {
            console.log('no token found, skipping...');
            ledger.set('last_hash', payment.hash).save().then(next);
          }
        })
      } else {
        console.log('no destination tag, skipping...');
        ledger.set('last_hash', payment.hash).save().then(next);
      }
    }

    function getLastHash(ledger, codius) {
      var lastPaymentHash;
      if (ledger.get('last_hash') && ledger.get('last_hash') !== '') {
        lastPaymentHash = ledger.get('last_hash');
      } else {
        lastPaymentHash = process.env.RIPPLE_LAST_HASH;
      }
      if (!lastPaymentHash) {
        throw new Error('RIPPLE_LAST_HASH must be set in environment to enable Ripple billing');
      }
      return lastPaymentHash;
    }

  }
}


