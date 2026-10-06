import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  className?: string;
}

export function StatCard({ title, value, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn('p-4 md:p-6 min-h-[116px] bg-gradient-card shadow-card border-0', className)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium leading-tight text-muted-foreground">{title}</p>
          <p className="mt-2 break-words text-xl font-bold leading-tight text-foreground md:text-2xl">{value}</p>
          {trend && (
            <div className="mt-2 flex items-center">
              <span
                className={cn(
                  'text-xs font-medium',
                  trend.isPositive ? 'text-success' : 'text-destructive',
                )}
              >
                {trend.isPositive ? '+' : ''}{trend.value}
              </span>
              <span className="ml-1 text-xs text-muted-foreground">vs mês anterior</span>
            </div>
          )}
        </div>
        <div className="mt-0.5 flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      </div>
    </Card>
  );
}
