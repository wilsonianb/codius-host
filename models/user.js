var bookshelf = require('../lib/db').bookshelf;

var Balance = require('./balance');

var User = bookshelf.Model.extend({
  tableName: 'users',
  balance: function () {
    return this.hasOne(Balance.model, 'user_id');
  }
});

exports.model = User;
