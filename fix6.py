with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()
old = 'function getFullDietaryPrefs() {'
idx = c.find(old)
if idx > -1:
    end = c.find('\n        }', idx)
    if end > -1:
        new_func = '''function getFullDietaryPrefs() {
            var prefs = [];
            var ids = ['vegetarian','vegan','lowcal','quick','halal','keto','noGluten','noLactose','noNuts','noEggs','noShellfish','noSoy'];
            var labels = ['Vegetarian','Vegan','Low Calorie','Quick','Halal','Keto','Gluten-free','Lactose-free','Nut-free','Egg-free','Shellfish-free','Soy-free'];
            for (var i = 0; i < ids.length; i++) {
                var el = document.getElementById(ids[i]);
                if (el && el.checked) prefs.push(labels[i]);
            }
            return prefs;'''
        c = c[:idx] + new_func + c[end:]
        print('Fixed!')
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print('Done!')
