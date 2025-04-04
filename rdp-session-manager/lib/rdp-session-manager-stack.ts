import * as cdk from 'aws-cdk-lib';
import * as ec2 from 'aws-cdk-lib/aws-ec2';
import * as iam from 'aws-cdk-lib/aws-iam';
import { Construct } from 'constructs';

export class RdpSessionManagerStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // VPC作成
    const vpc = new ec2.Vpc(this, 'RdpVpc', {
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

    // EC2インスタンス用セキュリティグループ
    const securityGroup = new ec2.SecurityGroup(this, 'RdpSecurityGroup', {
      vpc,
      description: 'Allow RDP access via Session Manager',
      allowAllOutbound: false  // デフォルトですべての送信トラフィックをブロック
    });

    // 必要な送信トラフィックのみを許可
    securityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(443),
      'HTTPS for SSM and Windows updates'
    );

    securityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.tcp(80),
      'HTTP for Windows updates'
    );

    securityGroup.addEgressRule(
      ec2.Peer.anyIpv4(),
      ec2.Port.udp(53),
      'DNS queries'
    );

    const instanceRole = new iam.Role(this, 'RdpInstanceRole', {
        assumedBy: new iam.ServicePrincipal('ec2.amazonaws.com'),
        managedPolicies: [
          iam.ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMManagedInstanceCore')
        ]
      })
    // EC2インスタンス作成
    const instance = new ec2.Instance(this, 'RdpInstance', {
      vpc,
      vpcSubnets: { subnetType: ec2.SubnetType.PRIVATE_WITH_EGRESS },
      instanceType: ec2.InstanceType.of(ec2.InstanceClass.T3, ec2.InstanceSize.MEDIUM),
      machineImage: ec2.MachineImage.latestWindows(ec2.WindowsVersion.WINDOWS_SERVER_2022_JAPANESE_FULL_BASE),
      securityGroup,
      role: instanceRole
    });

    // 特定のEC2インスタンスにのみアクセスできるIAMユーザー
    const user = new iam.User(this, 'RdpSessionManagerUser');

    // 特定のインスタンスのみにSession Managerアクセスを制限するポリシー
    const restrictedSessionPolicy = new iam.Policy(this, 'RestrictedSessionPolicy', {
      statements: [
        new iam.PolicyStatement({
          actions: [
            'ssm:StartSession'
          ],
          resources: [
            `arn:aws:ec2:${cdk.Stack.of(this).region}:${cdk.Stack.of(this).account}:instance/${instance.instanceId}`,
            'arn:aws:ssm:*:*:document/AWS-StartPortForwardingSession'
          ]
        }),
        new iam.PolicyStatement({
          actions: [
            'ssm:TerminateSession',
            'ssm:ResumeSession'
          ],
          resources: [
            'arn:aws:ssm:*:*:session/${aws:username}-*'
          ]
        })
      ]
    });

    restrictedSessionPolicy.attachToUser(user);

    // 出力
    new cdk.CfnOutput(this, 'InstanceId', {
      value: instance.instanceId,
      description: 'EC2 Instance ID for RDP access via Session Manager',
    });

    new cdk.CfnOutput(this, 'IAMUserName', {
      value: user.userName,
      description: 'IAM User with restricted Session Manager access',
    });

    new cdk.CfnOutput(this, 'RDPCommand', {
      value: `aws ssm start-session --target ${instance.instanceId} --document-name AWS-StartPortForwardingSession --parameters "portNumber=3389,localPortNumber=13389"`,
      description: 'Command to start RDP port forwarding session',
    });
  }
}
