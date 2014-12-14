'use strict';

exports.up = function(knex, Promise) {
  return knex.schema.createTable('users', function (t) {
    t.increments().primary();
    t.string('public_key').notNullable();
    t.string('ip_address');
    t.string('user_agent');
  });
};

exports.down = function(knex, Promise) {
  return knex.schema.dropTable('users');
};
