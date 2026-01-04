import { useAuth } from '@/hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface ApprovalGuardProps {
  children: React.ReactNode;
}

export function ApprovalGuard({ children }: ApprovalGuardProps) {
  const { user, profile, loading, isApproved, signOut, hasRole } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse flex flex-col items-center gap-4">
          <div className="h-12 w-12 rounded-full bg-primary/20" />
          <div className="h-4 w-32 rounded bg-muted" />
        </div>
      </div>
    );
  }

  // Not logged in - redirect to auth
  if (!user) {
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  // Super admins bypass approval check
  if (hasRole('super_admin')) {
    return <>{children}</>;
  }

  // Account not approved - show pending message
  if (!isApproved()) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto p-4 rounded-full bg-warning/10 w-fit mb-4">
              <Clock className="h-8 w-8 text-warning" />
            </div>
            <CardTitle className="font-display text-2xl">Account Pending Approval</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your account is currently pending approval by the administrator. 
              You will be able to access the system once your account has been verified.
            </p>
            <div className="flex items-center justify-center gap-2 p-3 rounded-lg bg-muted/50">
              <Shield className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">
                Status: <span className="font-medium text-warning">Pending</span>
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              Please contact the administrator if you believe this is an error.
            </p>
            <Button variant="outline" onClick={() => signOut()} className="mt-4">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Account rejected
  if (profile?.approval_status === 'rejected') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full border-destructive/50">
          <CardHeader className="text-center">
            <div className="mx-auto p-4 rounded-full bg-destructive/10 w-fit mb-4">
              <Shield className="h-8 w-8 text-destructive" />
            </div>
            <CardTitle className="font-display text-2xl">Access Denied</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Your account access has been denied. Please contact the administrator for more information.
            </p>
            <Button variant="outline" onClick={() => signOut()} className="mt-4">
              Sign Out
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return <>{children}</>;
}