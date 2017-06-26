var msRestRequest = require('../../../lib/common/msRestRequest');

var originHead, originGet, originPut, originPost, originDelete;

module.exports.backup = function(){
  originHead = msRestRequest.HEAD;
  originGet = msRestRequest.GET;
  originPut = msRestRequest.PUT;
  originPost = msRestRequest.POST;
  originDelete = msRestRequest.DELETE;
};

module.exports.restore = function(){
  msRestRequest.HEAD = originHead;
  msRestRequest.GET = originGet;
  msRestRequest.PUT = originPut;
  msRestRequest.POST = originPost;
  msRestRequest.DELETE = originDelete;
};