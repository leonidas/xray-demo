import { Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as apigateway from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as constants from '../lib/constants';

export class XrayDemoStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const demoTable = new dynamodb.Table(this, 'xray-demo-table', {
      tableName: constants.TABLE_NAME,
      partitionKey: { name: 'pk', type: dynamodb.AttributeType.STRING },
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
    });

    const lambdaRole = new iam.Role(this, 'LambdaRole', {
      assumedBy: new iam.ServicePrincipal('lambda.amazonaws.com'),
    });

    lambdaRole.addManagedPolicy(
      iam.ManagedPolicy.fromAwsManagedPolicyName(
        'service-role/AWSLambdaBasicExecutionRole'
      )
    );

    // CDK adds the X-Ray write access automatically
    // lambdaRole.addManagedPolicy(iam.ManagedPolicy.fromAwsManagedPolicyName('AWSXRayDaemonWriteAccess'));

    lambdaRole.addToPolicy(
      new iam.PolicyStatement({
        resources: [demoTable.tableArn],
        actions: ['dynamodb:*'],
      })
    );

    const xrayDemoHandler1 = new lambda.Function(
      this,
      'xray-demo-handler-one',
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        code: lambda.Code.fromAsset('resources'),
        handler: 'xray-demo-1.main',
        role: lambdaRole,
        timeout: Duration.seconds(30),
        tracing: lambda.Tracing.ACTIVE,
      }
    );

    const xrayDemoHandler2 = new lambda.Function(
      this,
      'xray-demo-handler-two',
      {
        runtime: lambda.Runtime.NODEJS_16_X,
        code: lambda.Code.fromAsset('resources'),
        handler: 'xray-demo-2.main',
        role: lambdaRole,
        timeout: Duration.seconds(30),
        tracing: lambda.Tracing.ACTIVE,
      }
    );

    const api = new apigateway.RestApi(this, 'xray-demo-api', {
      restApiName: 'XRayDemoAPI',
      description: 'API for the X-ray demo',
      deployOptions: {
        tracingEnabled: true,
      },
    });

    const xrayDemoHandlerIntegration1 = new apigateway.LambdaIntegration(
      xrayDemoHandler1,
      {
        requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      }
    );

    const xrayDemoHandlerIntegration2 = new apigateway.LambdaIntegration(
      xrayDemoHandler2,
      {
        requestTemplates: { 'application/json': '{ "statusCode": "200" }' },
      }
    );

    const ykkonenResource = api.root.addResource('ykkonen');
    const kakkonenResource = api.root.addResource('kakkonen');
    ykkonenResource.addMethod('GET', xrayDemoHandlerIntegration1);
    kakkonenResource.addMethod('GET', xrayDemoHandlerIntegration2);
  }
}
