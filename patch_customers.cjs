const fs = require('fs');
const path = require('path');

const filePath = path.resolve('src/pages/CustomerManagement.jsx');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Add Checkbox import
if (!content.includes('import { Checkbox }')) {
  content = content.replace(
    "import { Badge } from '@/components/ui/badge';",
    "import { Badge } from '@/components/ui/badge';\nimport { Checkbox } from '@/components/ui/checkbox';"
  );
}

// 2. Add state
content = content.replace(
  /const \[currentPage, setCurrentPage\] = useState\(1\);/,
  `const [currentPage, setCurrentPage] = useState(1);
  const [selectedCustomerIds, setSelectedCustomerIds] = useState([]);
  
  const handleSelectAll = (checked) => {
    setSelectedCustomerIds(checked ? filteredCustomers.map(c => c.id) : []);
  };

  const handleSelectCustomer = (id, checked) => {
    setSelectedCustomerIds(prev => checked ? [...prev, id] : prev.filter(cId => cId !== id));
  };

  const handleBulkDelete = async () => {
    if (!confirm(\`Delete \${selectedCustomerIds.length} customers? This cannot be undone.\`)) return;
    try {
      for (const id of selectedCustomerIds) {
        await erp.entities.Customer.delete(id);
      }
      toast.success(\`\${selectedCustomerIds.length} customers deleted\`);
      setSelectedCustomerIds([]);
      refetchCustomers();
    } catch (err) {
      toast.error('Failed to delete customers: ' + err.message);
    }
  };

  const handleBulkExport = () => {
    const toExport = filteredCustomers.filter(c => selectedCustomerIds.includes(c.id));
    if(toExport.length === 0) return;
    
    const headers = ['Name', 'Phone', 'Email', 'Type', 'Orders', 'Spent', 'Since'];
    const rows = toExport.map(c => [
      c.customer_name, c.customer_phone, c.customer_email || '', c.customer_type, 
      c.total_orders, c.total_spent, c.customer_since || c.created_date
    ]);
    
    const csvContent = [headers.join(','), ...rows.map(r => r.map(v => \`"\${v}"\`).join(','))].join('\\n');
    const blob = new Blob(['\\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = \`customers_export_\${new Date().getTime()}.csv\`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success(\`Exported \${toExport.length} customers\`);
  };

  const handleBulkTagging = async () => {
    const tag = prompt('Enter a tag to add to selected customers:');
    if (!tag) return;
    
    try {
      for (const id of selectedCustomerIds) {
        const customer = customers.find(c => c.id === id);
        if (customer) {
          const currentTags = customer.tags || [];
          if (!currentTags.includes(tag)) {
            await erp.entities.Customer.update(id, { tags: [...currentTags, tag] });
          }
        }
      }
      toast.success(\`Tag "\${tag}" added to \${selectedCustomerIds.length} customers\`);
      setSelectedCustomerIds([]);
      refetchCustomers();
    } catch (err) {
      toast.error('Failed to update tags: ' + err.message);
    }
  };
`
);

// 3. Add Floating Action Bar
content = content.replace(
  /\{?\/\* Mobile Customer Cards \*\/\s*<div className="md:hidden space-y-3">/,
  `{selectedCustomerIds.length > 0 && (
          <div className="sticky top-4 z-50 flex items-center justify-between bg-white px-6 py-3 rounded-xl shadow-lg border border-slate-200 mb-4 animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <Badge className="bg-indigo-100 text-indigo-700 px-3 py-1 text-sm font-semibold">
                {selectedCustomerIds.length} Selected
              </Badge>
              <span className="text-sm font-medium text-slate-600">customers</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={() => setSelectedCustomerIds([])}>Cancel</Button>
              <Button variant="outline" size="sm" onClick={handleBulkExport} className="text-blue-600 hover:bg-blue-50">
                <Download className="w-4 h-4 mr-1" /> Export
              </Button>
              <Button variant="outline" size="sm" onClick={handleBulkTagging} className="text-purple-600 hover:bg-purple-50">
                <Tag className="w-4 h-4 mr-1" /> Add Tag
              </Button>
              {canDelete && (
                <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2">
                  <Trash2 className="w-4 h-4" /> Bulk Delete
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Mobile Customer Cards */}
        <div className="md:hidden space-y-3">`
);

// 4. Desktop Table Checkbox Header
content = content.replace(
  /<TableHead className="text-xs font-semibold text-\[\#6B7280\] uppercase tracking-wider pl-6">Customer<\/TableHead>/,
  `<TableHead className="w-[40px] pl-6 pr-0">
                      <Checkbox 
                        checked={filteredCustomers.length > 0 && selectedCustomerIds.length === filteredCustomers.length}
                        onCheckedChange={handleSelectAll}
                      />
                    </TableHead>
                    <TableHead className="text-xs font-semibold text-[#6B7280] uppercase tracking-wider pl-4">Customer</TableHead>`
);

// 5. Desktop Table Checkbox Row
content = content.replace(
  /<TableCell className="pl-6">\s*<div className="flex items-center gap-3">/g,
  `<TableCell className="pl-6 pr-0 w-[40px]">
                            <Checkbox 
                              checked={selectedCustomerIds.includes(customer.id)}
                              onCheckedChange={(checked) => handleSelectCustomer(customer.id, checked)}
                            />
                          </TableCell>
                          <TableCell className="pl-4">
                            <div className="flex items-center gap-3">`
);

// Fix colSpan
content = content.replace(/colSpan=\{7\}/g, "colSpan={8}");

fs.writeFileSync(filePath, content);
console.log('CustomerManagement patched successfully.');
