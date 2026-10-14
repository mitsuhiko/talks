#!/bin/sh
# Builds book.html from the chapters and prints it to pi-durable-book.pdf with headless Chrome.
set -e
cd "$(dirname "$0")"

{
	printf '<!doctype html>\n<html lang="en"><head><meta charset="utf-8"><title>Pi Durable: A Field Guide</title>\n'
	printf '<link rel="stylesheet" href="style.css"></head><body>\n'
	cat chapters/*.html
	printf '</body></html>\n'
} > book.html

CHROME="${CHROME:-/Applications/Google Chrome.app/Contents/MacOS/Google Chrome}"
"$CHROME" --headless=new --disable-gpu --no-pdf-header-footer \
	--print-to-pdf="$PWD/pi-durable-book.pdf" "file://$PWD/book.html" 2>/dev/null

echo "wrote $PWD/pi-durable-book.pdf"
