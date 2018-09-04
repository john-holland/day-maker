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

/**
@summary logs training events to dynamo
@note the return json format is because of the lambda proxy option in the API gateway
 */
exports.handler = function (event) {
    console.log("logging body", event.body)
    
    let events = (typeof event.body == "string" ? JSON.parse(event.body) : event.body) || []
    let errs = []
    return (async () => {
        try {
            await new Promise((resolve, reject) => {
                events.forEach((e,i) => {
                    console.log('e', e)
                  var params = {
                		Item : {
                			"event" : e.name,
                			"date": 'date' in e ? e.date : new Date().getTime(),
                			"data" : e.data
                		},
                		TableName : process.env.TABLE_NAME
                    };
                	documentClient.put(params, function(err, data){
                	    if (err) {
                	        errs.push([err, data])
                	        console.error("error", err)
                	    }
                		if (i == events.length - 1) {
                		    if (errs.length == 0) resolve(events)
                            else reject()
                		}
                	})
                })
            })
        } catch (exception) {
            return {
                "isBase64Encoded": false,
                "statusCode": 500,
                "headers": event.headers,
                "body": errs
            }
        }
        
        return {
                "isBase64Encoded": false,
                "statusCode": 200,
                "headers": event.headers,
                "body": "success"
            }
    })()
}