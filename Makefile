test:
	node tests/crash-tests.js
	node tests/webimage-tests.js
	node tests/burst-tests.js
	node tests/raw-to-gif-tests.js
	node tests/gif-tests.js

pushall:
	git push origin master && npm publish

prettier:
	prettier --single-quote --write "**/*.js"
