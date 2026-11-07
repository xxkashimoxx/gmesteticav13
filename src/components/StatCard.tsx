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
    <Card className={cn('min-w-0 min-h-[112px] p-3 sm:p-4 md:p-6 bg-gradient-card shadow-card border-0', className)}>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
        <div className="min-w-0 flex-1">
          <p className="break-words text-xs sm:text-sm font-medium leading-snug text-muted-foreground">{title}</p>
          <p className="mt-1.5 break-words text-lg sm:text-xl font-bold leading-tight text-foreground md:text-2xl">{value}</p>
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
        <div className="order-first flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 sm:order-last sm:h-11 sm:w-11">
          <Icon className="h-4 w-4 text-primary sm:h-5 sm:w-5" />
        </div>
      </div>
    </Card>
  );
}
