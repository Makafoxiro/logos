import io

p = 'js/main.js'
s = io.open(p, encoding='utf-8').read()

if "import LS from './storage.js';" not in s:
    lines = s.split('\n')
    lines.insert(1, "import LS from './storage.js';")
    s = '\n'.join(lines)
    io.open(p, 'w', encoding='utf-8').write(s)
    print('IMPORT INSERTED')
else:
    print('IMPORT ALREADY PRESENT')
