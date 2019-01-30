# vscode-fast
Visual Studio Code extension for fAST

To install this extension, you need to prepare the following commands:
```
cp scripts/fast ~/bin/fast
python3 install -r requirements.txt
```

To use this extension, you will
1) Open a C++ or Java program in the editor
      fast will be run to generate the protobuf representation of the AST, which will be saved as "file.cpp";
      live_test.py will be run to generate highlighted attention ids as a CSV file, which will be saved as "file.csv";
  and the highlighted HTML will be generated as "file.html";

2) The "PROGRAM" diagnostic window will show all the AST elements with the node type, lineno, column no information;

3) Enter the command, e.g., Cmd + P + > + Big Coding

4) a "Big Code" webview will be opened to view the highlighted code.

