const fs = require('fs');
let c = fs.readFileSync('client/src/pages/StorePage.jsx', 'utf8');

// Add new categories to arrays
c = c.replace(
  "const CAT_VALUES = ['全部', '数码', '女装', '男装', '美妆', '鞋靴', '家居', '配饰', '食品', '潮玩'];",
  "const CAT_VALUES = ['全部', '数码', '女装', '男装', '美妆', '鞋靴', '家居', '配饰', '食品', '潮玩', '运动', '汽车'];"
);
c = c.replace(
  "const CAT_KEYS = ['store.all', 'store.digital', 'store.women', 'store.men', 'store.beauty', 'store.shoes', 'store.home', 'store.accessories', 'store.food', 'store.toys'];",
  "const CAT_KEYS = ['store.all', 'store.digital', 'store.women', 'store.men', 'store.beauty', 'store.shoes', 'store.home', 'store.accessories', 'store.food', 'store.toys', 'store.sports', 'store.auto'];"
);

// Find product boundaries and fix categories
const prodRegex = /\{[\s\S]*?name:'([^']*)'[\s\S]*?cat:'([^']*)'[\s\S]*?\}/g;
let match;
const fixes = [];

while ((match = prodRegex.exec(c)) !== null) {
  const full = match[0];
  const name = match[1];

  let newCat = null;
  if (name.includes('Hyundai')) newCat = '汽车';
  else if (name.includes('Chemical Guys') || name.includes('Schumacher') || name.includes('Tyger Auto')) newCat = '汽车';
  else if (name.includes('Rivian') || name.includes('GM Genuine Parts')) newCat = '汽车';
  else if (name.startsWith('Nilight ')) newCat = '汽车';
  else if (name.includes('Push Up Board') || name.includes('Weight Bench') || name.includes('Resistance Bands')) newCat = '运动';
  else if (name.includes('Ab Roller') || name.includes('Ankle Strap')) newCat = '运动';
  else if (name.includes('Snack Box Containers Set') || name.includes('Air-Tight Snackle')) newCat = '家居';
  else if (name.includes('Deli Containers') || name.includes('XL Sandwich')) newCat = '家居';
  else if (name.includes('Nautica Kids')) newCat = '鞋靴';

  if (newCat) {
    const fixed = full.replace("cat:'"+match[2]+"'", "cat:'"+newCat+"'");
    c = c.replace(full, fixed);
    console.log(name.substring(0,60) + ' → ' + newCat);
  }
}

fs.writeFileSync('client/src/pages/StorePage.jsx', c);
console.log('\nDone. Categories fixed.');
