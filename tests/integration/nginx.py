"""Exercise repository nginx templates in an isolated, unprivileged Linux process."""
import argparse
import http.client
import json
from pathlib import Path
import shutil
import socket
import ssl
import subprocess
import tempfile
import time

ROOT = Path(__file__).resolve().parents[2]


def port():
    with socket.socket() as sock:
        sock.bind(('127.0.0.1', 0))
        return sock.getsockname()[1]


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--nginx', default='nginx')
    parser.add_argument('--output', default='artifacts/p1-p2/nginx.json')
    args = parser.parse_args()
    binary = shutil.which(args.nginx) or str(Path(args.nginx).resolve())
    version = subprocess.run([binary, '-v'], capture_output=True, text=True, check=True).stderr.strip()
    http_port, https_port = port(), port()
    checks = []
    with tempfile.TemporaryDirectory(prefix='studynote-http-') as folder:
        work = Path(folder)
        shutil.copytree(ROOT / 'dist', work / 'site')
        css_uri = '/' + next((work / 'site/assets/stylesheets').glob('main.*.css')).relative_to(work / 'site').as_posix()
        subprocess.run(['openssl', 'req', '-x509', '-newkey', 'rsa:2048', '-nodes',
                        '-keyout', str(work / 'key.pem'), '-out', str(work / 'cert.pem'),
                        '-subj', '/CN=studynote-test', '-days', '1'], check=True, capture_output=True)
        site = (ROOT / 'tools/deploy/nginx-site.conf').read_text(encoding='utf-8')
        site = '\n'.join(line for line in site.splitlines() if 'listen [::]' not in line)
        for old, new in {
            'listen 80': f'listen 127.0.0.1:{http_port}',
            'listen 443': f'listen 127.0.0.1:{https_port}',
            '/var/www/studynote/current': str(work / 'site'),
            '/var/lib/letsencrypt': str(work / 'acme'),
            '/etc/letsencrypt/live/studynote/fullchain.pem': str(work / 'cert.pem'),
            '/etc/letsencrypt/live/studynote/privkey.pem': str(work / 'key.pem'),
            '/var/log/nginx/studynote.access.log': str(work / 'access.log'),
            '/var/log/nginx/studynote.error.log': str(work / 'error.log'),
            '/etc/nginx/mime.types': str(work / 'mime.types'),
        }.items():
            site = site.replace(old, new)
        (work / 'mime.types').write_text('types { text/html html; text/css css; application/javascript js; image/svg+xml svg; image/png png; }')
        common = (ROOT / 'tools/deploy/nginx-http.conf').read_text(encoding='utf-8')
        config = (f'pid {work}/nginx.pid; error_log {work}/error.log; daemon off; master_process off;\n'
                  'events { worker_connections 64; }\nhttp { access_log off;\n'
                  f'client_body_temp_path {work}/body; proxy_temp_path {work}/proxy;\n'
                  f'fastcgi_temp_path {work}/fastcgi; uwsgi_temp_path {work}/uwsgi; scgi_temp_path {work}/scgi;\n'
                  'map $http_x_studynote_test_auth $studynote_origin_allowed { default 0; test 1; }\n'
                  + common + '\n' + site + '\n}\n')
        conf = work / 'nginx.conf'
        conf.write_text(config)
        syntax = subprocess.run([binary, '-t', '-p', folder, '-c', str(conf)], capture_output=True, text=True)
        if syntax.returncode:
            raise RuntimeError(syntax.stderr)
        process = subprocess.Popen([binary, '-p', folder, '-c', str(conf)], stdout=subprocess.DEVNULL, stderr=subprocess.PIPE)

        def request(url, auth=True, method='GET', host='studynote.chosenecho.top'):
            connection = http.client.HTTPSConnection('127.0.0.1', https_port, context=ssl._create_unverified_context(), timeout=3)
            headers = {'Host': host}
            if auth:
                headers['X-Studynote-Test-Auth'] = 'test'
            try:
                connection.request(method, url, headers=headers)
                response = connection.getresponse()
                return response.status, dict(response.getheaders()), response.read().decode('utf-8', errors='replace')
            finally:
                connection.close()

        try:
            for _ in range(50):
                try:
                    request('/')
                    break
                except (OSError, http.client.HTTPException):
                    if process.poll() is not None:
                        raise RuntimeError(process.stderr.read().decode())
                    time.sleep(.1)
            else:
                raise RuntimeError('Isolated nginx did not start')
            for url in ['/', '/courses/deep/missing/', '/assets/stylesheets/notes.css']:
                status, headers, body = request(url, auth=False)
                assert status == 403, (url, status)
                assert headers.get('Cache-Control') == 'no-store'
                assert 'noindex' in body and '无法访问' in body and 'md-header' in body, (url, body[:300])
            checks.append('Unauthenticated requests retain branded 403/noindex/no-store without redirect cycles')
            status, headers, body = request('/courses/deep/missing/')
            assert status == 404 and 'noindex' in body and 'md-header' in body
            assert headers.get('Cache-Control') == 'no-store'
            for url in ['/403.html', '/404.html']:
                assert request(url)[0] == 404, url
            checks.append('Deep missing routes and internal error-file access retain true 404/no-store')
            status, headers, body = request('/search/?q=%E6%8A%96%E5%8A%A8')
            assert status == 302 and headers['Location'].endswith('/?q=%E6%8A%96%E5%8A%A8')
            assert request('/courses/')[0] == 200
            css_status, css_headers, _ = request(css_uri)
            module_status, module_headers, _ = request('/assets/javascripts/reader.mjs')
            assert 'text/css' in css_headers.get('Content-Type', ''), (css_status, css_headers)
            assert 'javascript' in module_headers.get('Content-Type', ''), (module_status, module_headers)
            assert request('/', method='HEAD', auth=False)[0] == 403
            assert request('/', method='POST')[0] == 405
            assert request('/search/?q=test', host='chosenecho.top')[0] == 301
            checks.append('Query-preserving search, course index, CSS/module MIME, HEAD, method guard and apex redirect')
        finally:
            process.terminate()
            process.communicate(timeout=5)
        assert 'internal redirection cycle' not in (work / 'error.log').read_text()
    report = {'passed': True, 'nginx': version, 'scope': 'Unprivileged isolated template test; temporary cert/root/ports/auth map, no production changes', 'checks': checks}
    output = ROOT / args.output
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False))


if __name__ == '__main__':
    main()
