# AWS X-Ray serverless demo

This project contains a small demo for AWS X-ray usage. It deploys an apigateway with two lambdas, which will send traces to X-ray. AWS CDK is utilized in the deployment.

The X-Ray instrumentation in this demo is done using Javascript SDK for the AWS X-Ray.

## Deploying

    npm ci

    cd resources

    npm ci

    cd ..

    npm run build

    npx cdk bootstrap

    npx cdk deploy XrayDemoStack

## AWS X-Ray

AWS X-Ray is a tracing tool which can be used to trace incoming requests and see how they propagate through different AWS services. Traces can be viewed from Cloudwatch console.

## Enabling AWS X-ray in serverless context

X-Ray tracing must be enabled explicitly before traces are sent. In this project we have an API Gateway and two lambdas which we want to trace.

For API Gateway, add the following to the CDK resource:

```
deployOptions: {
  tracingEnabled: true,
},
```

For both lambas:

```
import * as lambda from 'aws-cdk-lib/aws-lambda';

...
tracing: lambda.Tracing.ACTIVE,
...
```

## Important concepts

### Segments and subsegments

Segments act as the main level container for a trace. Each request through the API Gateway automatically creates a segment, which again contains subsegments that represent traces from all the different parts of services and code segments that we want to trace in a request.

### Annotations

Annotations are used to index data. They are very useful when finding traces from the Cloudwatch console. Annotations are passed as a key value pair to a segment or a subsemgent.

### Metadata

Metadata is just additional data you want to pass to the segment or subsegment, these will not be used to index the traces.

## Tracing

After enabling tracing in API Gateway and lambdas, a trace is sent for each request which shows the API Gateway part and the lambda part of the request.

To get more detailed tracing showing what is happening inside the lambda, we need to do some instrumentation. We do this utilizing the AWS X-Ray SDK.

### Finding traces:

Traces can be searched by a few different ways, but the easiest way is to use annotations.

Traces can be fetched by using "service" name, for example for the demo API Gateway, the query in the Cloudwatch traces console would look like this:

```
service(id(name: "XRayDemoAPI/prod" , type: "AWS::ApiGateway::Stage" ))
```

If you wanted to fetch traces for a single lambda, the query using the "service" name would look like this:

```
service(id(name: "XrayDemoStack-xraydemohandlerone27467568-UhaeN1MFbLog" , type: "AWS::Lambda::Function" , account.id: "046317568599"))
```

As you can see this is not very user friendly.

This is why it's recommended to use annotations to create indexing that is easy to use. For example in different lambda functions, it is recommended to give a human readeable name for the function and add that as annotation to the main segment:

```typescript
AWSXRay.getSegment()?.addAnnotation('componentName', 'someLambda');
```

After this, you can search traces for the lambda in the Cloudwatch traces console using the following query:

```
annotation.componentName = "someLambda"
```

### Tracing AWS Services

Tracing AWS services can be done easily with the X-Ray SDK:

```typescript
const client = AWSXRay.captureAWSClient(new SomeAWSService());
```

the `.captureAWSClient` wraps the given AWS SDK client and adds a subsegment automatically to the segment each time the client calls AWS APIs. The data traced is usually pretty minimal though, so if you want to add extensive metadata to the traces, it is recommended to use custom subsegments.

### Custom subsegments

The X-Ray SDK can be used to create custom subsegments. You define when the subsegment starts and ends, and you can add any number of custom metadata and annotations.

A simple JS example:

```
const subsegment = AWSXRay.getSegment()?.addNewSubsegment('MySubsegment');

// Do some stuff you wan't to trace

subsegment?.close();
```

This creates a subsegment which shows the time it took for it to complete in the segment.

For a more robust way to handle subsegments, especially in case of errors, would be to create a helper function which has error handling.

Example helper:

```typescript
const traceWithXray = async <T>(
  subsegmentName: string,
  f: () => Promise<T>
) => {
  const subsegment = AWSXRay.getSegment()?.addNewSubsegment(subsegmentName);

  try {
    const result = await f();
    subsegment?.close();
    return result;
  } catch (err) {
    subsegment?.addError((err as Error).message);
    subsegment?.close();
    throw err;
  }
};
```

This way it is easy to use and any errors will be recorded to the trace as well.
