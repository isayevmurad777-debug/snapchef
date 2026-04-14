import re
with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()
start = c.find('<!-- World Cuisines Bar -->')
end = c.find('<!-- Empty State Welcome -->')
if start > -1 and end > -1:
    c = c[:start] + c[end:]
    print('1. World Cuisines removed')
else:
    print('1. World Cuisines not found - skipping')
old = 'Scan ingredients with camera'
if old in c:
    s = c.rfind('<div class="welcome-empty"', 0, c.find(old))
    e = c.find('<!-- Upload Section -->')
    if s > -1 and e > -1:
        c = c[:s] + c[e:]
        print('2. Tip cards removed')
else:
    print('2. Tip cards not found - skipping')
c = c.replace('YOUR_FIREBASE_API_KEY', 'AIzaSyBKam57lgDdcRHbAZ0VkT0cxUkkYfcQzaM')
print('3. Firebase key fixed')
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print('Done!')
