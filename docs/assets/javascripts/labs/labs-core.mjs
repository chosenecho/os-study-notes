// Pure models shared by the browser and independent regression checks.
export function integer(value, min, max, label) {
  const text = String(value).trim();
  if (!/^-?\d+$/.test(text)) throw Error(label + '必须是整数');
  const n = Number(text);
  if (!Number.isSafeInteger(n) || n < min || n > max) throw Error(label + '范围为 ' + min + ' 到 ' + max);
  return n;
}
export function sequence(text, max = 999999, limit = 40) {
  const parts = String(text).trim().split(/[\s,，、]+/);
  if (!parts[0] || parts.length > limit) throw Error('请输入 1 到 ' + limit + ' 个整数，用空格或逗号分隔');
  return parts.map(x => integer(x, 0, max, '序列中的值'));
}
export function paging(refs, count, algorithm) {
  integer(count, 1, 8, '页框数');
  if (!['fifo', 'lru', 'opt'].includes(algorithm)) throw Error('未知页面置换算法');
  if (!refs.length || refs.length > 40) throw Error('访问串长度应为 1 到 40');
  refs.forEach(x => integer(x, 0, 999, '页号'));
  const frames = Array(count).fill(null), loaded = Array(count).fill(-1), last = Array(count).fill(-1);
  let faults = 0;
  const steps = refs.map((page, i) => {
    let slot = frames.indexOf(page), victim = null, why = '页已在内存中，本次命中';
    const hit = slot !== -1;
    if (!hit) {
      faults++; slot = frames.indexOf(null);
      if (slot !== -1) why = '使用空页框，不淘汰旧页';
      else {
        if (algorithm === 'fifo') {
          slot = loaded.indexOf(Math.min(...loaded)); why = '淘汰装入时间最早的页';
        } else if (algorithm === 'lru') {
          slot = last.indexOf(Math.min(...last)); why = '淘汰最久未访问的页';
        } else {
          const next = frames.map(p => {const n = refs.indexOf(p, i + 1); return n < 0 ? Infinity : n;});
          slot = next.indexOf(Math.max(...next)); why = '淘汰未来最晚再用或不再使用的页';
        }
        victim = frames[slot];
      }
      frames[slot] = page; loaded[slot] = i;
    }
    last[slot] = i;
    return {page, hit, slot, victim, frames: [...frames], faults, why};
  });
  return {steps, faults, hits: refs.length - faults, rate: faults / refs.length};
}
export function matrix(text) {
  const rows = String(text).trim().split(/\r?\n/).map(row => sequence(row, 999, 3));
  if (rows.length < 1 || rows.length > 6) throw Error('矩阵需要 1 到 6 行');
  if (rows.some(row => row.length !== rows[0].length)) throw Error('矩阵每行的资源种类数必须相同');
  return rows;
}
export function banker(available, allocation, maximum, request = null) {
  const n = allocation.length, m = available.length;
  if (!n || n > 6 || !m || m > 3 || maximum.length !== n) throw Error('Allocation 与 Max 行数应相同，1 到 6 个进程、1 到 3 类资源');
  [available, ...allocation, ...maximum].forEach(row => row.forEach(x => integer(x, 0, 999, '资源数')));
  if ([...allocation, ...maximum].some(row => row.length !== m)) throw Error('Available 与矩阵列数应相同');
  const need = maximum.map((row, i) => row.map((x, j) => {if (x < allocation[i][j]) throw Error('Max 不能小于 Allocation'); return x - allocation[i][j];}));
  const total = available.map((x,j) => x + allocation.reduce((s,row) => s + row[j],0));
  if (maximum.some(row => row.some((x,j) => x > total[j]))) throw Error('某进程的 Max 超过系统资源总量，请调整模型');
  const held = allocation.map(row => [...row]), work = [...available], originalNeed = need.map(row => [...row]);
  if (request) {
    integer(request.process, 0, n - 1, '请求进程编号');
    if (request.resources.length !== m) throw Error('请求向量列数应与 Available 相同');
    request.resources.forEach(x => integer(x, 0, 999, '请求资源数'));
    if (request.resources.some((x,j) => x > need[request.process][j])) return {blocked: '请求超过该进程尚需的 Need，不进入试分配', steps: [], need: originalNeed};
    if (request.resources.some((x,j) => x > work[j])) return {blocked: '请求超过当前 Available，需要等待，不进入试分配', steps: [], need: originalNeed};
    request.resources.forEach((x,j) => {work[j] -= x; held[request.process][j] += x; need[request.process][j] -= x;});
  }
  const initialWork = [...work], finish = Array(n).fill(false), order = [], steps = [];
  while (order.length < n) {
    const process = need.findIndex((row,i) => !finish[i] && row.every((x,j) => x <= work[j]));
    if (process < 0) break;
    const before = [...work];
    held[process].forEach((x,j) => work[j] += x); finish[process] = true; order.push(process);
    steps.push({process, before, need: [...need[process]], released: [...held[process]], after: [...work]});
  }
  return {safe: order.length === n, order, steps, need: originalNeed, checkNeed: need, initialWork, unfinished: finish.flatMap((done,i) => done ? [] : [i]), finalWork: work};
}
export function address(logical, size, table) {
  integer(logical, 0, 16777215, '逻辑地址'); integer(size, 256, 65536, '页大小');
  if (!Number.isInteger(Math.log2(size))) throw Error('页大小必须是 2 的幂');
  if (!table.length || table.length > 32) throw Error('页表需要 1 到 32 项');
  table.forEach(x => {if (x !== null) integer(x,0,4095,'物理块号');});
  const page = Math.floor(logical / size), offset = logical % size;
  if (page >= table.length) return {page, offset, status: '越界', physical: null};
  if (table[page] === null) return {page, offset, status: '缺页', physical: null};
  return {page, offset, frame: table[page], status: '驻留', physical: table[page] * size + offset};
}
export function cache(refs, lines, size) {
  integer(lines, 1, 32, 'Cache 行数'); integer(size, 1, 256, '块大小');
  if (![lines,size].every(x => Number.isInteger(Math.log2(x)))) throw Error('行数与块大小必须是 2 的幂');
  if (!refs.length || refs.length > 40) throw Error('地址串长度应为 1 到 40');
  refs.forEach(x => integer(x,0,16777215,'字节地址'));
  const tags = Array(lines).fill(null); let misses = 0;
  const steps = refs.map(value => {
    const block = Math.floor(value / size), line = block % lines, tag = Math.floor(block / lines), offset = value % size;
    const before = tags[line], hit = before === tag;
    if (!hit) {misses++; tags[line] = tag;}
    return {value, block, line, tag, offset, hit, before, tags: [...tags], misses};
  });
  return {steps, misses, hits: refs.length - misses, rate: (refs.length - misses) / refs.length};
}
export function complement(a, b, width, operation) {
  integer(width, 4, 16, '位宽');
  const mod = 2 ** width, min = -mod / 2, max = mod / 2 - 1;
  integer(a, min, max, '操作数 A'); integer(b, min, max, '操作数 B');
  if (!['add','sub'].includes(operation)) throw Error('未知运算');
  const encode = x => ((x % mod) + mod) % mod;
  const bits = x => encode(x).toString(2).padStart(width,'0');
  const real = operation === 'add' ? a + b : a - b, raw = encode(real);
  return {a: bits(a), b: bits(b), effectiveB: bits(operation === 'add' ? b : -b), bits: bits(real), real, signed: raw >= mod / 2 ? raw - mod : raw, overflow: real < min || real > max, min, max};
}
