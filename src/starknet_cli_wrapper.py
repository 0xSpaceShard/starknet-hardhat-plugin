"""Wrapper of Starknet CLI"""

import asyncio
from contextlib import redirect_stderr, redirect_stdout
from http.server import HTTPServer, BaseHTTPRequestHandler
import io
import json
import sys

# imports resolvable in the venv specified by 
from starkware.starknet.cli.starknet_cli import main as starknet_main
from starkware.starknet.compiler.compile import main as starknet_compile_main

async def starknet_compile_main_wrapper():
    starknet_compile_main()

MAIN_MAP = {
    "starknet": starknet_main,
    "starknet-compile": starknet_compile_main_wrapper
}

class MyRequestHandler(BaseHTTPRequestHandler):
    def _set_headers(self):
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self.end_headers()

    def _get_json_body(self):
        content_length = int(self.headers["Content-Length"])
        raw_request_body = self.rfile.read(content_length).decode("utf-8")
        return json.loads(raw_request_body)

    exit_code = None

    async def _execute(self):
        json_body = self._get_json_body()

        command = json_body["command"]
        main = MAIN_MAP[command]

        args = json_body["args"]
        sys.argv = [sys.argv[0], *args]

        try:
            return await main()
        except:
            return 1 # error exit code

    def do_GET(self):
        """Useful for checking if server is alive."""
        self._set_headers()

    def do_POST(self):
        stdout = io.StringIO()
        stderr = io.StringIO()
        with redirect_stdout(stdout), redirect_stderr(stderr):
            event_loop = asyncio.get_event_loop()
            self.exit_code = event_loop.run_until_complete(self._execute())

        resp = {
            "statusCode": self.exit_code,
            "stdout": stdout.getvalue(),
            "stderr": stderr.getvalue()
        }

        self._set_headers()
        self.wfile.write(json.dumps(resp).encode("utf-8"))

try:
    port = int(sys.argv[1])
except:
    sys.exit("A numeric port must be specified")

def run(server_class=HTTPServer, handler_class=MyRequestHandler):
    server_address = ("", port)
    httpd = server_class(server_address, handler_class)
    print("Listening on port", port)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("Exiting")

run()
