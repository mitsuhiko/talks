.PHONY: all html pdf clean open serve

SRC = me-and-the-machine.md
HTML = me-and-the-machine.html
PDF = me-and-the-machine.pdf

all: html pdf

html: $(HTML)

pdf: $(PDF)

$(HTML): $(SRC) inject-backdrop.js
	npx @marp-team/marp-cli --html $(SRC) -o $(HTML)
	node inject-backdrop.js $(HTML)

$(PDF): $(SRC)
	npx @marp-team/marp-cli --html $(SRC) -o $(PDF)

clean:
	rm -f $(HTML) $(PDF)

serve:
	python -m http.server 4005

open: $(HTML)
	(sleep 1 && open http://localhost:4005/$(HTML)) &
	@lsof -i :4005 >/dev/null 2>&1 || $(MAKE) serve
