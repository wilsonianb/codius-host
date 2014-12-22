'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.createTable('transactions', function (t) {
    t.increments().primary();
    t.timestamp('timestamp', true);
    t.integer('balance_id').unsigned().index().references('id').inTable('balances');
    t.integer('balance_previous');
    t.integer('balance_delta');
    t.string('bitcoin_transaction_hash');
    t.string('bitcoin_output_index');
    t.string('bitcoin_block_height');
    t.string('blockchain_block_index');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('transactions');
};
