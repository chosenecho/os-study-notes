// Uses the credentials resolved by the pinned ESA CLI; never prints them.
import {readFileSync} from 'node:fs';
import {callEsa as call} from './esa-api.mjs';
const site = JSON.parse(readFileSync(new URL('../../config/esa-site.json', import.meta.url), 'utf8'));
const apply = process.argv.includes('--apply');
const stable = value => JSON.stringify(value, (_, item) => item && !Array.isArray(item) && typeof item === 'object'
  ? Object.fromEntries(Object.entries(item).sort(([a], [b]) => a.localeCompare(b))) : item);
if (process.argv.slice(2).some(arg => arg !== '--apply')) throw new Error('Usage: node tools/deploy/esa.mjs [--apply]');

async function syncRules(kind, desired) {
  const listAction = `List${kind}s`;
  const list = await call(listAction, {SiteId: site.siteId, PageNumber: 1, PageSize: 500});
  const configs = list.Configs || [];
  for (const rule of desired) {
    const matches = configs.filter(item => item.RuleName === rule.RuleName);
    if (matches.length > 1) throw new Error(`Duplicate managed rule: ${rule.RuleName}`);
    const existing = matches[0];
    const equal = existing && Object.entries(rule).every(([key, value]) => typeof value === 'object'
      ? stable(existing[key]) === stable(value)
      : String(existing[key]) === String(value));
    if (equal) { console.log(`Unchanged: ${rule.RuleName}`); continue; }
    console.log(`${apply ? '' : 'Would '}${existing ? 'update' : 'create'}: ${rule.RuleName}`);
    if (!apply) continue;
    const query = {SiteId: site.siteId, ...rule};
    if (existing) query.ConfigId = existing.ConfigId;
    await call(`${existing ? 'Update' : 'Create'}${kind}`, query);
    const check = await call(listAction, {SiteId: site.siteId, PageNumber: 1, PageSize: 500});
    const actual = (check.Configs || []).find(item => item.RuleName === rule.RuleName);
    if (!actual || Object.entries(rule).some(([key, value]) => typeof value === 'object'
      ? stable(actual[key]) !== stable(value)
      : String(actual[key]) !== String(value))) throw new Error(`Read-back mismatch: ${rule.RuleName}`);
  }
}

const actualSite = await call('GetSite', {SiteId: site.siteId});
if (actualSite.SiteModel?.SiteName !== site.siteName || actualSite.SiteModel?.Status !== 'active') throw new Error('ESA site name or active status does not match config/esa-site.json.');
if (actualSite.SiteModel?.PlanName !== site.planName || actualSite.SiteModel?.InstanceId !== site.instanceId) throw new Error('ESA plan or instance does not match config/esa-site.json.');
const previous = await call('ListHttpResponseHeaderModificationRules', {SiteId: site.siteId, PageNumber: 1, PageSize: 500});
for (const rule of previous.Configs || []) if (site.retiredResponseRules.includes(rule.RuleName)) {
  console.log(`${apply ? 'Delete' : 'Would delete'} retired rule: ${rule.RuleName}`);
  if (apply) await call('DeleteHttpResponseHeaderModificationRule', {SiteId: site.siteId, ConfigId: rule.ConfigId});
}
await syncRules('HttpResponseHeaderModificationRule', site.responseRules.map(({headers, ...rule}) => ({...rule, RuleEnable: 'on', ResponseHeaderModification: Object.entries(headers).map(([Name, Value]) => ({Name, Value, Type: 'static', Operation: 'add'}))})));
await syncRules('HttpsApplicationConfiguration', [{...site.httpsRule, RuleEnable: 'on'}]);
await syncRules('CacheRule', site.cacheRules.map(rule => ({...rule, RuleEnable: 'on'})));
await syncRules('OriginRule', site.originRules.map(rule => ({...rule, RuleEnable: 'on'})));
const collection = await call('GetPerformanceDataCollection', {SiteId: site.siteId});
if (collection.Enable !== site.performanceDataCollection) {
  console.log(`${apply ? 'Update' : 'Would update'} performance data collection: ${site.performanceDataCollection}`);
  if (apply) {
    await call('UpdatePerformanceDataCollection', {SiteId: site.siteId, Enable: site.performanceDataCollection});
    if ((await call('GetPerformanceDataCollection', {SiteId: site.siteId})).Enable !== site.performanceDataCollection) throw new Error('Performance collection read-back mismatch.');
  }
}
console.log(apply ? 'ESA site rules verified.' : 'Preview only. Add --apply to update the named site rules.');
