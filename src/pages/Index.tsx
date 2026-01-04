import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Building2, ArrowRight, Home, Users, CreditCard, Wrench } from 'lucide-react';

export default function Index() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b">
        <div className="container flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <span className="font-display font-bold text-xl">PropertyHub</span>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/auth">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link to="/auth">
              <Button>Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="py-20 md:py-32">
        <div className="container text-center">
          <h1 className="text-4xl md:text-6xl font-display font-bold tracking-tight mb-6">
            Property Management
            <br />
            <span className="text-primary">Made Simple</span>
          </h1>
          <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto mb-8">
            The modern way to manage your hostels, apartments, hotels, and rentals. 
            Built for property owners who value simplicity and efficiency.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link to="/auth">
              <Button size="lg" className="gap-2">
                Start Free Trial
                <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Button size="lg" variant="outline">
              Watch Demo
            </Button>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-20 bg-muted/50">
        <div className="container">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-display font-bold mb-4">
              Everything you need to manage properties
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              From tenant management to payment tracking, we've got you covered.
            </p>
          </div>
          <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            <FeatureCard
              icon={Home}
              title="Property Management"
              description="Manage multiple properties with ease. Track units, occupancy, and more."
            />
            <FeatureCard
              icon={Users}
              title="Tenant Management"
              description="Keep track of tenant information, leases, and communication history."
            />
            <FeatureCard
              icon={CreditCard}
              title="Payment Tracking"
              description="Monitor rent payments, track overdue balances, and generate reports."
            />
            <FeatureCard
              icon={Wrench}
              title="Maintenance Requests"
              description="Streamline maintenance with priority-based request tracking."
            />
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20">
        <div className="container text-center">
          <h2 className="text-3xl font-display font-bold mb-4">
            Ready to streamline your property management?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of property owners who trust PropertyHub to manage their rentals.
          </p>
          <Link to="/auth">
            <Button size="lg">Get Started Today</Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="p-1 rounded bg-primary/10">
              <Building2 className="h-4 w-4 text-primary" />
            </div>
            <span className="font-display font-semibold">PropertyHub</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2026 PropertyHub. All rights reserved.
          </p>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon: Icon, title, description }: { icon: React.ElementType; title: string; description: string }) {
  return (
    <div className="p-6 bg-card rounded-xl border hover-lift">
      <div className="p-3 rounded-lg bg-primary/10 w-fit mb-4">
        <Icon className="h-6 w-6 text-primary" />
      </div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-muted-foreground">{description}</p>
    </div>
  );
}
