import {spawnSync} from 'node:child_process';
import {readFileSync, writeFileSync, mkdirSync, readdirSync, statSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve} from 'node:path';
import {purgeSite} from './esa-api.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
process.chdir(root);
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const config = {...JSON.parse(readFileSync('config/ecs-site.json', 'utf8')), instanceId: process.env.STUDY_ECS_INSTANCE_ID};
if (!/^i-[a-z0-9]+$/.test(config.instanceId || '')) throw new Error('Set STUDY_ECS_INSTANCE_ID in .env.local or the environment.');
if (process.argv.length > 2) throw new Error('Usage: npm run deploy');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Start this deployment with npm run deploy.');
function run(command, args, capture = false) {
  const result = spawnSync(command, args, {cwd: root, encoding: 'utf8', stdio: capture ? 'pipe' : 'inherit'});
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command} failed (${result.status}): ${capture ? result.stderr || result.stdout : 'see output above'}`);
  return capture ? result.stdout.trim() : '';
}
function remote(command) {
  const raw = run('workbench', ['exec', '--instance-id', config.instanceId, '--command', command, '--output', 'json', '--timeout', '30'], true);
  const result = JSON.parse(raw);
  if (result.exit_code !== 0) throw new Error(`Remote operation failed: ${result.stderr || result.stdout}`);
  return result.stdout;
}
const rights = spawnSync(process.execPath, [npmCli, 'run', 'check:rights'], {cwd: root, stdio: 'inherit'});
if (rights.error) throw rights.error;
if (rights.status !== 0) throw new Error('Rights check failed. Publication paused.');
run(process.execPath, [npmCli, 'run', 'check']);
run(process.execPath, [npmCli, 'run', 'test:browser']);
const commit = run('git', ['rev-parse', 'HEAD'], true);
const release = `${new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, 'Z')}-${commit.slice(0, 12)}`;
const hashes = {};
function walk(dir) {
  for (const name of readdirSync(dir).sort()) {
    const path = `${dir}/${name}`;
    if (statSync(path).isDirectory()) walk(path);
    else hashes[path.slice(5)] = createHash('sha256').update(readFileSync(path)).digest('hex');
  }
}
walk('dist');
const metadata = {
  release, sourceCommit: commit, createdAt: new Date().toISOString(),
  workingTreeModified: !!run('git', ['status', '--porcelain'], true),
  rightsCheckPassed: rights.status === 0,
  contentDigest: createHash('sha256').update(JSON.stringify(hashes)).digest('hex'),
  fileCount: Object.keys(hashes).length,
};
writeFileSync('dist/__release.json', JSON.stringify(metadata, null, 2) + '\n');
const evidence = resolve('artifacts/releases', release);
mkdirSync(evidence, {recursive: true});
writeFileSync(`${evidence}/release.json`, JSON.stringify({...metadata, hashes}, null, 2) + '\n');
const archive = `${evidence}/site.tar.gz`;
run('tar', ['-czf', archive, '-C', 'dist', '.']);
const target = `${config.uploadRoot}/${release}.tar.gz`;
remote(`set -eu; install -d -m 700 '${config.uploadRoot}'; test ! -e '${target}'; test ! -e '${config.root}/releases/${release}'`);
run('workbench', ['upload', archive, target, '--instance-id', config.instanceId]);
const activation = readFileSync(new URL('./activate.sh', import.meta.url), 'utf8').replace(/\r\n/g, '\n');
const archiveHash = createHash('sha256').update(readFileSync(archive)).digest('hex');
const output = remote(`printf '%s  %s\\n' '${archiveHash}' '${target}' | sha256sum -c - && bash -s -- '${release}' '${target}' '${config.root}' <<'STUDYNOTE_ACTIVATE'\n${activation}\nSTUDYNOTE_ACTIVATE`);
writeFileSync(`${evidence}/activation.txt`, output);
console.log(output);
const esa = JSON.parse(readFileSync('config/esa-site.json', 'utf8'));
const purge = await purgeSite(esa, [...config.hosts, ...(config.redirectHosts || [])]);
writeFileSync(`${evidence}/cache-purge.json`, JSON.stringify(purge, null, 2) + '\n');
for (const host of config.hosts) {
  let actual;
  try {
    const response = await fetch(`https://${host}/__release.json`, {headers: {'Cache-Control': 'no-cache'}, signal: AbortSignal.timeout(30000)});
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    actual = await response.json();
  } catch {
    // Windows curl uses the system network path when Node's resolver is unavailable.
    actual = JSON.parse(run(process.platform === 'win32' ? 'curl.exe' : 'curl', ['--fail', '--silent', '--show-error', '--retry', '2', '--max-time', '30', `https://${host}/__release.json`], true));
  }
  if (actual.release !== release) throw new Error(`Public release verification failed for ${host}. Inspect active ECS release before retrying.`);
}
console.log(JSON.stringify({release, evidence, instanceId: config.instanceId, ...metadata}));
