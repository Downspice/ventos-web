import type { ComponentType } from "react";
import { useQuery } from "@apollo/client/react";
import { gql } from "@apollo/client";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from "recharts";
import {
  Calendar,
  DollarSign,
  Package,
  ShoppingBag,
  TrendingDown,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import { DashboardBodySkeleton } from "@/components/loading-skeletons";
import { PageHeader } from "@/components/PageHeader";
import { useAccess } from "../hooks/useAccess";
import { useBusinessCurrency } from "../hooks/useBusinessCurrency";

const HOME_DASHBOARD = gql`
  query HomeDashboard($trendDays: Int) {
    homeDashboard(trendDays: $trendDays) {
      kpis {
        salesToday
        salesYesterday
        salesTodayChangePercent
        salesLast7Days
        salesLast30Days
        ordersToday
        ordersLast7Days
        avgOrderValue30Days
        openRegisterSessions
        lowStockCount
        appointmentsToday
        appointmentsNext7Days
        customerCount
        newCustomers30Days
        productCount
        expensesLast30Days
        netRevenue30Days
      }
      salesTrend {
        label
        value
        count
      }
      ordersTrend {
        label
        value
      }
      salesByDayOfWeek {
        label
        value
      }
      topProducts {
        id
        name
        value
        secondary
      }
      lowStockProducts {
        id
        name
        value
      }
      appointmentsTrend {
        label
        value
      }
      revenueVsExpenses {
        label
        revenue
        expenses
      }
    }
  }
`;

type DashboardData = {
  homeDashboard?: {
    kpis: {
      salesToday: number;
      salesYesterday: number;
      salesTodayChangePercent: number;
      salesLast7Days: number;
      salesLast30Days: number;
      ordersToday: number;
      ordersLast7Days: number;
      avgOrderValue30Days: number;
      openRegisterSessions: number;
      lowStockCount: number;
      appointmentsToday: number;
      appointmentsNext7Days: number;
      customerCount: number;
      newCustomers30Days: number;
      productCount: number;
      expensesLast30Days: number;
      netRevenue30Days: number;
    };
    salesTrend: { label: string; value: number; count: number }[];
    ordersTrend: { label: string; value: number }[];
    salesByDayOfWeek: { label: string; value: number }[];
    topProducts: { id: string; name: string; value: number; secondary?: number | null }[];
    lowStockProducts: { id: string; name: string; value: number }[];
    appointmentsTrend: { label: string; value: number }[];
    revenueVsExpenses: { label: string; revenue: number; expenses: number }[];
  };
};

const salesChartConfig = {
  value: { label: "Revenue", color: "hsl(var(--chart-1))" },
} satisfies ChartConfig;

const ordersChartConfig = {
  value: { label: "Orders", color: "hsl(var(--chart-2))" },
} satisfies ChartConfig;

const financeChartConfig = {
  revenue: { label: "Revenue", color: "hsl(var(--chart-1))" },
  expenses: { label: "Expenses", color: "hsl(var(--chart-3))" },
} satisfies ChartConfig;

const weekdayChartConfig = {
  value: { label: "Sales", color: "hsl(var(--chart-4))" },
} satisfies ChartConfig;

const apptChartConfig = {
  value: { label: "Appointments", color: "hsl(var(--chart-5))" },
} satisfies ChartConfig;

const PIE_COLORS = [
  "hsl(var(--chart-1))",
  "hsl(var(--chart-2))",
  "hsl(var(--chart-3))",
  "hsl(var(--chart-4))",
  "hsl(var(--chart-5))",
  "hsl(220 70% 50%)",
  "hsl(160 60% 45%)",
  "hsl(30 80% 55%)",
];

function shortDate(iso: string) {
  const d = new Date(iso + "T12:00:00");
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function KpiCard({
  title,
  value,
  hint,
  icon: Icon,
  trend,
}: {
  title: string;
  value: string;
  hint?: string;
  icon: ComponentType<{ className?: string }>;
  trend?: number;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className="size-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tabular-nums">{value}</div>
        {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
        {trend !== undefined ? (
          <p
            className={`mt-1 flex items-center gap-1 text-xs ${trend >= 0 ? "text-emerald-600" : "text-red-600"}`}
          >
            {trend >= 0 ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
            {trend >= 0 ? "+" : ""}
            {trend.toFixed(1)}% vs yesterday
          </p>
        ) : null}
      </CardContent>
    </Card>
  );
}

export default function HomePage() {
  const { business } = useAccess();
  const { formatMoney } = useBusinessCurrency();
  const { data, loading, error } = useQuery<DashboardData>(HOME_DASHBOARD, {
    variables: { trendDays: 14 },
  });

  const dash = data?.homeDashboard;
  const kpis = dash?.kpis;

  const topProductsPie = (dash?.topProducts ?? []).map((p) => ({
    name: p.name.length > 18 ? `${p.name.slice(0, 16)}…` : p.name,
    value: p.value,
  }));

  if (loading && !dash) {
    return (
      <div className="space-y-6">
        <PageHeader
          title={business ? `Welcome back` : "Home"}
          description={
            business
              ? `${business.name} — live sales, inventory, and appointment metrics.`
              : "Operational dashboard"
          }
        />
        {error ? <p className="text-sm text-red-500">{error.message}</p> : null}
        <DashboardBodySkeleton kpiCount={8} chartCount={6} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title={business ? `Welcome back` : "Home"}
        description={
          business
            ? `${business.name} — live sales, inventory, and appointment metrics.`
            : "Operational dashboard"
        }
      />

      {error ? <p className="text-sm text-red-500">{error.message}</p> : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          title="Sales today"
          value={formatMoney(kpis?.salesToday ?? 0)}
          icon={DollarSign}
          trend={kpis?.salesTodayChangePercent}
        />
        <KpiCard
          title="Last 7 days"
          value={formatMoney(kpis?.salesLast7Days ?? 0)}
          hint={`${kpis?.ordersLast7Days ?? 0} orders`}
          icon={ShoppingBag}
        />
        <KpiCard
          title="Net (30 days)"
          value={formatMoney(kpis?.netRevenue30Days ?? 0)}
          hint={`Expenses ${formatMoney(kpis?.expensesLast30Days ?? 0)}`}
          icon={Wallet}
        />
        <KpiCard
          title="Avg order (30d)"
          value={formatMoney(kpis?.avgOrderValue30Days ?? 0)}
          hint={`${kpis?.ordersToday ?? 0} orders today`}
          icon={TrendingUp}
        />
        <KpiCard
          title="Customers"
          value={String(kpis?.customerCount ?? 0)}
          hint={`+${kpis?.newCustomers30Days ?? 0} this month`}
          icon={Users}
        />
        <KpiCard
          title="Products"
          value={String(kpis?.productCount ?? 0)}
          hint={`${kpis?.lowStockCount ?? 0} low-stock SKUs`}
          icon={Package}
        />
        <KpiCard
          title="Appointments"
          value={String(kpis?.appointmentsToday ?? 0)}
          hint={`${kpis?.appointmentsNext7Days ?? 0} in next 7 days`}
          icon={Calendar}
        />
        <KpiCard
          title="Open registers"
          value={String(kpis?.openRegisterSessions ?? 0)}
          hint={`30d sales ${formatMoney(kpis?.salesLast30Days ?? 0)}`}
          icon={DollarSign}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenue trend</CardTitle>
            <CardDescription>Daily finalized sales (14 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={salesChartConfig} className="aspect-[2/1] h-[280px] w-full">
              <AreaChart data={dash?.salesTrend ?? []} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickFormatter={shortDate} tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={48} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="var(--color-value)"
                  fill="var(--color-value)"
                  fillOpacity={0.2}
                />
              </AreaChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Orders per day</CardTitle>
            <CardDescription>Transaction count</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ordersChartConfig} className="aspect-[2/1] h-[280px] w-full">
              <BarChart data={dash?.ordersTrend ?? []} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickFormatter={shortDate} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Revenue vs expenses</CardTitle>
            <CardDescription>Daily comparison (14 days)</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={financeChartConfig} className="aspect-[2/1] h-[280px] w-full">
              <LineChart data={dash?.revenueVsExpenses ?? []} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickFormatter={shortDate} tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={48} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <ChartLegend content={<ChartLegendContent />} />
                <Line type="monotone" dataKey="revenue" stroke="var(--color-revenue)" strokeWidth={2} dot={false} />
                <Line type="monotone" dataKey="expenses" stroke="var(--color-expenses)" strokeWidth={2} dot={false} />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Sales by weekday</CardTitle>
            <CardDescription>Last 30 days aggregated</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={weekdayChartConfig} className="aspect-[2/1] h-[280px] w-full">
              <BarChart data={dash?.salesByDayOfWeek ?? []} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} />
                <YAxis tickLine={false} axisLine={false} width={48} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Top products</CardTitle>
            <CardDescription>Revenue share (30 days)</CardDescription>
          </CardHeader>
          <CardContent>
            {topProductsPie.length === 0 ? (
              <p className="text-sm text-muted-foreground">No product sales yet.</p>
            ) : (
              <ChartContainer config={salesChartConfig} className="mx-auto aspect-square h-[280px] max-w-[320px]">
                <PieChart>
                  <ChartTooltip content={<ChartTooltipContent hideLabel />} />
                  <Pie data={topProductsPie} dataKey="value" nameKey="name" innerRadius={60} outerRadius={100}>
                    {topProductsPie.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ChartContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Appointments (7 days)</CardTitle>
            <CardDescription>Scheduled by day</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={apptChartConfig} className="aspect-[2/1] h-[280px] w-full">
              <LineChart data={dash?.appointmentsTrend ?? []} margin={{ left: 8, right: 8 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="label" tickFormatter={shortDate} tickLine={false} axisLine={false} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} width={32} />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Line type="monotone" dataKey="value" stroke="var(--color-value)" strokeWidth={2} dot />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {(dash?.lowStockProducts?.length ?? 0) > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Low stock alert</CardTitle>
            <CardDescription>Products at or below threshold</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer config={ordersChartConfig} className="h-[220px] w-full">
              <BarChart
                layout="vertical"
                data={dash?.lowStockProducts ?? []}
                margin={{ left: 8, right: 16 }}
              >
                <CartesianGrid horizontal={false} />
                <XAxis type="number" tickLine={false} axisLine={false} />
                <YAxis
                  type="category"
                  dataKey="name"
                  width={120}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) => (String(v).length > 14 ? `${String(v).slice(0, 12)}…` : v)}
                />
                <ChartTooltip content={<ChartTooltipContent />} />
                <Bar dataKey="value" fill="var(--color-value)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
