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

/**
@summary retrieves the training for a given event, or if omited, all trainings
probably in the future we'll want to reduce that to just the current user or something idk, or introduce pagination
@note the return json format is because of the lambda proxy option in the API gateway
 */
exports.handler = function(event, context) {
	console.log("params: ", event.queryStringParameters)
	let eventName = ""
	if (event.queryStringParameters && 'event' in event.queryStringParameters) {
		eventName = event.queryStringParameters.event
	}
	console.log(eventName)
	let params = eventName ? {
		TableName : process.env.TABLE_NAME,
		Key: { event: eventName },
		ExpressionAttributeValues: {
			':event': eventName
		},
		KeyConditionExpression: 'event = :event',
		FilterExpression: 'contains(event, :event)'
	} : {
		TableName : process.env.TABLE_NAME
	}
	
	return new Promise((resolve, reject) => {
		documentClient.scan(params, function(err, data){
			if(err){
				console.error("error: ", err)
			    reject({
	                "isBase64Encoded": false,
	                "statusCode": 500,
	                "headers": event.headers,
	                "body": err.errorMessage
	            })
			}else{
			    resolve({
	                "isBase64Encoded": false,
	                "statusCode": 200,
	                "headers": event.headers,
	                "body": JSON.stringify(data.Items)
	            })
			}
		})
	})
}