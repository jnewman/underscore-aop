test:
	./node_modules/.bin/grunt test

init-testing:
	git submodule add https://github.com/visionmedia/mocha.git test/vendor/mocha
	git submodule add https://github.com/chaijs/chai.git test/vendor/chai
	git submodule init
	npm install

update:
	git submodule update
	npm install

.PHONY: test init-testing update-testing
