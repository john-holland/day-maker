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
	documentClient = new AWS.DynamoDB.DocumentClient(); 

exports.handler = function(event, context, callback){
	let params = 'event' in event.params ? {
		TableName : process.env.TABLE_NAME
	} : {
		TableName : process.env.TABLE_NAME,
		Key: {
		    event: event.params.event
		}
	};
	
	documentClient.scan(params, function(err, data){
		if(err){
		    callback(err, null);
		}else{
		    callback(null, data.Items);
		}
	});
}