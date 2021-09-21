FROM python:3.7.11-slim
RUN  apt-get update \
  && apt-get install gcc libgmp3-dev jq -y \
  && apt-get clean
WORKDIR /app
COPY ./check-status.sh ./check-status.sh
RUN pip install ecdsa fastecdsa sympy cairo-lang
