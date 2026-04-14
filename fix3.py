with open('index.html', 'r', encoding='utf-8') as f:
    lines = f.readlines()
skip = False
out = []
for line in lines:
    if '<!-- Dietary Preferences' in line:
        skip = True
        continue
    if skip and '<!-- Cook Specific' in line:
        skip = False
    if not skip:
        out.append(line)
with open('index.html', 'w', encoding='utf-8') as f:
    f.writelines(out)
print('Dietary + Allergy removed!')
