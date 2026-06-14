import React from 'react';
import { Link } from 'react-router-dom';
import { CalendarClock, FileText, Receipt, Package, ArrowRight } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

const DAILY_TOOLS = [
  {
    title: 'Daily Expense Report',
    description: 'Daily breakdown of expenses by department and category, ready to print or export.',
    icon: Receipt,
    url: '/DailyExpenseReport',
  },
  {
    title: 'Manual Daily Reports',
    description: 'Submit and track daily department reports built from templates.',
    icon: FileText,
    url: '/ManualReporting',
  },
  {
    title: 'Inventory Daily Reports',
    description: 'Generate today’s sales, returns and stock movement reports in one click.',
    icon: Package,
    url: '/InventoryReports',
  },
];

export default function CustomDailyReports() {
  return (
    <div className="p-4 md:p-6 space-y-6">
      <PageHeader
        icon={CalendarClock}
        title="Daily Reports"
        subtitle="Everything you need for day-by-day reporting"
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DAILY_TOOLS.map((tool) => (
          <Card key={tool.title} className="border-2 border-slate-200 dark:border-slate-700 hover:border-orange-300 hover:shadow-md transition-all">
            <CardContent className="p-5 flex flex-col h-full">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-600 flex items-center justify-center shadow-md mb-3">
                <tool.icon className="w-5 h-5 text-white" />
              </div>
              <h3 className="font-bold text-lg text-slate-900 dark:text-white">{tool.title}</h3>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-1 flex-1">{tool.description}</p>
              <Button asChild className="mt-4 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white">
                <Link to={tool.url}>
                  Open <ArrowRight className="w-4 h-4 ml-2" />
                </Link>
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
