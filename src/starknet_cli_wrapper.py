"""Wrapper of Starknet CLI"""

import asyncio
from contextlib import redirect_stderr, redirect_stdout
from http.server import HTTPServer, BaseHTTPRequestHandler
import io
import json
import sys

# imports resolvable in the venv specified by user
try:
    from starkware.starknet.cli.starknet_cli import main as starknet_main
    from starkware.starknet.compiler.compile import main as starknet_compile_main
    from starkware.starknet.core.os.class_hash import compute_class_hash
    from starkware.starknet.services.api.contract_class import ContractClass
    from starkware.cairo.lang.migrators.migrator import main as cairo_migrate_main
except ImportError:
    sys.exit("Make sure the environment you configured has starknet (cairo-lang) installed!")

async def starknet_main_wrapper(args):
    sys.argv = [sys.argv[0], *args]
    return await starknet_main()

async def starknet_compile_main_wrapper(args):
    sys.argv = [sys.argv[0], *args]
    try:
        return starknet_compile_main()
    except Exception as err:
        # stderr was previously redirected to our StringIO
        print(err, file=sys.stderr)
        return 1

async def get_class_hash(args):
    path ,= args
    with open(path, encoding="utf-8") as file:
        raw_class = json.load(file)

    loaded_class = ContractClass.load(raw_class)
    class_hash = compute_class_hash(loaded_class)
    print(hex(class_hash))
    return 0

async def cairo_migrate_main_wrapper(args):
    sys.argv = [sys.argv[0], *args]
    try:
        return cairo_migrate_main()
    except Exception as err:
        print(err, file=sys.stderr)
        return 1

MAIN_MAP = {
    "starknet": starknet_main_wrapper,
    "starknet-compile": starknet_compile_main_wrapper,
    "get_class_hash": get_class_hash,
    "cairo-migrate": cairo_migrate_main_wrapper
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

        try:
            return await main(json_body["args"])
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
