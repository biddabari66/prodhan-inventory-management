const fs = require('fs');
let code = fs.readFileSync('src/pages/Sales.jsx', 'utf8');

if (!code.includes('const bdtFormatter = useMemo')) {
  code = code.replace(
    /  \/\/ 🚀 LIGHTNING FAST: Stats with optimized calculations using BDT timezone\r?\n  const stats = useMemo\(\(\) => \{/,
    `  // 🚀 Pre-compute date strings
  const bdtFormatter = useMemo(() => new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Dhaka' }), []);
  const ordersWithDateStr = useMemo(() => {
    if (!ordersList || ordersList.length === 0) return [];
    return ordersList.map(o => {
      const d = new Date(o.order_date || o.created_date || o.createdAt);
      const isValid = !isNaN(d.getTime());
      return { ...o, _dateStr: isValid ? bdtFormatter.format(d) : '1970-01-01' };
    });
  }, [ordersList, bdtFormatter]);

  // 🚀 LIGHTNING FAST: Stats with optimized calculations using BDT timezone
  const stats = useMemo(() => {`
  );
  fs.writeFileSync('src/pages/Sales.jsx', code);
  console.log('Fixed Sales.jsx successfully');
} else {
  console.log('Already fixed');
}
