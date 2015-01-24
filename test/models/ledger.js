var codius = require(__dirname+'/../../');
var Ledger = codius.Ledger;
var assert = require('assert');
var uuid   = require('uuid');

describe('Ledger', function() {
  var ledger;
  var ledgerName = uuid.v4();

  before(function(done) {
    new Ledger({ name: ledgerName }).save().then(function(record) {
      ledger = record;
      done();
    });
  })
  
  after(function(done) {
    ledger.destroy().then(function(){ 
      done();
    });
  })

  it('should register a new Ledger for billing', function() {
    assert(ledger.get('id') > 0);
    assert(ledger.get('name') === ledgerName);
    assert.strictEqual(ledger.get('last_hash'), undefined);
  }); 

  it('should set the last has processed', function(done) {
    ledger.fetch().then(function(ledger) {

      ledger.set('last_hash', '12345').save().then(function(ledger) {

        new Ledger({ id: ledger.get('id') }).fetch().then(function(ledger) {
          assert.strictEqual(ledger.get('last_hash'), '12345');
          done();
        });
      });
    });
  });
  
  it('should find or create a ledger by name', function(done) {
    var name = uuid.v4();
    var id;

    Ledger.findOrCreate({ name: name }).then(function(ledger) {
      id = ledger.get('id');
      assert.strictEqual(ledger.get('name'), name);

      Ledger.findOrCreate({ name: name }).then(function(ledger) {
        assert.strictEqual(ledger.get('id'), id);
        assert.strictEqual(ledger.get('name'), name);

        ledger.destroy().then(function() { done() });
      });
    });
  });
});

