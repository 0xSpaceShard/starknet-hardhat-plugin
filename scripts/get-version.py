#!/bin/python3

"""
Returns the version used in this project of the tool provided as a CLI argument.
"""

import sys

if len(sys.argv) != 2:
    sys.exit(sys.argv[0] + " <TOOL>")

tool = sys.argv[1].strip()

TOOLS_USED = {
    "starknet-devnet": "0.1.22"
}

if tool not in TOOLS_USED:
    tools_used_stringified = ", ".join(TOOLS_USED.keys())
    sys.exit(sys.argv[0] + f": Error: {tool} is not used in this project; tools used: {tools_used_stringified}")

print(TOOLS_USED[tool])
