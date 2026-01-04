import { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { formatCurrency } from '@/lib/currency';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Printer, ArrowLeft } from 'lucide-react';

interface PaymentDetails {
  id: string;
  amount: number;
  payment_date: string | null;
  due_date: string;
  status: string;
  payment_method: string | null;
  notes: string | null;
  leases?: {
    tenants?: { full_name: string; phone: string | null; email: string | null };
    units?: { unit_number: string; properties?: { name: string; address: string } };
    monthly_rent: number;
  };
}

export default function Receipt() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const paymentId = searchParams.get('id');
  const [payment, setPayment] = useState<PaymentDetails | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (paymentId) {
      fetchPayment();
    }
  }, [paymentId]);

  const fetchPayment = async () => {
    try {
      const { data, error } = await supabase
        .from('payments')
        .select(`
          *,
          leases(
            monthly_rent,
            tenants(full_name, phone, email),
            units(unit_number, properties(name, address))
          )
        `)
        .eq('id', paymentId)
        .single();

      if (error) throw error;
      setPayment(data);
    } catch (error) {
      console.error('Error fetching payment:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-muted-foreground">Loading receipt...</div>
      </div>
    );
  }

  if (!payment) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Receipt not found</p>
        <Button variant="outline" onClick={() => navigate('/payments')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payments
        </Button>
      </div>
    );
  }

  const receiptNumber = `RCP-${payment.id.slice(0, 8).toUpperCase()}`;

  return (
    <div className="min-h-screen bg-background">
      {/* Print Controls - Hidden when printing */}
      <div className="print:hidden fixed top-0 left-0 right-0 bg-background border-b p-4 flex items-center justify-between z-10">
        <Button variant="outline" onClick={() => navigate('/payments')}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Payments
        </Button>
        <Button onClick={handlePrint}>
          <Printer className="h-4 w-4 mr-2" />
          Print Receipt
        </Button>
      </div>

      {/* Receipt Content */}
      <div className="max-w-2xl mx-auto p-8 print:p-0 print:pt-0 pt-24">
        <div className="bg-card border rounded-lg p-8 print:border-none print:shadow-none print:rounded-none">
          {/* Header */}
          <div className="text-center border-b pb-6 mb-6">
            <h1 className="text-2xl font-display font-bold text-foreground">PAYMENT RECEIPT</h1>
            <p className="text-muted-foreground mt-1">Property Management System</p>
          </div>

          {/* Receipt Info */}
          <div className="flex justify-between mb-8">
            <div>
              <p className="text-sm text-muted-foreground">Receipt Number</p>
              <p className="font-semibold">{receiptNumber}</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Date Issued</p>
              <p className="font-semibold">{format(new Date(), 'MMMM d, yyyy')}</p>
            </div>
          </div>

          {/* Tenant & Property Info */}
          <div className="grid grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Tenant Details</h3>
              <p className="font-medium">{payment.leases?.tenants?.full_name}</p>
              {payment.leases?.tenants?.phone && (
                <p className="text-sm text-muted-foreground">{payment.leases.tenants.phone}</p>
              )}
              {payment.leases?.tenants?.email && (
                <p className="text-sm text-muted-foreground">{payment.leases.tenants.email}</p>
              )}
            </div>
            <div>
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Property Details</h3>
              <p className="font-medium">{payment.leases?.units?.properties?.name}</p>
              <p className="text-sm text-muted-foreground">Unit {payment.leases?.units?.unit_number}</p>
              <p className="text-sm text-muted-foreground">{payment.leases?.units?.properties?.address}</p>
            </div>
          </div>

          {/* Payment Details Table */}
          <div className="border rounded-lg overflow-hidden mb-8">
            <table className="w-full">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left p-3 text-sm font-semibold">Description</th>
                  <th className="text-right p-3 text-sm font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t">
                  <td className="p-3">
                    <p className="font-medium">Monthly Rent Payment</p>
                    <p className="text-sm text-muted-foreground">
                      Due: {format(new Date(payment.due_date), 'MMMM d, yyyy')}
                    </p>
                  </td>
                  <td className="p-3 text-right font-medium">{formatCurrency(payment.amount)}</td>
                </tr>
              </tbody>
              <tfoot className="bg-muted/30">
                <tr className="border-t">
                  <td className="p-3 font-semibold">Total Paid</td>
                  <td className="p-3 text-right font-bold text-lg">{formatCurrency(payment.amount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Payment Info */}
          <div className="grid grid-cols-2 gap-4 mb-8 p-4 bg-muted/30 rounded-lg">
            <div>
              <p className="text-sm text-muted-foreground">Payment Status</p>
              <p className="font-semibold capitalize text-success">{payment.status}</p>
            </div>
            {payment.payment_date && (
              <div>
                <p className="text-sm text-muted-foreground">Payment Date</p>
                <p className="font-semibold">{format(new Date(payment.payment_date), 'MMMM d, yyyy')}</p>
              </div>
            )}
            {payment.payment_method && (
              <div>
                <p className="text-sm text-muted-foreground">Payment Method</p>
                <p className="font-semibold">{payment.payment_method}</p>
              </div>
            )}
          </div>

          {/* Notes */}
          {payment.notes && (
            <div className="mb-8">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-2">Notes</h3>
              <p className="text-sm">{payment.notes}</p>
            </div>
          )}

          {/* Footer */}
          <div className="border-t pt-6 text-center">
            <p className="text-sm text-muted-foreground">Thank you for your payment!</p>
            <p className="text-xs text-muted-foreground mt-2">
              This is a computer-generated receipt and does not require a signature.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
