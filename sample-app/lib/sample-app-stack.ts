import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as ecs from 'aws-cdk-lib/aws-ecs';
import * as elbv2 from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class SampleAppStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // Create custom VPC
    const vpc = new ec2.Vpc(this, 'AppVpc', {
      maxAzs: 2,
      natGateways: 1,
      subnetConfiguration: [
        {
          name: 'Public',
          subnetType: ec2.SubnetType.PUBLIC,
          cidrMask: 24,
        },
        {
          name: 'Private',
          subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS,
          cidrMask: 24,
        }
      ]
    });

    ec2.ManagedPrefixList.CLOUDFRONT
    const cloudfrontPrefix = ec2.PrefixList.fromPrefixListId(this, 'CDNID', 'pl-58a04531')
    const sg = new ec2.SecurityGroup(this, 'sg', { vpc });
    sg.connections.allowFrom(cloudfrontPrefix, ec2.Port.udp(80));

    // Create ECS cluster
    const cluster = new ecs.Cluster(this, 'EcsCluster', {
      vpc,
      containerInsights: true
    });

    // Create task definition
    const taskDefinition = new ecs.FargateTaskDefinition(this, 'TaskDef', {
      memoryLimitMiB: 512,
      cpu: 256,
    });

    taskDefinition.addContainer('AppContainer', {
      image: ecs.ContainerImage.fromRegistry('sample-app-repo:latest'),
      portMappings: [{ containerPort: 80 }],
    });

    taskDefinition.addToTaskRolePolicy(new iam.PolicyStatement({
      actions: ['ecr:GetAuthorizationToken', 'ecr:BatchCheckLayerAvailability', 'ecr:GetDownloadUrlForLayer', 'ecr:BatchGetImage'],
      resources: ['*'],
    }));

    // Create security groups
    const albSecurityGroup = new ec2.SecurityGroup(this, 'AlbSg', {
      vpc,
      allowAllOutbound: true,
    });
    albSecurityGroup.addIngressRule(ec2.Peer.anyIpv4(), ec2.Port.tcp(80));

    const serviceSecurityGroup = new ec2.SecurityGroup(this, 'ServiceSg', {
      vpc,
      allowAllOutbound: true,
    });
    serviceSecurityGroup.connections.allowFrom(albSecurityGroup, ec2.Port.tcp(80));

    // Create ALB
    const alb = new elbv2.ApplicationLoadBalancer(this, 'Alb', {
      vpc,
      internetFacing: true,
      securityGroup: albSecurityGroup,
    });

    const listener = alb.addListener('HttpListener', {
      port: 80,
      open: true,
    });

    // Create Fargate service
    const service = new ecs.FargateService(this, 'FargateService', {
      cluster,
      taskDefinition,
      securityGroups: [serviceSecurityGroup],
      desiredCount: 1,
      assignPublicIp: false,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
    });

    // Configure target group
    const targetGroup = listener.addTargets('ECS', {
      port: 80,
      targets: [service],
      healthCheck: {
        path: '/ready',
        interval: cdk.Duration.seconds(30),
      }
    });
  }
}
