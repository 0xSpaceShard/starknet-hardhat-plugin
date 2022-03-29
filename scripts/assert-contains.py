#!/bin/python3

"""
Asserts that stdin contains the <PATTERN> provided as CLI argument.
"""

import sys

if len(sys.argv) != 2:
    sys.exit(sys.argv[0] + " <PATTERN>")

pattern = sys.argv[1]
input_content = sys.stdin.read()

if pattern in input_content:
    sys.exit(0)

print("Pattern not in input", file=sys.stderr)
print("Pattern:", pattern, file=sys.stderr)
print("Input:", input_content, file=sys.stderr)

sys.exit(1)
