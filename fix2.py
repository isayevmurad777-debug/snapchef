with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()
# Remove Dietary Preferences section
s1 = c.find('<!-- Dietary Preferences & Allergy Filter -->')
e1 = c.find('<!-- Allergy Alerts -->')
e2 = c.find('</div>\n                </div>\n\n                <!-- Cook Specific', e1)
if s1 > -1 and e2 > -1:
    c = c[:s1] + c[e2+len('</div>\n                </div>\n'):]
    print('Dietary + Allergy sections removed')
else:
    print('Not found, trying alt method')
    s1 = c.find('<div class="dietary-section">')
    if s1 > -1:
        chunk = c[s1:]
        second = chunk.find('<div class="dietary-section">', 1)
        if second > -1:
            end = chunk.find('</div>\n                </div>', second)
            if end > -1:
                c = c[:s1] + c[s1+end+len('</div>\n                </div>'):]
                print('Alt method: removed')
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print('Done!')
