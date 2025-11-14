#!/bin/bash

# EXAMPLE USAGE:
# ./run_bit.sh --interval 10 --url http://127.0.0.2 --port 5000

TEST_SCRIPT=test/test.py

# Default configuration
DEFAULT_INTERVAL=0
DEFAULT_URL="http://127.0.0.1"
DEFAULT_PORT=3000

# Initialize variables with defaults
CONFIG_INTERVAL="${DEFAULT_INTERVAL}"
CONFIG_URL="${DEFAULT_URL}"
CONFIG_PORT="${DEFAULT_PORT}"

# --- Argument Parsing ---
# Loop through the arguments to extract --interval, --url, and --port
while [[ "$#" -gt 0 ]]; do
    case "$1" in
        --interval)
             # --- INTEGER VALIDATION FOR INTERVAL ---
            # Check if the next argument is a positive integer or zero
            if [[ "$2" =~ ^[0-9]+$ ]]; then
                CONFIG_INTERVAL="$2"
                shift # consume argument value
            else
                echo "Error: --interval value must be a non-negative integer." >&2
                echo "Using default interval of ${DEFAULT_INTERVAL} seconds." >&2
                # If invalid, we don't consume $2, but we do set the variable to the default
                CONFIG_INTERVAL="${DEFAULT_INTERVAL}"
            fi
            ;;
        --url)
            CONFIG_URL="$2"
            shift # consume argument value
            ;;
        --port)
            CONFIG_PORT="$2"
            shift # consume argument value
            ;;
        -h|--help)
            echo "Usage: $0 [--interval <seconds>] [--url <address>] [--port <port>]"
            echo ""
            echo "Parses and displays the configuration variables for a client script."
            echo ""
            echo "  --interval <seconds>  How often the tests should run (Default: ${DEFAULT_INTERVAL})"
            echo "  --url <address>       URL of the server to ping (Default: ${DEFAULT_URL})"
            echo "  --port <port>         Port the server is running on (Default: ${DEFAULT_PORT})"
            exit 0
            ;;
        *)
            # Ignore unknown flags or process the next argument
            ;;
    esac
    shift # consume key/flag
done

# --- Output Configuration ---

# Ensure URL doesn't end with a slash for clean address construction
CLEAN_URL=$(echo "${CONFIG_URL}" | sed 's/\/$//')

# Construct the full server address
SERVER_ADDRESS="${CLEAN_URL}:${CONFIG_PORT}"

echo "--- Client Configuration Variables ---"
echo "Interval (How often the tests run): ${CONFIG_INTERVAL} seconds"
echo "URL (Server address): ${CLEAN_URL}"
echo "Port: ${CONFIG_PORT}"
echo "--- Derived Full Server Address: ${SERVER_ADDRESS} ---"

python $TEST_SCRIPT --interval ${CONFIG_INTERVAL} --url ${CLEAN_URL} --port ${CONFIG_PORT}
