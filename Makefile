test:
	node tests/crash-tests.js
	node tests/webimage-tests.js

pushall:
	git push origin master && npm publish

prettier:
	prettier --single-quote --write "**/*.js"
