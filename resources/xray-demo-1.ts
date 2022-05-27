import * as AWS from 'aws-sdk';
import * as AWSXRay from 'aws-xray-sdk';
import { ProxyResult } from 'aws-lambda';
import axios from 'axios';
import { traceWithXray, waitFor100ms } from './helpers';

const COMPONENT_NAME = 'xray-demo-handler-1';

const dynamodb = new AWS.DynamoDB.DocumentClient();
AWSXRay.captureAWSClient((dynamodb as any).service); // Nasty workaraound, but X-ray does not directly work with the document client

export async function main(): Promise<ProxyResult> {
  // This will add an annotation to the segment which can be used to easily
  // fetch traces belonging to this service
  AWSXRay.getSegment()?.addAnnotation('componentName', COMPONENT_NAME);

  const result = await dynamodb
    .update({
      TableName: 'xray-demo-table',
      Key: { pk: 'TestItem' },
      UpdateExpression: 'SET #att = if_not_exists(#att, :start_value) + :incr',
      ExpressionAttributeNames: { '#att': 'count' },
      ExpressionAttributeValues: { ':start_value': 0, ':incr': 1 },
      ReturnValues: 'UPDATED_NEW',
    })
    .promise();

  await traceWithXray('google http call', () => axios.get('https://google.fi'));

  await traceWithXray('100ms wait and error sometimes', async () => {
    await waitFor100ms();
    if (result?.Attributes?.count % 10 === 9) {
      throw new Error('Something just failed');
    }
  });

  return {
    statusCode: 200,
    body: JSON.stringify({
      result: 'success',
      count: result?.Attributes?.count,
    }),
  };
}
