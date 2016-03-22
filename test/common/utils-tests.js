var should = require('should');

var utils = require('../../lib/common');

describe('Util library', function() {

  describe('.extend()', function(){
    it('should extend an object\'s properties with another\'s', function() {
      var target = {
        test: 'example'
      };
      var source = {
        foo: 'bar'
      };
      var extendedTarget = utils.extend(target, source);
      extendedTarget.should.have.property('test', 'example');
      extendedTarget.should.have.property('foo', 'bar');
    });
  });

});
