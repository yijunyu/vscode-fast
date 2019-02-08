npm install child_process tempfile tsc vscode vscode-languageclient
cd client && npm run update-vscode && cd .. && npm run compile
vsce package
