var bookshelf = require('../lib/db').bookshelf;
var Promise   = require('bluebird');

var Ledger = bookshelf.Model.extend({
  tableName: 'ledgers',
  validate: function() {
    if (!(this.get('name'))) {
      throw new Error('name must be provided');
    }
  }
});

Ledger.findOrCreate = function(options) {
  var this_ = this;
  return new Promise(function(resolve, reject) {
    var ledger = new this_(options)
    ledger.fetch().then(function(record) {
      if (record) {
        resolve(record);
      } else {
        return ledger.save()
      }
    }) 
    .then(function() {
      resolve(ledger);
    }) 
    .error(reject)
  });
}

exports.model = Ledger;

