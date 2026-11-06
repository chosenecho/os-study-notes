// Use the already-distributed, license-snapshotted KaTeX version at build time.
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const context = {module:{exports:{}},exports:{}};
vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../../docs/assets/vendor/katex/katex.min.js'),'utf8'),context);
const katex = context.module.exports;
const input = JSON.parse(fs.readFileSync(0,'utf8'));
try {
  process.stdout.write(JSON.stringify(input.map(({tex,display}) => katex.renderToString(tex,{
    displayMode:display,throwOnError:true,strict:'ignore',trust:false,output:'htmlAndMathml'
  }))));
} catch (error) {
  process.stderr.write('KaTeX build failed: ' + error.message + '\n');
  process.exitCode = 1;
}
