// A retry must refresh the whole failed dependency graph, not just this entry.
const revision = new URL(import.meta.url).search;
const [{integer, sequence, matrix, paging, banker, address, cache, complement}, {questions, questionSource}, {createQuizStore}, {getCourses}] = await Promise.all([
 import('./labs-core.mjs' + revision), import('./quiz-bank.mjs' + revision), import('./quiz-state.mjs' + revision), import('../course-catalog.mjs' + revision),
]);

const esc = value => String(value).replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const vector = row => '[' + row.join(', ') + ']';
const state = (values, name) => values.map((x,i) => name + i + '：' + (x === null ? '空' : x)).join('；');
const pct = n => (100 * n).toFixed(1) + '%';
const select = (name,label,choices,value) => ({name,label,choices,value});
const number = (name,label,value,min,max) => ({name,label,value,min,max,type:'number'});
const text = (name,label,value,help,area=false) => ({name,label,value,help,type:area?'textarea':'text'});
const configs = {
 paging: {fields:[select('algorithm','置换算法',[['fifo','FIFO'],['lru','LRU'],['opt','OPT']],'fifo'),number('frames','页框数',3,1,8),text('refs','页号访问串','2 3 4 2 5 3 6','1–40 个页号，范围 0–999；空格或逗号分隔')],prediction:number('prediction','预测缺页次数（可留空）','',0,40),run(get){
  const refs=get('refs',x=>sequence(x,999)), frames=get('frames',x=>integer(x,1,8,'页框数')), r=paging(refs,frames,get('algorithm'));
  return {answer:String(r.faults),summary:'缺页 '+r.faults+' 次；命中 '+r.hits+' 次；缺页率 '+pct(r.rate),steps:r.steps.map((s,i)=>({title:'访问 '+(i+1)+'：页 '+s.page+' · '+(s.hit?'命中':'缺页'),body:s.why+'。'+(s.victim===null?'':'淘汰页 '+s.victim+'。')+state(s.frames,'页框')+'。累计缺页 '+s.faults+' 次。'}))};
 }},
 banker: {fields:[text('available','Available · 当前可用','1 1','1–3 类资源，每项 0–999'),text('allocation','Allocation · 已分配（每行一个进程）','1 0\n0 1\n1 0','1–6 行，从 P0 开始，列数与 Available 一致',true),text('maximum','Max · 最大需求（每行一个进程）','2 1\n2 1\n1 2','行、列与 Allocation 对齐，Max 不小于已分配',true),number('process','请求进程编号（如 P0 填 0）',0,0,5),text('request','资源请求（可留空）','','留空检查原状态；例如 1 0，表示试分配给上面的进程')],prediction:select('prediction','预测结果（可不选）',[['','暂不预测'],['安全','安全 / 请求可批准'],['不安全','不安全 / 请求需拒绝'],['不满足前置条件','请求不满足前置条件']],'') ,run(get){
  const available=get('available',x=>sequence(x,999,3)), allocation=get('allocation',matrix), maximum=get('maximum',matrix), req=get('request').trim();
  const request=req?{process:get('process',x=>integer(x,0,allocation.length-1,'进程编号')),resources:get('request',x=>sequence(x,999,3))}:null;
  const r=get('maximum',()=>banker(available,allocation,maximum,request));
  const needStep={title:'先算各进程 Need',body:r.need.map((row,i)=>'P'+i+' '+vector(row)).join('；')};
  if(r.blocked)return {answer:'不满足前置条件',summary:r.blocked,steps:[needStep]};
  const steps=[needStep,{title:request?'试分配后的初始 Work':'安全性检查的初始 Work',body:vector(r.initialWork)+(request?'；试分配后 Need：'+r.checkNeed.map((row,i)=>'P'+i+' '+vector(row)).join('；'):'')} ,...r.steps.map(s=>({title:'假设 P'+s.process+' 完成',body:'Need '+vector(s.need)+' 逐项 ≤ Work '+vector(s.before)+'；归还 Allocation '+vector(s.released)+'，Work 变为 '+vector(s.after)+'。'}))];
  if(!r.safe)steps.push({title:'检查停止',body:'未完成进程 '+r.unfinished.map(i=>'P'+i).join('、')+' 中，没有任何一个 Need 逐项不超过 Work '+vector(r.finalWork)+'。不安全不等于已经死锁。'});
  return {answer:r.safe?'安全':'不安全',summary:r.safe?'安全；一条安全序列为 '+r.order.map(i=>'P'+i).join(' → ')+(request?'。本次请求可批准。':'。'):'不安全；找不到覆盖全部进程的安全序列。'+(request?'本次试分配应撤销，请求需拒绝。':''),steps};
 }},
 address: {fields:[number('logical','逻辑地址（十进制字节地址）',2500,0,16777215),select('size','页大小（字节）',[[256,'256 B'],[1024,'1 KiB'],[4096,'4 KiB'],[8192,'8 KiB']],'1024'),text('table','页表：各页对应的物理块号','5 2 7 -','从页 0 开始；- 表示未驻留；最多 32 项，块号 0–4095')],prediction:text('prediction','预测物理地址或状态（可留空）','','填写十进制物理地址，或“缺页”“越界”'),run(get){
  const logical=get('logical',x=>integer(x,0,16777215,'逻辑地址')), size=Number(get('size'));
  const table=get('table',x=>{const a=x.trim().split(/[\s,，、]+/);if(!x.trim()||a.length>32)throw Error('页表需要 1 到 32 项');return a.map(v=>v==='-'?null:integer(v,0,4095,'物理块号'));});
  const r=address(logical,size,table), steps=[{title:'拆分逻辑地址',body:logical+' = '+r.page+' × '+size+' + '+r.offset+'；页号 '+r.page+'，页内偏移 '+r.offset+'。'}];
  if(r.status==='驻留')steps.push({title:'查页表',body:'页 '+r.page+' 对应物理块 '+r.frame+'。偏移保持 '+r.offset+'。'},{title:'形成物理地址',body:r.frame+' × '+size+' + '+r.offset+' = '+r.physical+'。'});
  else steps.push({title:r.status==='缺页'?'页合法但未驻留':'页号超出页表',body:r.status==='缺页'?'该页表项标为 -。必须先处理缺页，本次不生成物理地址。':'页表共 '+table.length+' 项，有效页号为 0 到 '+(table.length-1)+'，不能把越界当作缺页。'});
  return {answer:r.physical===null?r.status:String(r.physical),summary:r.physical===null?r.status+'；本次不生成物理地址':'物理地址 '+r.physical+'（十进制），0x'+r.physical.toString(16).toUpperCase()+'（十六进制）',steps};
 }},
 cache: {fields:[select('lines','Cache 行数',[[2,'2 行'],[4,'4 行'],[8,'8 行'],[16,'16 行']],'4'),select('size','每块字节数',[[4,'4 B'],[16,'16 B'],[32,'32 B'],[64,'64 B']],'16'),text('refs','读取的字节地址串','0 4 16 64 0 16','十进制地址 0–16777215，最多 40 项')],prediction:number('prediction','预测不命中次数（可留空）','',0,40),run(get){
  const refs=get('refs',x=>sequence(x,16777215)),r=cache(refs,Number(get('lines')),Number(get('size')));
  return {answer:String(r.misses),summary:'不命中 '+r.misses+' 次；命中 '+r.hits+' 次；命中率 '+pct(r.rate),steps:r.steps.map((s,i)=>({title:'读取 '+(i+1)+'：地址 '+s.value+' · '+(s.hit?'命中':'不命中'),body:'块号 '+s.block+'，行号 '+s.line+'，标记 '+s.tag+'，块内偏移 '+s.offset+'。'+(s.hit?'该行有效且标记相同。':s.before===null?'该行原先无效，装入该块。':'原标记 '+s.before+' 不同，替换该行。')+'当前各行标记：'+state(s.tags,'行')+'。'}))};
 }},
 complement: {fields:[select('width','补码位宽',[[4,'4 位'],[8,'8 位'],[16,'16 位']],'8'),select('operation','运算',[['add','A + B'],['sub','A − B']],'add'),number('a','操作数 A（十进制）',100,-32768,32767),number('b','操作数 B（十进制）',40,-32768,32767)],prediction:select('prediction','预测有符号溢出（可不选）',[['','暂不预测'],['溢出','溢出'],['未溢出','未溢出']],'') ,run(get){
  const width=Number(get('width')), min=-(2**(width-1)),max=2**(width-1)-1;
  const a=get('a',x=>integer(x,min,max,'操作数 A')),b=get('b',x=>integer(x,min,max,'操作数 B')),op=get('operation'),r=complement(a,b,width,op);
  return {answer:r.overflow?'溢出':'未溢出',summary:(r.overflow?'发生有符号溢出':'未发生有符号溢出')+'；低 '+width+' 位解释为 '+r.signed,steps:[{title:'确认范围与编码',body:width+' 位范围为 '+min+' 到 '+max+'。A：'+r.a+'；B：'+r.b+'。'},{title:'做模 2^n 加法',body:(op==='sub'?'把 −B 按模 2^n 编码为 '+r.effectiveB+'，加到 A 上。':'将两操作数编码相加。')+'只保留低 '+width+' 位，得到 '+r.bits+'。'},{title:'分别解释两个结果',body:'真实数学结果为 '+r.real+'；低位模式按有符号补码解释为 '+r.signed+'。'+(r.overflow?'真实结果超出范围，发生溢出。':'真实结果在范围内，没有溢出。')}]};
 }}
};

function mountLab(root,kind) {
 const config=configs[kind], id='study-'+kind;
 root.classList.add('study-lab');
 function field(f){
  const attrs='id="'+id+'-'+f.name+'" name="'+f.name+'" aria-describedby="'+id+'-'+f.name+'-help '+id+'-'+f.name+'-error"';
  const required=f.name==='prediction'||f.name==='request'?'':' required';
  const control=f.choices?'<select '+attrs+'>'+f.choices.map(([v,l])=>'<option value="'+esc(v)+'"'+(String(v)===String(f.value)?' selected':'')+'>'+esc(l)+'</option>').join('')+'</select>':f.type==='textarea'?'<textarea '+attrs+' rows="5"'+required+'>'+esc(f.value)+'</textarea>':'<input '+attrs+' type="'+(f.type||'text')+'" value="'+esc(f.value)+'"'+(f.type==='number'?' min="'+f.min+'" max="'+f.max+'" step="1"':' maxlength="600"')+required+'>';
  return '<div class="study-field"><label for="'+id+'-'+f.name+'">'+esc(f.label)+'</label>'+control+'<small id="'+id+'-'+f.name+'-help">'+esc(f.help||'')+'</small><p class="study-error" id="'+id+'-'+f.name+'-error"></p></div>';
 }
 root.innerHTML='<form novalidate><div class="study-fields">'+config.fields.map(field).join('')+'</div><div class="study-prediction">'+field(config.prediction)+'</div><div class="lab-buttons"><button type="submit" class="md-button md-button--primary">运行并核对</button><button class="md-button" type="reset">恢复示例</button></div></form><div class="study-result" aria-live="polite" aria-atomic="true" tabindex="-1"><p>先做预测，运行后在这里查看结果。</p></div>';
 const form=root.querySelector('form'), result=root.querySelector('.study-result');
 const clearError=el=>{el.removeAttribute('aria-invalid');root.querySelector('#'+el.id+'-error').textContent='';el.setCustomValidity('');};
 const showError=(el,message)=>{el.setAttribute('aria-invalid','true');root.querySelector('#'+el.id+'-error').textContent=message;};
 const resetResult=()=>{result.innerHTML='<p>参数已更新，请重新运行核对。</p>';};
 form.addEventListener('input',e=>{clearError(e.target);resetResult();});
 form.addEventListener('change',resetResult);
 form.addEventListener('focusout',e=>{if(e.target.willValidate&&!e.target.validity.valid)showError(e.target,e.target.validationMessage);});
 form.addEventListener('reset',()=>{form.querySelectorAll('input,select,textarea').forEach(clearError);resetResult();});
 form.addEventListener('submit',e=>{
  e.preventDefault(); const fields=[...form.querySelectorAll('input,select,textarea')];fields.forEach(clearError);
  const invalid=fields.find(el=>!el.validity.valid);
  if(invalid){showError(invalid,invalid.validationMessage);invalid.focus();return;}
  const get=(name,parse=x=>x)=>{const el=form.elements.namedItem(name);try{return parse(el.value);}catch(error){showError(el,error.message);el.focus();throw error;}};
  try {
   const prediction=get('prediction').trim(), output=config.run(get);
   const predictionMatches=prediction===output.answer || (/^[0-9]+$/.test(prediction) && /^[0-9]+$/.test(output.answer) && Number(prediction)===Number(output.answer));
   const feedback=prediction?(predictionMatches?'预测正确。':'预测为“'+prediction+'”；正确结果为“'+output.answer+'”。'):'未填写预测。';
   result.innerHTML='<h2>本次结果</h2><p class="lab-metrics">'+esc(output.summary)+'</p><p>'+esc(feedback)+'</p><div class="study-step-controls"><button class="md-button" type="button" data-step="prev">上一步</button><button class="md-button" type="button" data-step="next">下一步</button><button class="md-button" type="button" data-step="all">显示全部步骤</button><span data-step-count></span></div><ol class="study-steps">'+output.steps.map(s=>'<li><h3>'+esc(s.title)+'</h3><p>'+esc(s.body)+'</p></li>').join('')+'</ol>';
   let visible=1; const rows=[...result.querySelectorAll('.study-steps li')];
   function update(){rows.forEach((row,i)=>row.hidden=i>=visible);result.querySelector('[data-step-count]').textContent='已显示 '+visible+' / '+rows.length+' 步';result.querySelector('[data-step=prev]').disabled=visible<=1;result.querySelector('[data-step=next]').disabled=visible>=rows.length;result.querySelector('[data-step=all]').disabled=visible>=rows.length;}
   result.querySelectorAll('[data-step]').forEach(button=>button.addEventListener('click',()=>{visible=button.dataset.step==='all'?rows.length:visible+(button.dataset.step==='next'?1:-1);update();}));update();result.focus({preventScroll:true});
  }catch(error){result.textContent='未运行：'+error.message;}
 });
}

function mountQuiz(root){
 root.classList.add('study-lab');
 const catalog=getCourses(), names=Object.fromEntries(catalog.map(c=>[c.id,c.title]));
 const counts=Object.fromEntries(catalog.map(c=>[c.id,questions.filter(q=>q.course===c.id).length]));
 const courses=catalog.map(c=>c.id).filter(id=>counts[id]);
 let storage;
 try{storage=localStorage;}catch{storage={getItem(){return null;},setItem(){throw Error('storage blocked');},removeItem(){}};}
 const store=createQuizStore(questions,storage);
 root.innerHTML='<label for="quiz-course">选择题组</label><select id="quiz-course"><option value="all">全部课程 · '+questions.length+' 题</option>'+courses.map(course=>'<option value="'+esc(course)+'">'+esc(names[course])+' · '+counts[course]+' 题</option>').join('')+'</select><p data-quiz-progress role="status"></p><p data-quiz-storage class="quiz-storage-hint"></p><p data-quiz-history></p><div class="lab-buttons"><button class="md-button" type="button" data-missed>只练错题</button><button class="md-button" type="button" data-new>重新开始所选题组</button><button class="md-button" type="button" data-clear>清除自测记录</button></div><div data-quiz-body tabindex="-1"></div>';
 const filter=root.querySelector('select'), body=root.querySelector('[data-quiz-body]'), progress=root.querySelector('[data-quiz-progress]');
 const storageHint=root.querySelector('[data-quiz-storage]');
 function renderSummary(session){
  const stats=store.stats(filter.value);
  progress.textContent='本轮已答 '+session.answered+' / '+session.queue.length+'；答对 '+session.correct+' 题';
  storageHint.textContent=store.available&&!window.__storageBlocked?'成绩、错题和各课程进度仅保存在当前浏览器，可在这里清除。':'浏览器未允许保存，自测记录只在本次页面有效。';
  root.querySelector('[data-missed]').disabled=!stats.missed;
  root.querySelector('[data-missed]').textContent='只练错题 · '+stats.missed+' 题';
  const last=stats.last?'上次完成：'+stats.last.correct+' / '+stats.last.total+' · '+new Date(stats.last.at).toLocaleDateString('zh-CN')+'。':'';
  root.querySelector('[data-quiz-history]').textContent=last+(stats.attempted?'累计作答 '+stats.attempted+' 次，正确率 '+Math.round(stats.correct/stats.attempted*100)+'%。':'尚无作答记录。');
 }
 function renderFeedback(q,selectedIndex){
  const ok=Number(selectedIndex)===q.answer;
  return '<p><strong>'+(ok?'答对了。':'本题答错。')+'正确答案：'+String.fromCharCode(65+q.answer)+'</strong></p><p>'+esc(q.explanation)+'</p><p>'+'<a href="'+esc(questionSource(q,catalog))+'">回看本章笔记</a></p>';
 }
 function render(){
  const session=store.session(filter.value),{queue,index,correct,missed,answers}=session;
  renderSummary(session);
  if(index===queue.length){
   body.innerHTML='<h2>本轮完成</h2><p>答对 '+correct+' / '+queue.length+' 题；错题 '+missed.length+' 道。'+(missed.length?'可以先回看解析，再重练错题。':'可以切换题组或重新练习。')+'</p><div class="lab-buttons"><button class="md-button" type="button" data-retry'+(missed.length?'':' disabled')+'>重练本轮错题</button></div>';
   body.querySelector('[data-retry]').onclick=()=>{store.retryRound(filter.value);render();body.focus();};
   return;
  }
  const q=queue[index];
  body.innerHTML='<p class="study-caption">第 '+(index+1)+' / '+queue.length+' 题 · '+esc(names[q.course])+' · 第 '+q.chapter+' 章 · '+'考点：第 '+q.sections.join('、')+' 节'+'</p><form><fieldset><legend>'+esc(q.prompt)+'</legend>'+q.options.map((option,i)=>'<label class="study-option"><input type="radio" name="answer" value="'+i+'"><span>'+String.fromCharCode(65+i)+'．'+esc(option)+'</span></label>').join('')+'</fieldset><div data-quiz-feedback aria-live="polite"></div><div class="lab-buttons"><button type="submit" class="md-button md-button--primary">提交答案</button><button class="md-button" type="button" data-next disabled>'+(index===queue.length-1?'查看本轮结果':'下一题')+'</button></div></form>';
  const form=body.querySelector('form'),feedbackBox=body.querySelector('[data-quiz-feedback]'),next=body.querySelector('[data-next]');
  const savedAnswer=Object.prototype.hasOwnProperty.call(answers,String(q.id))?answers[String(q.id)]:null;
  let answered=savedAnswer!==null;
  if(answered){const selected=form.querySelector('input[value="'+savedAnswer+'"]');if(selected)selected.checked=true;feedbackBox.innerHTML=renderFeedback(q,savedAnswer);form.querySelector('fieldset').disabled=true;form.querySelector('[type=submit]').disabled=true;next.disabled=false;}
  form.onsubmit=e=>{e.preventDefault();if(answered)return;const selected=form.querySelector('input:checked');if(!selected){feedbackBox.textContent='请先选择一个答案。';form.querySelector('input').focus();return;}
   if(!store.answer(filter.value,Number(selected.value)))return;
   answered=true;feedbackBox.innerHTML=renderFeedback(q,selected.value);
   form.querySelector('fieldset').disabled=true;form.querySelector('[type=submit]').disabled=true;next.disabled=false;next.focus({preventScroll:true});renderSummary(store.session(filter.value));
  };
  next.onclick=()=>{if(!answered)return;store.next(filter.value);render();body.focus();};
 }
 filter.value=store.course;
 filter.onchange=render;
 root.querySelector('[data-new]').onclick=()=>{store.start(filter.value);render();body.focus();};
 root.querySelector('[data-missed]').onclick=()=>{if(store.start(filter.value,'missed')){render();body.focus();}};
 root.querySelector('[data-clear]').onclick=()=>{store.clear();render();body.focus();};
 render();
}
document.querySelectorAll('[data-study-lab]').forEach(root=>{const kind=root.dataset.studyLab;if(kind==='quiz')mountQuiz(root);else if(configs[kind])mountLab(root,kind);});
