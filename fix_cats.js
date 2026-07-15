const fs = require('fs');
const c = fs.readFileSync('client/src/pages/StorePage.jsx', 'utf8');

// Extract the PRODUCTS section
const start = c.indexOf('const PRODUCTS = [');
const end = c.indexOf('];', start) + 2;
const before = c.substring(0, start);
let products = c.substring(start, end);
const after = c.substring(end);

// Classify each product by name keywords
function classify(name) {
  const n = name.toLowerCase();
  // Cars
  if (n.includes('hyundai')) return '汽车';
  // Auto accessories
  if (n.includes('chemical guys') || n.includes('schumacher') || n.includes('tyger auto')) return '汽车';
  if (n.includes('rivian ') || n.includes('gm genuine') || n.startsWith('nilight ')) return '汽车';
  // Fitness / Sports
  if (n.includes('push up board') || n.includes('weight bench') || n.includes('resistance bands')) return '运动';
  if (n.includes('ab roller') || n.includes('ankle strap for cable')) return '运动';
  // Shoes
  if (n.includes('sneaker') || n.includes('shoe') || n.includes('heels') || n.includes('pumps')) return '鞋靴';
  if (n.includes('sandals') || n.includes('loafers') || n.includes('slipper') || n.includes('boots')) return '鞋靴';
  if (n.includes('skechers') || n.includes('clarks ') || n.includes('reebok') || n.includes('columbia mens')) return '鞋靴';
  // Women's clothing
  if (n.includes('womens ') || n.includes('women ')) {
    if (n.includes('skirt') || n.includes('dress') || n.includes('blouse') || n.includes('top ') || n.includes('tee')) return '女装';
    if (n.includes('shirt') || n.includes('tunic') || n.includes('jumpsuit') || n.includes('blazer')) return '女装';
    if (n.includes('jacket') || n.includes('sweatshirt') || n.includes('tracksuit') || n.includes('crop')) return '女装';
    if (n.includes('tank') || n.includes('coverup') || n.includes('sarong')) return '女装';
  }
  // Men's clothing
  if (n.includes('mens ') || n.includes('men ')) {
    if (n.includes('shirt') || n.includes('tee') || n.includes('polo') || n.includes('henley')) return '男装';
    if (n.includes('pant') || n.includes('trouser') || n.includes('chino') || n.includes('cargo')) return '男装';
    if (n.includes('jacket') || n.includes('coat')) return '男装';
  }
  // Kids
  if (n.includes('kids ') || n.includes('toddler') || n.includes('baby ')) return '童装';
  // Beauty
  if (n.includes('serum') || n.includes('cream') || n.includes('moisturizer') || n.includes('foundation')) return '美妆';
  if (n.includes('skincare') || n.includes('primer') || n.includes('powder') || n.includes('essence')) return '美妆';
  if (n.includes('makeup') || n.includes('cosmetic') || n.includes('skin ')) return '美妆';
  // Food & Drinks
  if (n.includes('drink') || n.includes('soda') || n.includes('water ') || n.includes('juice')) return '食品';
  if (n.includes('tea ') || n.includes('coffee') || n.includes('energy ') || n.includes('milk ')) return '食品';
  if (n.includes('snack') || n.includes('chips') || n.includes('candy') || n.includes('chocolate')) return '食品';
  if (n.includes('cookie') || n.includes('bread') || n.includes('croissant') || n.includes('wafer')) return '食品';
  if (n.includes('ramen') || n.includes('jerky') || n.includes('seaweed') || n.includes('coconut water')) return '食品';
  if (n.includes('protein ') && n.includes('shake')) return '食品';
  if (n.includes('beer') || n.includes('aperitif') || n.includes('ginger beer')) return '食品';
  if (n.includes('baklava') || n.includes('naan ') || n.includes('dorayaki') || n.includes('pastry')) return '食品';
  if (n.includes('creamer') || n.includes('granola') || n.includes('cereal')) return '食品';
  // Food containers → 家居
  if (n.includes('ziploc') || n.includes('deli container') || n.includes('snack box container')) return '家居';
  if (n.includes('snackle box') || n.includes('sandwich bag')) return '家居';
  // Home & Kitchen
  if (n.includes('blender') || n.includes('cookware') || n.includes('oven ') || n.includes('food processor')) return '家居';
  if (n.includes('vacuum') || n.includes('mop') || n.includes('cutting board') || n.includes('chopper')) return '家居';
  if (n.includes('shears') || n.includes('trash bag') || n.includes('utensil') || n.includes('griddle')) return '家居';
  if (n.includes('storage container') || n.includes('dish drying') || n.includes('broom ')) return '家居';
  if (n.includes('mixing bowl') || n.includes('soap dispenser') || n.includes('kitchen torch')) return '家居';
  if (n.includes('curtain') || n.includes('window film') || n.includes('fan ') || n.includes('cushion')) return '家居';
  if (n.includes('outlet extender') || n.includes('necklace rack')) return '家居';
  // Toys & Figures
  if (n.includes('figure') || n.includes('figurine') || n.includes('blind box')) return '潮玩';
  if (n.includes('anime') || n.includes('miku') || n.includes('gundam') || n.includes('mecha')) return '潮玩';
  if (n.includes('tamashii') || n.includes('pop mart') || n.includes('action figure')) return '潮玩';
  // Jewelry/Accessories
  if (n.includes('charm') || n.includes('pendant') || n.includes('bow ') || n.includes('embellishment')) return '配饰';
  // Digital/Electronics
  if (n.includes('laptop') || n.includes('chromebook') || n.includes('notebook')) return '数码';
  if (n.includes('graphics card') || n.includes('rtx ') || n.includes('geforce')) return '数码';
  if (n.includes('camera') || n.includes('lens') || n.includes('gopro') || n.includes('action cam')) return '数码';
  if (n.includes('iphone') || n.includes('samsung galaxy') || n.includes('xiaomi ')) return '数码';
  if (n.includes('monitor') || n.includes('display') || n.includes('tv ') || n.includes('oled')) return '数码';
  if (n.includes('vr ') || n.includes('quest ') || n.includes('headset')) return '数码';
  if (n.includes('smart watch') || n.includes('smartwatch')) return '数码';
  if (n.includes('scanner') || n.includes('radar detector') || n.includes('uniden')) return '数码';
  if (n.includes('speaker') || n.includes('earphone') || n.includes('headphone')) return '数码';
  if (n.includes('smart glasses') || n.includes('bluetooth sunglasses')) return '数码';
  if (n.includes('led ') || n.includes('light bar')) return '汽车';
  // Default: keep existing cat
  return null;
}

// Fix each product
const prodRe = /\{[^}]*name:'([^']*)'[^}]*cat:'([^']*)'[^}]*\}/g;
let count = 0;
products = products.replace(prodRe, (match, name, oldCat) => {
  const newCat = classify(name);
  if (newCat && newCat !== oldCat) {
    count++;
    return match.replace("cat:'" + oldCat + "'", "cat:'" + newCat + "'");
  }
  return match;
});

// Rebuild file
const result = before + products + after;
fs.writeFileSync('client/src/pages/StorePage.jsx', result);
console.log('Fixed ' + count + ' products');

// Verify: list by new category
const cats = {};
const verifyRe = /\{[^}]*name:'([^']*)'[^}]*cat:'([^']*)'[^}]*\}/g;
let m;
while ((m = verifyRe.exec(products)) !== null) {
  if (!cats[m[2]]) cats[m[2]] = [];
  cats[m[2]].push(m[1].substring(0,60));
}
Object.keys(cats).sort().forEach(cat => {
  console.log('\n--- ' + cat + ' (' + cats[cat].length + ') ---');
  cats[cat].forEach(n => console.log('  ' + n));
});
