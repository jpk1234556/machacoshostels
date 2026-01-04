import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CreditCard, Users, Wrench, FileText } from 'lucide-react';

interface Activity {
  id: string;
  type: 'payment' | 'tenant' | 'maintenance' | 'lease';
  title: string;
  description: string;
  time: string;
}

const iconMap = {
  payment: CreditCard,
  tenant: Users,
  maintenance: Wrench,
  lease: FileText,
};

const colorMap = {
  payment: 'bg-success/10 text-success',
  tenant: 'bg-info/10 text-info',
  maintenance: 'bg-warning/10 text-warning',
  lease: 'bg-primary/10 text-primary',
};

interface RecentActivityProps {
  activities: Activity[];
}

export function RecentActivity({ activities }: RecentActivityProps) {
  if (activities.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="font-display">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm text-center py-8">
            No recent activity to display
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="font-display">Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.map((activity) => {
            const Icon = iconMap[activity.type];
            return (
              <div key={activity.id} className="flex items-start gap-4">
                <div className={`p-2 rounded-lg ${colorMap[activity.type]}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">{activity.title}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {activity.description}
                  </p>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {activity.time}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
