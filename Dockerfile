FROM python:3.7.11-slim
RUN  apt-get update \
  && apt-get install gcc libgmp3-dev -y \
  && apt-get clean
WORKDIR /app
RUN pip install ecdsa fastecdsa sympy cairo-lang pytest pytest-asyncio
