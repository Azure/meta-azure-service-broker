var sinon = require('sinon');

var msRestRequest;
var Token = require('../../../lib/common/token');

describe('msRestRequest', function() {
  before(function(){
    sinon.stub(Token, 'getToken').yields(null, 'fake-token');
  });
  
  after(function(){
    Token.getToken.restore();
  });
  
  describe('when the token is not expired and statusCode is not in AZURE_RETRY_ERROR_CODES', function() {
    
    before(function() {
      require('request');
      require.cache[require.resolve('request')].exports = function(_, callback) {
        callback(null, {statusCode: 200}, {});
      };
      delete require.cache[require.resolve('../../../lib/common/msRestRequest')];
      msRestRequest = require('../../../lib/common/msRestRequest');
    });
    
    after(function(){
      delete require.cache[require.resolve('request')];
    });
    
    it('should not exist error', function(done) {
      msRestRequest.GET('', {}, '', function(err) {
        done(err);
      });
    });
  });

  describe('when the token is not expired, statusCode is in AZURE_RETRY_ERROR_CODES, and retry successfully', function() {
    
    var callTimes = 0;
    
    before(function() {
      require('request');
      require.cache[require.resolve('request')].exports = function(_, callback) {
        ++callTimes;
        if (callTimes == 1) {
          callback(null, {statusCode: 502}, {});
        } else if (callTimes == 2) {
          callback(null, {statusCode: 200}, {});
        } else {
          callback(Error('unexpected error'));
        }
      };
      delete require.cache[require.resolve('../../../lib/common/msRestRequest')];
      msRestRequest = require('../../../lib/common/msRestRequest');
    });
    
    after(function(){
      delete require.cache[require.resolve('request')];
    });
    
    it('should not exist error', function(done) {
      this.timeout(6000);
      msRestRequest.GET('', {}, '', function(err) {
        done(err);
      });
    });
  });
  
  describe('when the token is expired, statusCode is not in AZURE_RETRY_ERROR_CODES, and retry successfully', function() {
    
    var callTimes = 0;
    
    before(function() {
      require('request');
      require.cache[require.resolve('request')].exports = function(_, callback) {
        ++callTimes;
        if (callTimes == 1) {
          callback(null, {statusCode: 401}, {});
        } else if (callTimes == 2) {
          callback(null, {statusCode: 200}, {});
        } else {
          callback(Error('unexpected error'));
        }
      };
      delete require.cache[require.resolve('../../../lib/common/msRestRequest')];
      msRestRequest = require('../../../lib/common/msRestRequest');
    });
    
    after(function(){
      delete require.cache[require.resolve('request')];
    });
    
    it('should not exist error', function(done) {
      this.timeout(6000);
      msRestRequest.GET('', {}, '', function(err) {
        done(err);
      });
    });
  });
});
