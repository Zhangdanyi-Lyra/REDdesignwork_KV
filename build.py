from pathlib import Path
import json, hashlib
ROOT = Path(__file__).parent
catalog = json.loads((ROOT / 'scene-catalog.json').read_text())
assets = json.loads((ROOT / 'asset-manifest.json').read_text())
for path in assets.values():
    if not (ROOT / path).is_file():
        raise FileNotFoundError(path)
app = 'const SCENE_CATALOG=' + json.dumps(catalog, ensure_ascii=False) + ';\n'
app += '\n'.join((ROOT / 'src' / name).read_text() for name in ['engine.js', 'render.js', 'ui.js'])
(ROOT / 'app.js').write_text(app)
html = (ROOT / 'src/index.template.html').read_text()
html = html.replace('__ASSETS__', json.dumps(assets, separators=(',', ':')))
html = html.replace('__SERIF_FONT__', 'assets/nearby-serif.woff')
revision = hashlib.sha256(app.encode()).hexdigest()[:12]
html = html.replace('<script>\n__APP_CODE__\n</script>', f'<script src="app.js?v={revision}"></script>')
assert '__APP_CODE__' not in html
(ROOT / 'index.html').write_text(html)
print(f'Built index.html and app.js; {len(assets)} local assets')
