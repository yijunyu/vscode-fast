rm -rf node_modules client/node_modules server/node_modules
npm install path child_process tempfile tsc fs vscode vscode-languageserver vscode vscode-languageserver vscode vscode-languageserver vscode vscode-languageserver
cd client && npm install child_process && npm run update-vscode && cd .. && npm run compile
vsce package
