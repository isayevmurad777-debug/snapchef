with open('index.html', 'r', encoding='utf-8') as f:
    c = f.read()
old = "function getFullDietaryPrefs() {"
idx = c.find(old)
if idx > -1:
    end = c.find('\n        }', idx + len(old))
    if end > -1:
        replacement = '''function getFullDietaryPrefs() {
            var prefs = [];
            var checks = {vegetarian:'Vegetarian',vegan:'Vegan',lowcal:'Low Calorie',quick:'Quick',halal:'Halal',keto:'Keto',noGluten:'Gluten-free',noLactose:'Lactose-free',noNuts:'Nut-free',noEggs:'Egg-free',noShellfish:'Shellfish-free',noSoy:'Soy-free'};
            for (var id in checks) {
                var el = document.getElementById(id);
                if (el && el.checked) prefs.push(checks[id]);
            }
            return prefs;'''
        c = c[:idx] + replacement + c[end:]
        print('Fixed getFullDietaryPrefs - safe null check')
with open('index.html', 'w', encoding='utf-8') as f:
    f.write(c)
print('Done!')
