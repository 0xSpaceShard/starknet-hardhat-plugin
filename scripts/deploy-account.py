import asyncio
import sys
import json
from argparse import Namespace
from starkware.starknet.cli.starknet_cli import deploy_account

options = json.loads(sys.argv[1])

asyncio.run(deploy_account(Namespace(network=options.network,network_id=options.network,wallet=options.wallet,account=options.accountName,account_dir=options.accountDir,flavor=None,gateway_url=options.gatewayUrl + "/gateway",feeder_gateway_url=options.feederGatewayUrl + "/feeder_gateway'",command="deploy_account"),[]))