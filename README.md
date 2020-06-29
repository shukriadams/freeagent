# FreeAgent

Standalone CI runner

## Runtime requirements

- Git 2.18 or higher
- Bash

## Build

    npm install -g pkg
    cd src
    pkg . --targets win --output ./build/freeagent
    pkg . --targets node10-linux-x64 --output ./build/freeagent