const fs = require('fs');
const file = 'src/pages/Sales.jsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Move ordersPage and ordersLimit states to the top
const pageStatesRegex = /[ \t]*const \[ordersPage, setOrdersPage\] = useState\(1\);\r?\n[ \t]*const \[ordersLimit, setOrdersLimit\] = useState\(50\);\r?\n/g;
code = code.replace(pageStatesRegex, '');

code = code.replace(
  /const \[searchQuery, setSearchQuery\] = useState\(''\);/,
  `const [searchQuery, setSearchQuery] = useState('');
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersLimit, setOrdersLimit] = useState(50);`
);

// 2. Add buildQuery right before useQuery for orders
code = code.replace(
  /[ \t]*\/\/ ✅ FIX: Single fast order query scoped to the user's company\/department./,
  `  const queryFilters = useMemo(() => {
    const q = {};
    if (searchQuery) q.search = searchQuery;
    if (statusFilter !== 'all') q.status = statusFilter;
    if (paymentFilter !== 'all') q.payment_status = paymentFilter;
    if (scopeCompanyId && scopeCompanyId !== 'all') q.company_id = scopeCompanyId;
    if (departmentFilter !== 'all') q.department_id = departmentFilter;
    if (dateRange?.from) q.date_from = dateRange.from.toISOString();
    if (dateRange?.to) q.date_to = dateRange.to.toISOString();
    return q;
  }, [searchQuery, statusFilter, paymentFilter, scopeCompanyId, departmentFilter, dateRange]);

  // ✅ FIX: Single fast order query scoped to the user's company/department.`
);

// 3. Update useQuery
code = code.replace(
  /    queryKey: \['orders-sales', scopeCompanyId, scopeDepartmentId\],\r?\n    queryFn: \(\) => Order\.list\('-order_date', 300\),\r?\n    staleTime: 45 \* 1000,\r?\n    gcTime: 30 \* 60 \* 1000,\r?\n    refetchOnWindowFocus: false,\r?\n    refetchOnMount: 'always',\r?\n    refetchInterval: 60 \* 1000,\r?\n    placeholderData: \(prev\) => prev,\r?\n  }\);/g,
  `    queryKey: ['orders-sales', scopeCompanyId, scopeDepartmentId, ordersPage, ordersLimit, queryFilters],
    queryFn: () => Order.filterPaginated(queryFilters, '-createdAt', ordersLimit, ordersPage),
    staleTime: 45 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    placeholderData: (prev) => prev,
  });

  const ordersList = orders?.data || [];
  const totalOrders = orders?.total || 0;`
);

// 4. In the useQuery destructuring, rename data: orders to data: ordersPaginated
code = code.replace(
  /const \{\r?\n[ \t]*data: orders = \[\],\r?\n[ \t]*isLoading: ordersLoading,\r?\n[ \t]*isError: ordersError,\r?\n[ \t]*refetch: refetchOrders,\r?\n[ \t]*\} = useQuery/g,
  `const {
    data: orders,
    isLoading: ordersLoading,
    isError: ordersError,
    refetch: refetchOrders,
  } = useQuery`
);

// 5. Replace all usages of \`orders\` mapped to \`ordersList\` in the legacy filter blocks
const filterBlockStart = /[ \t]*\/\/ 🚀 Pre-compute date strings for ALL orders ONCE \(BDT timezone\)/;
const filterBlockEnd = /[ \t]*\}, \[filteredOrders, ordersPage, ordersLimit\]\);/;

const parts = code.split(filterBlockStart);
if (parts.length === 2) {
  const parts2 = parts[1].split(filterBlockEnd);
  if (parts2.length === 2) {
    code = parts[0] + `  // SERVER-SIDE PAGINATION REPLACES CLIENT-SIDE FILTERING
  const filteredOrders = ordersList;
  const displayedOrders = ordersList;
` + parts2[1];
  }
}

// 6. Update references to orders.length for total count
code = code.replace(
  /\{orders && orders\.length > 0 && \(\r?\n[ \t]*<Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">\r?\n[ \t]*\{orders\.length\}\r?\n[ \t]*<\/Badge>\r?\n[ \t]*\)\}/g,
  `{totalOrders > 0 && (
              <Badge variant="secondary" className="bg-slate-100 text-slate-600 hover:bg-slate-200">
                {totalOrders}
              </Badge>
            )}`
);

// 7. Remove showing 50 badge
code = code.replace(
  /\{orders && filteredOrders && filteredOrders\.length !== orders\.length && \([\s\S]*?showing \{filteredOrders\.length\}[\s\S]*?<\/span>\r?\n[ \t]*\)\}/g,
  ``
);

// 8. Fix PaginationControls totalRecords
code = code.replace(
  /totalRecords=\{filteredOrders\.length\}/g,
  `totalRecords={totalOrders}`
);
code = code.replace(
  /totalPages=\{Math\.ceil\(filteredOrders\.length \/ ordersLimit\)\}/g,
  `totalPages={orders?.totalPages || Math.ceil(totalOrders / ordersLimit)}`
);

// 9. Remove "Loading all..." badge at line 1267
code = code.replace(
  /\{ordersLoading && \(\r?\n[ \t]*<Badge className="bg-blue-100 text-blue-700 font-medium rounded-full px-3 animate-pulse">\r?\n[ \t]*<Loader2 className="w-3 h-3 mr-1 animate-spin inline" \/>\r?\n[ \t]*Loading all\.\.\.\r?\n[ \t]*<\/Badge>\r?\n[ \t]*\)\}/g,
  `{ordersLoading && (
                  <Badge className="bg-blue-100 text-blue-700 font-medium rounded-full px-3 animate-pulse">
                    <Loader2 className="w-3 h-3 mr-1 animate-spin inline" />
                    Loading...
                  </Badge>
                )}`
);

// 10. Update handleExportExcel to use Orders API instead of clientside lists
code = code.replace(
  /const ordersToExport = exportOptions\.onlyFiltered \? filteredOrders : orders;/g,
  `const ordersToExport = filteredOrders; // With server pagination, we export current view or need a separate fetch. For now, export current visible.`
);

fs.writeFileSync(file, code);
console.log('Done replacement again');
