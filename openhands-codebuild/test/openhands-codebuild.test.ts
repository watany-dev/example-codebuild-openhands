import * as cdk from 'aws-cdk-lib';
import { Template } from 'aws-cdk-lib/assertions';
import * as OpenhandsCodebuild from '../lib/openhands-codebuild-stack';

test('CodeBuild Project Created', () => {
  const app = new cdk.App();
  // WHEN
  const stack = new OpenhandsCodebuild.OpenhandsCodebuildStack(app, 'MyTestStack');
  // THEN
  const template = Template.fromStack(stack);

  // Verify CodeBuild project is created
  template.resourceCountIs('AWS::CodeBuild::Project', 1);
  
  // Verify IAM role and policies are created
  template.hasResourceProperties('AWS::IAM::Role', {
    AssumeRolePolicyDocument: {
      Statement: [
        {
          Action: 'sts:AssumeRole',
          Effect: 'Allow',
          Principal: {
            Service: 'codebuild.amazonaws.com'
          }
        }
      ]
    }
  });
  
  // Verify output is created
  template.hasOutput('CodeBuildProjectArn', {});
});
