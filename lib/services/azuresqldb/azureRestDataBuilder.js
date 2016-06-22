/*jshint camelcase: false */
/*jshint newcap: false */

'use strict';

var azureRestDataBuilder = function(params) {
    this.params = params;
    this.defaultSettings = {
        
    }
}


azureRestDataBuilder.prototype.buildSqlServerData = function() {
    //1. got plan
    //2. got resourceGroup, location, admin auth, version, state
    //3. 
    var plan_id = this.params.plan_id;
    
    return {
      "location": this.params.parameters.parameters.location,
      "tags":{},
      "properties": {
          "version": "12.0",
          "administratorLogin": "guwe",
          "administratorLoginPassword": "User!123",
          "state": "server-state"        
      }
    }
}