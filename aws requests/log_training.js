// exports.handler = async (event) => {
//     // TODO implement
//     const response = {
//         statusCode: 200,
//         body: JSON.stringify('Hello from Lambda!')
//     };
//     return response;
// };

'use strict';

var AWS = require('aws-sdk'),
	uuid = require('uuid'),
	documentClient = new AWS.DynamoDB.DocumentClient(); 

exports.handler = function(event, context, callback){
    let { events } = event
    
    events.forEach(e => {
      var params = {
    		Item : {
    			"event" : e.name,
    			"Name" : e.data
    		},
    		TableName : process.env.TABLE_NAME
        };
    	documentClient.put(params, function(err, data){
    		callback(err, data);
    	});  
    })
}