.PHONY: help
help: makefile
	@tail -n +4 makefile | grep ".PHONY"


node_modules: package.json package-lock.json
	if test ! -d $@; then npm install --force; fi


.PHONY: format
format:
	echo 'TODO'


.PHONY: typecheck
typecheck: node_modules
	npx tsc --noEmit


.PHONY: build-workers
build-workers: node_modules
	npx vite build --config vite.config.workers.ts


.PHONY: build
build: typecheck build-workers node_modules
	npx vite build


# The main server part which is responsible for delivering the
# website and for server-side plugin integration and model processing
.PHONY: start
start: node_modules
	npx ts-node --esm bin/cli.ts start


# .PHONY: link-hooks  # Links git hooks into .git/hooks
# link-hooks:
# 	cakeUtilities.linkHooks()


.PHONY: lint
lint: node_modules
	npx eslint --ignore-pattern=.gitignore .


.PHONY: test-client
test-client: node_modules
	npx vitest run


.PHONY: test-units
test-units: node_modules
	npx vitest run --config vitest.config.node.ts


.PHONY: test
test: typecheck lint test-units test-client


.PHONY: prepublish
prepublish: node_modules
	npm test && npm run check-style


.PHONY: clean
clean:
	rm -rf node_modules
	rm -rf public


.PHONY: build-static
build-static: node_modules
	npx vite build --config vite.config.static.ts
	npx ts-node --esm scripts/build-static-html.ts
	@echo "Static build complete in dist-static/"
	@echo "Open dist-static/index.html in your browser to run without a server"
