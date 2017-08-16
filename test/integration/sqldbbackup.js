var _ = require('underscore');
var uuid = require('uuid');
var async = require('async');
var chai = require('chai');
var chaiHttp = require('chai-http');
var should = chai.should();
chai.use(chaiHttp);

var clients = require('../utils/clients');
var statusCode = require('../utils/statusCode');

var cleaner = require('./cleaner');


describe('SQLDB backup', function(){
    it('should provision a new database', function(){

    });

    it('should poll untill it is created', function(){

    });

    it('should bind and get credentials', function(){

    });

    it('should create a table in the database', function(){

    });

    it('should fill the database', function() {

    });

    it('should perform an update to restore the database', function(){

    });

    it('should validate the restore', function(){

    });

    it('should clean the ressource group', function(){

    });

})