var Reply = function(statusCode, altStatusCode, altCode) {
    var reply = {};
    switch(statusCode) {
        case 200:
            reply = {
                statusCode: altStatusCode || 200,
                code: altCode || 'Accepted',
                value: {
                    state: 'Succeeded',
                    description: 'Operation was successful.'
                }
            };
            break;

        case 202:
            reply = {
                statusCode: altStatusCode || 202,
                code: altCode || 'Accepted',
                value: {
                    state: 'Succeeded',
                    description: 'Operation was successful.'
                }
            };      
            break;
        
        case 500:
            reply = {
                statusCode: altStatusCode || 500,
                code: altCode || 'InternalServerError',
                value: {
                    state: 'Failed',
                    description: 'Operation failed. Check the log for details.'
                }
            };
            break;                
    }
    return reply;
};

module.exports = Reply;