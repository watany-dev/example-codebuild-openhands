# OpenHands CodeBuild Project

This project creates an AWS CodeBuild project that integrates with GitHub repositories. It uses AWS CDK to define the infrastructure as code.

## Features

- GitHub integration using CodeStar connections
- Automated builds triggered by GitHub webhooks
- Customizable build environment and specifications
- IAM permissions for secure access to AWS resources

## Prerequisites

- AWS CLI configured with appropriate credentials
- AWS CodeStar connection to GitHub
- Node.js and npm installed

## Setup

1. Create a CodeStar connection to GitHub in the AWS Console
2. Update the `cdk.json` file with your connection ARN and GitHub repository details:
   ```json
   {
     "context": {
       "codestar_connection_arn": "YOUR_CONNECTION_ARN",
       "github_owner": "YOUR_GITHUB_USERNAME_OR_ORG",
       "github_repo": "YOUR_REPOSITORY_NAME",
       "github_branch": "main"
     }
   }
   ```
3. Deploy the stack using CDK

## Useful commands

* `npm run build`   compile typescript to js
* `npm run watch`   watch for changes and compile
* `npm run test`    perform the jest unit tests
* `npx cdk deploy`  deploy this stack to your default AWS account/region
* `npx cdk diff`    compare deployed stack with current state
* `npx cdk synth`   emits the synthesized CloudFormation template
