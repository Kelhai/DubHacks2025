#!/usr/bin/env bash
set -e
GOOS=linux GOARCH=amd64 go build -o bootstrap hello.go
zip function.zip bootstrap

