var httpSignature = require('http-signature');

var Balance = require('../models/balance').model;
var User = require('../models/user').model;
var Bitcoin = require('../lib/bitcoin');

var config = require('../lib/config');

/**
 * Create a new user account and return the Bitcoin address
 * that the user should pay to fund their account
 */
module.exports = function(req, res, next) {

  var body = req.body;
  var public_key;

  if (!body || !(public_key = body.public_key)) {
    var err = new Error('Must supply Ed25519 public key');
    err.status = 400;
    return next(err);
  }

  // Parse and validate signature
  var parsedSignature;
  try {
    parsedSignature = httpSignature.parseRequest(req);
  } catch (e) {
    e.status = 400;
    return next(e);
  }

  if (!parsedSignature.params.algorithm || 
    parsedSignature.params.algorithm.toLowerCase() !== 'ed25519-sha512') {

    var err = new Error('Request must be signed using ed25519-sha512 algorithm');
    err.status = 400;
    return next(err);
  }

  var valid = httpSignature.verify(parsedSignature, public_key);
  if (!valid) {
    var err = new Error('Invalid signature');
    e.status = 400;
    return next(err);
  }

  // Create user with associated balance
  var userAgent = (req.get('user-agent') || '').slice(0, 256);
  var ipAddress = req.ip;

  new User({
    public_key: public_key
  }).fetch({
    withRelated: ['balance']
  }).then(function(userEntry){
    if (userEntry) {
      res.status(200).json({
        public_key: userEntry.get('public_key'),
        bitcoin_address: Bitcoin.generateDeterministicWallet(userEntry.related('balance').id),
        compute_units: userEntry.related('balance').get('balance'),
        compute_units_per_bitcoin: config.get('compute_units_per_bitcoin')
      });
      return;
    }

    return User.forge({
      public_key: public_key,
      user_agent: userAgent,
      ip_address: ipAddress
    }).save().then(function(user){
      return Balance.forge({
        balance: 0,
        user_id: user.id
      }).save();
    }).then(function(balance){
      res.status(200).json({
        public_key: public_key,
        bitcoin_address: Bitcoin.generateDeterministicWallet(balance.id),
        compute_units: balance.balance,
        compute_units_per_bitcoin: config.get('compute_units_per_bitcoin')
      });
    })
  })

};