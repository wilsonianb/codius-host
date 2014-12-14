'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.table('balances', function(t){
    t.integer('user_id').unsigned().index().references('id').inTable('users');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.table('balances', function(t){
    t.dropColumn('user_id');
  });
};
