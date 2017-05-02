/*jshint expr: true*/

var chai = require('chai');
var should = chai.should();
var chaiHttp = require('chai-http');
chai.use(chaiHttp);

var broker = require('../../brokerserver');
var server = broker.restServer;

describe('Catalog', function() {
  it('should list ALL services', function(done) {
    chai.request(server)
      .get('/v2/catalog')
      .set('X-Broker-API-Version', '2.8')
      .auth('demouser', 'demopassword')
      .end(function(err, res) {
        res.should.have.status(200);
        res.should.be.json;
        res.body.should.be.a('object');
        res.body.should.have.property('services');
        res.body.services.should.be.an('array');
        res.body.services.should.not.equal([]);
        should.not.exist(err);
        done();
      });
  });
});
