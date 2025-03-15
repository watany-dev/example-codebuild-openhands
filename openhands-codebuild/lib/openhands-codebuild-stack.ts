import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import * as codebuild from 'aws-cdk-lib/aws-codebuild';
import * as iam from 'aws-cdk-lib/aws-iam';

export class OpenhandsCodebuildStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Get the CodeStar connection ARN from context
    const connectionArn = this.node.tryGetContext('codestar_connection_arn') || 
      'arn:aws:codestar-connections:us-east-1:123456789012:connection/example-id';
    
    // GitHub repository details
    const owner = this.node.tryGetContext('github_owner') || 'your-organization';
    const repo = this.node.tryGetContext('github_repo') || 'your-repository';
    const branch = this.node.tryGetContext('github_branch') || 'main';

    // Create CodeBuild project
    const buildProject = new codebuild.Project(this, 'OpenhandsCodeBuild', {
      projectName: 'openhands-build',
      description: 'CodeBuild project for OpenHands with GitHub integration',
      source: codebuild.Source.gitHub({
        owner: owner,
        repo: repo,
        branchOrRef: branch,
        webhook: true, // Enable webhook for automatic builds
        webhookFilters: [
          codebuild.FilterGroup.inEventOf(codebuild.EventAction.PUSH)
            .andBranchIs(branch),
          codebuild.FilterGroup.inEventOf(codebuild.EventAction.PULL_REQUEST_CREATED, 
                                         codebuild.EventAction.PULL_REQUEST_UPDATED)
        ],
      }),
      environment: {
        buildImage: codebuild.LinuxBuildImage.STANDARD_7_0,
        privileged: true, // Required for Docker commands
      },
      buildSpec: codebuild.BuildSpec.fromSourceFilename('buildspec.yml'),
    });

    // Add CodeStar connection policy
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: ['codestar-connections:UseConnection'],
        resources: [connectionArn],
      })
    );

    // Add additional permissions as needed
    buildProject.addToRolePolicy(
      new iam.PolicyStatement({
        actions: [
          'logs:CreateLogGroup',
          'logs:CreateLogStream',
          'logs:PutLogEvents'
        ],
        resources: [
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/codebuild/${buildProject.projectName}`,
          `arn:aws:logs:${this.region}:${this.account}:log-group:/aws/codebuild/${buildProject.projectName}:*`
        ],
      })
    );

    // Output the CodeBuild project ARN
    new cdk.CfnOutput(this, 'CodeBuildProjectArn', {
      value: buildProject.projectArn,
      description: 'The ARN of the CodeBuild project',
    });
  }
}
