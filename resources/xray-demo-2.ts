import { ProxyResult } from 'aws-lambda';
import { traceWithXray, waitFor100ms } from './helpers';
import * as AWSXRay from 'aws-xray-sdk';

const COMPONENT_NAME = 'xray-demo-handler-2';

export async function main(): Promise<ProxyResult> {
  // This will add an annotation to the segment which can be used to easily
  // fetch traces belonging to this service
  AWSXRay.getSegment()?.addAnnotation('componentName', COMPONENT_NAME);

  await traceWithXray('handler 2 timeout', waitFor100ms);

  return {
    statusCode: 200,
    body: JSON.stringify({ result: 'success' }),
  };
}
