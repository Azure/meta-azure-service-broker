var msRestRequest = require('../../../lib/common/msRestRequest');

var originGet, originPut, originPost, originDelete;

module.exports.backup = function(){
  originGet = msRestRequest.GET;
  originPut = msRestRequest.PUT;
  originPost = msRestRequest.POST;
  originDelete = msRestRequest.DELETE;
  
};

module.exports.restore = function(){
  msRestRequest.GET = originGet;
  msRestRequest.PUT = originPut;
  msRestRequest.POST = originPost;
  msRestRequest.DELETE = originDelete;
};