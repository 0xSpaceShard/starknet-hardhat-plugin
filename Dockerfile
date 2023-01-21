FROM cimg/node:16.19

# Env vars
ENV TEST_SUBDIR=general-tests
ENV PYENV_ROOT="$HOME/.pyenv"
ENV PATH="$PYENV_ROOT/shims:$PYENV_ROOT/bin:$PATH"
ENV STARKNET_DEVNET="0.4.2"
USER root

# Install Python venv
RUN sudo apt update
RUN sudo apt-get install -y make build-essential libssl-dev zlib1g-dev \
libbz2-dev libreadline-dev libsqlite3-dev wget curl llvm \
libncursesw5-dev xz-utils tk-dev libxml2-dev libxmlsec1-dev libffi-dev liblzma-dev
RUN curl https://pyenv.run | bash
ENV PATH = "/root/.pyenv:$PATH"

# Preload Python 3.8.9 venv for faster tests
ENV PY_VERSION=3.8.9
RUN pyenv install $PY_VERSION
RUN pyenv global "$PY_VERSION"

# Preload Starknet Devnet for faster tests
RUN pip3 install "starknet-devnet==$STARKNET_DEVNET"

COPY . .
RUN npm ci

ENTRYPOINT ./scripts/test.sh