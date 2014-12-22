var bookshelf = require('../lib/db').bookshelf;

var Token = require('./token');
var User = require('./user');
var Transaction = require('./transaction');

var Balance = bookshelf.Model.extend({
  tableName: 'balances',
  tokens: function () {
    return this.hasMany(Token.model);
  },
  user: function () {
    return this.belongsTo(User.model, 'user_id');
  },
  transactions: function () {
    return this.hasMany(Transaction.model);
  }
});

exports.model = Balance;
