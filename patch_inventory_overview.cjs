const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/InventoryOverview.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Checkbox import
if (!content.includes('import { Checkbox }')) {
  content = content.replace(
    "import { Badge } from '@/components/ui/badge';",
    "import { Badge } from '@/components/ui/badge';\nimport { Checkbox } from '@/components/ui/checkbox';"
  );
}

// 2. Update InventoryTableRow signature
content = content.replace(
  /function InventoryTableRow\(\{\s*item,\s*todaySalesData,\s*canEdit,\s*canDelete,\s*canViewPurchasePrice,\s*getPurchasePrice,\s*onEdit,\s*onDelete\s*\}\) \{/g,
  `function InventoryTableRow({
  item, todaySalesData, canEdit, canDelete,
  canViewPurchasePrice, getPurchasePrice, onEdit, onDelete,
  isSelected, onSelect
}) {`
);

// 3. Update InventoryTableRow to include the Checkbox
content = content.replace(
  /\{?\/\* ── ITEM NAME CELL ─────────────────────────────────────── \*\/\s*<TableCell className="py-3 pl-6">/g,
  `<TableCell className="w-[40px] pl-6 pr-0">
          <div className="pt-1.5" onClick={e => e.stopPropagation()}>
            <Checkbox 
              checked={isSelected} 
              onCheckedChange={(checked) => onSelect(item.id, checked)}
            />
          </div>
        </TableCell>
        {/* ── ITEM NAME CELL ─────────────────────────────────────── */}
        <TableCell className="py-3 pl-4">`
);

// 4. Update InventoryOverviewPage state
content = content.replace(
  /const \[categoryFilter, setCategoryFilter\] = useState\('all'\);/g,
  `const [categoryFilter, setCategoryFilter] = useState('all');
  const [selectedItemIds, setSelectedItemIds] = useState([]);

  const handleSelectAll = (checked) => {
    setSelectedItemIds(checked ? displayedInventory.map(i => i.id) : []);
  };

  const handleSelectItem = (id, checked) => {
    setSelectedItemIds(prev => checked ? [...prev, id] : prev.filter(item => item !== id));
  };

  const handleBulkDelete = async () => {
    if (!confirm(\`Are you sure you want to delete \${selectedItemIds.length} items?\`)) return;
    try {
      for (const id of selectedItemIds) {
        await erp.entities.Inventory.delete(id);
      }
      toast.success(\`\${selectedItemIds.length} items deleted successfully\`);
      setSelectedItemIds([]);
      await loadUserAndInventory();
    } catch (err) {
      toast.error(\`Failed to delete some items: \${err.message}\`);
    }
  };`
);

// 5. Update TableHeader
content = content.replace(
  /<TableHead className="text-xs font-semibold text-\[\#6B7280\] uppercase tracking-wider pl-6 min-w-\[320px\]">/,
  `<TableHead className="w-[40px] pl-6 pr-0">
                      <Checkbox 
                        checked={displayedInventory.length > 0 && selectedItemIds.length === displayedInventory.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider pl-4 min-w-[320px]">`
);

// 6. Pass props to InventoryTableRow
content = content.replace(
  /onEdit=\{handleEdit\} onDelete=\{handleDeleteClick\}/g,
  `onEdit={handleEdit} onDelete={handleDeleteClick}
                        isSelected={selectedItemIds.includes(item.id)}
                        onSelect={handleSelectItem}`
);

// 7. Add Floating Action Bar
content = content.replace(
  /\{?\/\* ── DESKTOP TABLE ───────────────────────────────────────────────────── \*\/\s*<Card className="bg-card border-0 shadow-sm rounded-xl overflow-hidden hidden md:block">/,
  `{selectedItemIds.length > 0 && (
          <div className="sticky top-4 z-50 flex items-center justify-between bg-white px-6 py-3 rounded-xl shadow-lg border border-slate-200 mb-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-indigo-100 text-indigo-700 px-3 py-1 text-sm font-semibold">
                {selectedItemIds.length} Selected
              </Badge>
              <span className="text-sm font-medium text-slate-600">items</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedItemIds([])}>Cancel</Button>
              <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2">
                <Trash2 className="w-4 h-4" /> Bulk Delete
              </Button>
            </div>
          </div>
        )}

        {/* ── DESKTOP TABLE ───────────────────────────────────────────────────── */}
        <Card className="bg-card border-0 shadow-sm rounded-xl overflow-hidden hidden md:block">`
);

// Fix colSpan
content = content.replace(/colSpan=\{10\}/g, "colSpan={11}");

// Fix table header column count (VariantDetailRow uses hardcoded TableCells)
content = content.replace(
  /\{?\/\* Variant Name — indented \*\/\s*<TableCell className="py-2 pl-\[76px\]">/,
  `<TableCell />
      {/* Variant Name — indented */}
      <TableCell className="py-2 pl-4">`
);

fs.writeFileSync(filePath, content);
console.log('InventoryOverview patched successfully.');
