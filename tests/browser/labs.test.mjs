import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {chromium} from 'playwright';
import {questions} from '../../docs/assets/javascripts/labs/quiz-bank.mjs';
import {runThemeChecks} from './theme-checks.mjs';
import {runSeoChecks} from './seo-checks.mjs';
const root=path.resolve('dist'),out=path.resolve(process.env.STUDY_OUTPUT_DIR||'artifacts/browser/labs');fs.mkdirSync(out,{recursive:true});
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'application/javascript','.mjs':'application/javascript','.svg':'image/svg+xml','.woff2':'font/woff2','.json':'application/json'};
const server=http.createServer((req,res)=>{
 try{
  let name=decodeURIComponent(new URL(req.url,'http://localhost').pathname);
  if(name.endsWith('/'))name+='index.html';
  const file=path.resolve(root,'.'+name);
  if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
  const body=fs.readFileSync(file);
  res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream'});
  res.end(body);
 }catch{res.writeHead(404).end();}
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base=process.env.STUDY_BASE_URL||'http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true}),report={base,checks:[],screenshots:[],errors:[]};
function ok(name){report.checks.push(name);}
try{
 const page=await browser.newPage({viewport:{width:1280,height:900}});page.on('pageerror',e=>report.errors.push(String(e)));
 await runSeoChecks(page,{base,out,report});
 await runThemeChecks(page,{base,out,report});
 const syllabus=JSON.parse(fs.readFileSync('config/syllabus.json','utf8'));
 for(const chapter of syllabus.chapters){
  await page.goto(base+'/'+chapter.path.replace(/^docs[/]/,'').replace(/[.]md$/,'/'),{waitUntil:'networkidle'});
  if(await page.locator('.arithmatex').count())await page.waitForFunction(()=> [...document.querySelectorAll('.arithmatex')].every(el=>el.querySelector('.katex')));
  assert.equal(await page.locator('.katex-error').count(),0,chapter.id+' math');
  assert.equal(await page.locator('.exercise-item').count(),chapter.practice.length,chapter.id+' practice');
  assert.equal(await page.locator('.exercise-answer').count(),chapter.practice.length,chapter.id+' answers');
  assert.equal(await page.locator('.exercise-answer[open]').count(),0,chapter.id+' folded');
 }
 ok('All registered chapters: formulas render, syllabus question counts match, authored answers fold');
  await page.goto(base+'/courses/operating-systems/chapter-01/',{waitUntil:'networkidle'});assert.equal(await page.evaluate(()=>performance.getEntriesByType('resource').some(r=>/[/](scheduler|scheduling|labs|labs-core|quiz-bank)[.]mjs/.test(r.name))),false);ok('Reading a chapter does not load exercise models or quiz bank');
 const complete=page.locator('[data-complete]');await complete.check();await page.reload({waitUntil:'networkidle'});assert.equal(await complete.isChecked(),true);ok('Chapter progress survives reload with module scripts');
 await page.goto(base+'/labs/scheduling/',{waitUntil:'networkidle'});
 for(const [algorithm,average] of [['fcfs','6.5'],['spf','5.75'],['rr','7']]){await page.locator('[name=algorithm]').selectOption(algorithm);await page.locator('[data-scheduler] button[type=submit]').click();assert((await page.locator('.lab-results').innerText()).includes(average));assert(await page.locator('.gantt').isVisible());}
 assert.equal(await page.locator('[name=quantum]').isDisabled(),false);await page.locator('[name=algorithm]').selectOption('fcfs');assert.equal(await page.locator('[name=quantum]').isDisabled(),true);assert.equal(await page.locator('.gantt').count(),0);assert.match(await page.locator('.lab-results').innerText(),/参数已更新/);await page.locator('[data-scheduler] button[type=submit]').click();await page.locator('[name=burst-0]').fill('6');assert.equal(await page.locator('.gantt').count(),0);ok('Shared scheduling module runs FCFS, SPF and RR in the browser');
 const open=async kind=>{const r=await page.goto(base+'/labs/'+kind+'/',{waitUntil:'networkidle'});assert.equal(r.status(),200);await page.waitForSelector('.study-lab form');};
 const fill=async(name,value)=>page.locator('[name='+name+']').fill(String(value));
 const run=async()=>{await page.getByRole('button',{name:'运行并核对',exact:true}).click();};
 const result=()=>page.locator('.study-result');
 await open('paging');assert(!(await result().innerText()).includes('缺页率'));await fill('prediction',5);await run();assert.match(await result().innerText(),/预测正确/);assert.equal(await page.locator('.study-steps li:visible').count(),1);await page.getByRole('button',{name:'下一步',exact:true}).click();assert.equal(await page.locator('.study-steps li:visible').count(),2);await page.getByRole('button',{name:'上一步',exact:true}).click();assert.equal(await page.locator('.study-steps li:visible').count(),1);await page.getByRole('button',{name:'显示全部步骤'}).click();assert.equal(await page.locator('.study-steps li:visible').count(),7);ok('FIFO 5 faults, prediction, next/previous/all');
 for(const [algorithm,faults] of [['lru',6],['opt',5]]){await page.locator('[name=algorithm]').selectOption(algorithm);await run();assert.match(await result().innerText(),new RegExp('缺页 '+faults+' 次'));}ok('LRU and OPT switching');
 await fill('refs','1 -2');await run();assert.equal(await page.locator('[name=refs]').getAttribute('aria-invalid'),'true');await page.getByRole('button',{name:'恢复示例'}).click();assert.equal(await page.locator('[name=refs]').getAttribute('aria-invalid'),null);await run();assert.match(await result().innerText(),/缺页 5 次/);ok('Invalid input, field feedback and reset');
 await fill('refs','');await run();assert.match(await result().innerText(),/未运行：请填写页号访问串/);assert.match(await page.locator('#study-paging-refs-error').innerText(),/请填写页号访问串/);ok('Native constraint failures use Chinese feedback and mark the result as not run');
 await page.locator('[name=refs]').press('Enter');assert.match(await result().innerText(),/未运行：请填写页号访问串/);await fill('refs','2 3');await fill('frames',0);await run();assert.match(await result().innerText(),/未运行：页框数不能小于 1/);ok('Keyboard submit and numeric range failures use the same result state');
 await open('banker');await fill('process','');await fill('request','');await run();assert.match(await result().innerText(),/P0 → P1 → P2/);await fill('process',4);await run();assert.match(await result().innerText(),/未运行：进程编号范围为 0 到 2/);await fill('process',0);await fill('request','1 0');await run();assert.match(await result().innerText(),/本次请求可批准/);await page.getByRole('button',{name:'显示全部步骤'}).click();assert.match(await result().innerText(),/当前（含试分配） Allocation \[2, 0\]/);await fill('process',1);await fill('request','1 0');await run();assert.match(await result().innerText(),/本次试分配应撤销/);await fill('request','2 0');await run();assert.match(await result().innerText(),/Available/);ok('Banker request fields are conditional, consistently validated and explicit about temporary allocation');
 await open('address');await fill('prediction',7620);await run();assert.match(await result().innerText(),/预测正确/);await fill('logical',3072);await run();assert.match(await result().innerText(),/缺页；本次不生成物理地址/);await fill('logical',4096);await run();assert.match(await result().innerText(),/越界；本次不生成物理地址/);ok('Address resident, missing and out of bounds');
 await open('cache');await fill('prediction',4);await run();assert.match(await result().innerText(),/预测正确/);assert.match(await result().innerText(),/命中 2 次/);ok('Direct mapped cache hit and conflict');
 await open('complement');await run();assert.match(await result().innerText(),/解释为 -116/);await page.locator('[name=operation]').selectOption('sub');await fill('a',-128);await fill('b',-128);await run();assert.match(await result().innerText(),/未发生有符号溢出/);await fill('b',1);await run();assert.match(await result().innerText(),/发生有符号溢出/);await page.locator('[name=width]').selectOption('4');await run();assert.equal(await page.locator('[name=a]').getAttribute('aria-invalid'),'true');ok('Complement overflow, subtraction and width validation');
 await open('quiz');assert.equal(await page.locator('[data-next]').isDisabled(),true);await page.getByRole('button',{name:'提交答案'}).click();assert.match(await page.locator('[data-quiz-feedback]').innerText(),/请先选择/);
 for(let i=0;i<questions.length;i++){const q=questions[i],choice=i===0||i===2?(q.answer+1)%q.options.length:q.answer;await page.locator('input[value="'+choice+'"]').check();await page.getByRole('button',{name:'提交答案'}).click();assert((await page.locator('[data-quiz-feedback]').innerText()).includes(q.explanation));const href=await page.getByRole('link',{name:'回看本章笔记'}).getAttribute('href');assert.equal((await page.request.get(new URL(href,page.url()).href)).status(),200);await page.locator('[data-next]').click();}
 assert((await page.locator('[data-quiz-body]').innerText()).includes('答对 '+(questions.length-2)+' / '+questions.length+' 题'));await page.getByRole('button',{name:'重练本轮错题'}).click();for(const q of [questions[0],questions[2]]){await page.locator('input[value="'+q.answer+'"]').check();await page.getByRole('button',{name:'提交答案'}).click();await page.locator('[data-next]').click();}assert.match(await page.locator('[data-quiz-body]').innerText(),/答对 2 [/] 2 题/);assert.equal(await page.getByRole('button',{name:'重练本轮错题'}).isDisabled(),true);ok('All registered answers, chapter links, score and two-question retry');
 for(const course of JSON.parse(fs.readFileSync('config/courses.json','utf8'))){
  await page.locator('#quiz-course').selectOption(course.id);
  const count=questions.filter(q=>q.course===course.id).length;
  assert((await page.locator('[data-quiz-progress]').innerText()).includes('0 / '+count));
  assert((await page.locator('[data-quiz-body]').innerText()).includes(course.title));
 }
 await page.locator('input[value="0"]').focus();await page.keyboard.press('Space');assert.equal(await page.locator('input[value="0"]').isChecked(),true);ok('Every registered course filter, clean round and keyboard radio');
 for(const width of [1280,390,320]){await page.setViewportSize({width,height:900});for(const kind of ['paging','banker','address','cache','complement','quiz']){if(kind==='quiz')await page.evaluate(()=>localStorage.removeItem('studynote:quiz:v1'));await open(kind);if(kind==='quiz'){await page.locator('input[value="1"]').check();await page.getByRole('button',{name:'提交答案'}).click();}else{await run();await page.getByRole('button',{name:'显示全部步骤'}).click();}const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+1);assert.equal(overflow,false,kind+' '+width+' overflow');const tooSmall=await page.locator('.study-lab button').evaluateAll(els=>els.some(e=>e.getBoundingClientRect().height<44));assert.equal(tooSmall,false,kind+' button target');if(width!==320){await page.locator('.study-lab').scrollIntoViewIfNeeded();const name=kind+'-'+width+'.png';await page.screenshot({animations:'disabled',path:path.join(out,name)});report.screenshots.push(name);}}}ok('Six pages at 320/390/1280 px, no overflow and 44px buttons');
 await page.evaluate(()=>document.body.setAttribute('data-md-color-scheme','slate'));await page.screenshot({animations:'disabled',path:path.join(out,'quiz-dark.png')});report.screenshots.push('quiz-dark.png');
 assert.deepEqual(report.errors,[]);report.passed=true;fs.writeFileSync(path.join(out,'browser-checks.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report));
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
