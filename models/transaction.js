var bookshelf = require('../lib/db').bookshelf;

var Balance = require('./balance');

var Transaction = bookshelf.Model.extend({
  tableName: 'transactions',
  balance: function () {
    return this.belongsTo(Balance);
  }
});

exports.model = Transaction;
