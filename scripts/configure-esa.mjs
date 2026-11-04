// Uses the credentials resolved by the pinned ESA CLI; never prints them.
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {getApiConfig} from 'esa-cli/dist/utils/fileUtils/index.js';
import api from 'esa-cli/dist/libs/api.js';

const require = createRequire(import.meta.resolve('esa-cli/package.json'));
const {OpenApiRequest} = require('@alicloud/openapi-client');
const site = JSON.parse(readFileSync(new URL('../esa/site.json', import.meta.url), 'utf8'));
const apply = process.argv.includes('--apply');
const stable = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object'
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Usage: node scripts/configure-esa.mjs [--apply]');
const {auth} = getApiConfig();
if (!auth.accessKeyId || !auth.accessKeySecret) throw new Error('Run npx esa login first.');

async function call(action, query) {
  const params = {action, version: '2024-09-10', protocol: 'HTTPS', method: /^(Create|Update)/.test(action) ? 'POST' : 'GET', authType: 'AK', bodyType: 'json', reqBodyType: 'formData', style: 'RPC', pathname: '/', toMap(){return this;}};
  const result = await api.client.callApi(params, new OpenApiRequest({query}), {connectTimeout: 10000, readTimeout: 10000, autoretry: false, toMap(){return this;}});
  return result.body;
}

async function syncRules(kind, desired) {
  const listAction = `List${kind}s`;
  const list = await call(listAction, {SiteId: site.siteId, PageNumber: 1, PageSize: 500});
  const configs = list.Configs || [];
  for (const rule of desired) {
    const matches = configs.filter(item => item.RuleName === rule.RuleName);
    if (matches.length > 1) throw new Error(`Duplicate managed rule: ${rule.RuleName}`);
    const existing = matches[0];
    const equal = existing && Object.entries(rule).every(([key, value]) => key === 'ResponseHeaderModification'
      ? stable(existing[key]) === stable(value)
      : String(existing[key]) === String(value));
    if (equal) { console.log(`Unchanged: ${rule.RuleName}`); continue; }
    console.log(`${apply ? '' : 'Would '}${existing ? 'update' : 'create'}: ${rule.RuleName}`);
    if (!apply) continue;
    const query = {SiteId: site.siteId, ...rule};
    if (existing) query.ConfigId = existing.ConfigId;
    if (query.ResponseHeaderModification) query.ResponseHeaderModification = JSON.stringify(query.ResponseHeaderModification);
    await call(`${existing ? 'Update' : 'Create'}${kind}`, query);
    const check = await call(listAction, {SiteId: site.siteId, PageNumber: 1, PageSize: 500});
    const actual = (check.Configs || []).find(item => item.RuleName === rule.RuleName);
    if (!actual || Object.entries(rule).some(([key, value]) => key === 'ResponseHeaderModification'
      ? stable(actual[key]) !== stable(value)
      : String(actual[key]) !== String(value))) throw new Error(`Read-back mismatch: ${rule.RuleName}`);
  }
}

const actualSite = await call('GetSite', {SiteId: site.siteId});
if (actualSite.SiteModel?.SiteName !== site.siteName || actualSite.SiteModel?.Status !== 'active') throw new Error('ESA site name or active status does not match esa/site.json.');
if (actualSite.SiteModel?.PlanName !== site.planName || actualSite.SiteModel?.InstanceId !== site.instanceId) throw new Error('ESA plan or instance does not match esa/site.json.');
await syncRules('HttpResponseHeaderModificationRule', site.responseRules.map(({headers, ...rule}) => ({...rule, RuleEnable: 'on', ResponseHeaderModification: Object.entries(headers).map(([Name, Value]) => ({Name, Value, Type: 'static', Operation: 'add'}))})));
await syncRules('HttpsApplicationConfiguration', [{...site.httpsRule, RuleEnable: 'on'}]);
console.log(apply ? 'ESA site rules verified.' : 'Preview only. Add --apply to update the named site rules.');
