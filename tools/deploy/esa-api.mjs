// Resolve credentials through the pinned ESA CLI. Never log its configuration.
import {createRequire} from 'node:module';
import {getApiConfig} from 'esa-cli/dist/utils/fileUtils/index.js';
import api from 'esa-cli/dist/libs/api.js';
const require = createRequire(import.meta.resolve('esa-cli/package.json'));
const {OpenApiRequest} = require('@alicloud/openapi-client');

export async function callEsa(action, values) {
  const {auth} = getApiConfig();
  if (!auth.accessKeyId || !auth.accessKeySecret) throw new Error('Run npx esa login first.');
  const query = Object.fromEntries(Object.entries(values).map(([key, value]) => [key, typeof value === 'object' ? JSON.stringify(value) : value]));
  const params = {action, version: '2024-09-10', protocol: 'HTTPS', method: /^(Create|Update|Delete|Purge)/.test(action) ? 'POST' : 'GET', authType: 'AK', bodyType: 'json', reqBodyType: 'formData', style: 'RPC', pathname: '/', toMap(){return this;}};
  return (await api.client.callApi(params, new OpenApiRequest({query}), {connectTimeout: 10000, readTimeout: 15000, autoretry: false, toMap(){return this;}})).body;
}

export async function purgeSite(site, hosts) {
  const actual = await callEsa('GetSite', {SiteId: site.siteId});
  if (actual.SiteModel?.SiteName !== site.siteName || actual.SiteModel?.InstanceId !== site.instanceId || actual.SiteModel?.PlanName !== site.planName) throw new Error('Unexpected ESA site or plan.');
  return callEsa('PurgeCaches', {SiteId: site.siteId, Type: 'hostname', Content: {Hostnames: hosts}, Force: true});
}
