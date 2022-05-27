#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { XrayDemoStack } from '../lib/xray-demo-stack';
import envs from '../lib/envs';

const app = new cdk.App();
new XrayDemoStack(app, 'XrayDemoStack', {
  env: envs.ciritSandbox,
});
