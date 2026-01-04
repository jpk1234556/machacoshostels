import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useToast } from '@/hooks/use-toast';
import { Building2, Loader2, ChevronLeft, ChevronRight, Upload, User, MapPin, CreditCard, ShieldCheck } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

type SignupStep = 1 | 2 | 3 | 4;

interface SignupData {
  // Step 1: Personal Info
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  phone: string;
  dateOfBirth: string;
  // Step 2: Address
  residentialAddress: string;
  city: string;
  country: string;
  postalCode: string;
  // Step 3: Identity Verification
  idType: string;
  idNumber: string;
  idDocument: File | null;
  // Step 4: Payment & Security
  paymentMethod: string;
  paymentProvider: string;
  billingAddress: string;
  securityDepositAgreed: boolean;
  termsAccepted: boolean;
}

const initialSignupData: SignupData = {
  fullName: '',
  email: '',
  password: '',
  confirmPassword: '',
  phone: '',
  dateOfBirth: '',
  residentialAddress: '',
  city: '',
  country: '',
  postalCode: '',
  idType: 'national_id',
  idNumber: '',
  idDocument: null,
  paymentMethod: '',
  paymentProvider: '',
  billingAddress: '',
  securityDepositAgreed: false,
  termsAccepted: false,
};

export default function Auth() {
  const navigate = useNavigate();
  const { user, signIn, loading } = useAuth();
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [signupStep, setSignupStep] = useState<SignupStep>(1);
  const [signupData, setSignupData] = useState<SignupData>(initialSignupData);

  // Login states
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  useEffect(() => {
    if (user && !loading) {
      navigate('/dashboard');
    }
  }, [user, loading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    const { error } = await signIn(loginEmail, loginPassword);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Login failed',
        description: error.message,
      });
    } else {
      toast({
        title: 'Welcome back!',
        description: 'You have successfully logged in.',
      });
      navigate('/dashboard');
    }

    setIsSubmitting(false);
  };

  const updateSignupData = (field: keyof SignupData, value: any) => {
    setSignupData(prev => ({ ...prev, [field]: value }));
  };

  const validateStep = (step: SignupStep): boolean => {
    switch (step) {
      case 1:
        if (!signupData.fullName || !signupData.email || !signupData.password || !signupData.phone || !signupData.dateOfBirth) {
          toast({ variant: 'destructive', title: 'Please fill all required fields' });
          return false;
        }
        if (signupData.password.length < 6) {
          toast({ variant: 'destructive', title: 'Password must be at least 6 characters' });
          return false;
        }
        if (signupData.password !== signupData.confirmPassword) {
          toast({ variant: 'destructive', title: 'Passwords do not match' });
          return false;
        }
        // Age verification (18+)
        const dob = new Date(signupData.dateOfBirth);
        const today = new Date();
        const age = today.getFullYear() - dob.getFullYear();
        if (age < 18) {
          toast({ variant: 'destructive', title: 'You must be at least 18 years old' });
          return false;
        }
        return true;
      case 2:
        if (!signupData.residentialAddress || !signupData.city || !signupData.country || !signupData.postalCode) {
          toast({ variant: 'destructive', title: 'Please fill all address fields' });
          return false;
        }
        return true;
      case 3:
        if (!signupData.idNumber || !signupData.idDocument) {
          toast({ variant: 'destructive', title: 'Please provide ID number and upload ID document' });
          return false;
        }
        return true;
      case 4:
        if (!signupData.paymentMethod || !signupData.billingAddress) {
          toast({ variant: 'destructive', title: 'Please fill payment details' });
          return false;
        }
        if (signupData.paymentMethod === 'mobile_money' && !signupData.paymentProvider) {
          toast({ variant: 'destructive', title: 'Please select mobile money provider' });
          return false;
        }
        if (!signupData.securityDepositAgreed || !signupData.termsAccepted) {
          toast({ variant: 'destructive', title: 'Please accept the terms and security deposit agreement' });
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const nextStep = () => {
    if (validateStep(signupStep)) {
      setSignupStep((prev) => Math.min(prev + 1, 4) as SignupStep);
    }
  };

  const prevStep = () => {
    setSignupStep((prev) => Math.max(prev - 1, 1) as SignupStep);
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateStep(4)) return;

    setIsSubmitting(true);

    try {
      // 1. Create user account
      const redirectUrl = `${window.location.origin}/`;
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: signupData.email,
        password: signupData.password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            full_name: signupData.fullName,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Failed to create account');

      // 2. Upload ID document
      let idDocumentUrl = null;
      if (signupData.idDocument) {
        const fileExt = signupData.idDocument.name.split('.').pop();
        const filePath = `${authData.user.id}/${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('id-documents')
          .upload(filePath, signupData.idDocument);

        if (uploadError) {
          console.error('ID upload error:', uploadError);
        } else {
          const { data: urlData } = supabase.storage
            .from('id-documents')
            .getPublicUrl(filePath);
          idDocumentUrl = urlData.publicUrl;
        }
      }

      // 3. Update profile with additional data
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          phone: signupData.phone,
          date_of_birth: signupData.dateOfBirth,
          residential_address: signupData.residentialAddress,
          city: signupData.city,
          country: signupData.country,
          postal_code: signupData.postalCode,
          id_type: signupData.idType,
          id_number: signupData.idNumber,
          id_document_url: idDocumentUrl,
          payment_method: signupData.paymentMethod,
          payment_provider: signupData.paymentMethod === 'mobile_money' ? signupData.paymentProvider : null,
          billing_address: signupData.billingAddress,
          security_deposit_agreed: signupData.securityDepositAgreed,
          terms_accepted: signupData.termsAccepted,
          terms_accepted_at: new Date().toISOString(),
        })
        .eq('id', authData.user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
      }

      toast({
        title: 'Account created!',
        description: 'Welcome to PropertyHub. Your account is pending approval.',
      });
      navigate('/dashboard');
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Signup failed',
        description: error.message,
      });
    }

    setIsSubmitting(false);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ variant: 'destructive', title: 'File too large', description: 'Max size is 5MB' });
        return;
      }
      updateSignupData('idDocument', file);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const stepIcons = [
    { icon: User, label: 'Personal' },
    { icon: MapPin, label: 'Address' },
    { icon: ShieldCheck, label: 'Identity' },
    { icon: CreditCard, label: 'Payment' },
  ];

  return (
    <div className="min-h-screen flex bg-background">
      {/* Left side - Branding */}
      <div className="hidden lg:flex lg:w-1/2 bg-sidebar items-center justify-center p-12">
        <div className="max-w-md text-center">
          <div className="flex items-center justify-center gap-3 mb-8">
            <div className="p-3 rounded-xl bg-sidebar-primary/20">
              <Building2 className="h-10 w-10 text-sidebar-primary" />
            </div>
          </div>
          <h1 className="text-4xl font-display font-bold text-sidebar-accent-foreground mb-4">
            PropertyHub
          </h1>
          <p className="text-lg text-sidebar-foreground">
            The modern way to manage your properties, tenants, and rentals. Built for property owners who value simplicity.
          </p>
        </div>
      </div>

      {/* Right side - Auth forms */}
      <div className="flex-1 flex items-center justify-center p-8 overflow-y-auto">
        <Card className="w-full max-w-lg border-0 shadow-xl">
          <CardHeader className="text-center pb-2">
            <div className="flex items-center justify-center gap-2 mb-4 lg:hidden">
              <div className="p-2 rounded-lg bg-primary/10">
                <Building2 className="h-6 w-6 text-primary" />
              </div>
              <span className="text-xl font-display font-bold">PropertyHub</span>
            </div>
            <CardTitle className="text-2xl font-display">Welcome</CardTitle>
            <CardDescription>
              Sign in to your account or create a new one
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-2 mb-6">
                <TabsTrigger value="login">Login</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@example.com"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      'Sign In'
                    )}
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup">
                {/* Step Indicators */}
                <div className="flex items-center justify-between mb-6">
                  {stepIcons.map((step, index) => (
                    <div key={index} className="flex flex-col items-center gap-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                          signupStep > index + 1
                            ? 'bg-success text-success-foreground'
                            : signupStep === index + 1
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted text-muted-foreground'
                        }`}
                      >
                        <step.icon className="h-5 w-5" />
                      </div>
                      <span className="text-xs text-muted-foreground">{step.label}</span>
                    </div>
                  ))}
                </div>

                <form onSubmit={handleSignup} className="space-y-4">
                  {/* Step 1: Personal Info */}
                  {signupStep === 1 && (
                    <div className="space-y-4 animate-fade-in">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <User className="h-5 w-5 text-primary" />
                        Personal Information
                      </h3>
                      <div className="space-y-2">
                        <Label htmlFor="fullName">Full Name *</Label>
                        <Input
                          id="fullName"
                          placeholder="John Doe"
                          value={signupData.fullName}
                          onChange={(e) => updateSignupData('fullName', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email *</Label>
                        <Input
                          id="email"
                          type="email"
                          placeholder="you@example.com"
                          value={signupData.email}
                          onChange={(e) => updateSignupData('email', e.target.value)}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="password">Password *</Label>
                          <Input
                            id="password"
                            type="password"
                            placeholder="••••••••"
                            value={signupData.password}
                            onChange={(e) => updateSignupData('password', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="confirmPassword">Confirm Password *</Label>
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="••••••••"
                            value={signupData.confirmPassword}
                            onChange={(e) => updateSignupData('confirmPassword', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="phone">Phone Number *</Label>
                          <Input
                            id="phone"
                            type="tel"
                            placeholder="+256 700 000 000"
                            value={signupData.phone}
                            onChange={(e) => updateSignupData('phone', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="dob">Date of Birth *</Label>
                          <Input
                            id="dob"
                            type="date"
                            value={signupData.dateOfBirth}
                            onChange={(e) => updateSignupData('dateOfBirth', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 2: Address */}
                  {signupStep === 2 && (
                    <div className="space-y-4 animate-fade-in">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <MapPin className="h-5 w-5 text-primary" />
                        Address Details
                      </h3>
                      <div className="space-y-2">
                        <Label htmlFor="address">Residential Address *</Label>
                        <Input
                          id="address"
                          placeholder="123 Main Street"
                          value={signupData.residentialAddress}
                          onChange={(e) => updateSignupData('residentialAddress', e.target.value)}
                          required
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="city">City *</Label>
                          <Input
                            id="city"
                            placeholder="Kampala"
                            value={signupData.city}
                            onChange={(e) => updateSignupData('city', e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="country">Country *</Label>
                          <Input
                            id="country"
                            placeholder="Uganda"
                            value={signupData.country}
                            onChange={(e) => updateSignupData('country', e.target.value)}
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="postalCode">Postal Code *</Label>
                        <Input
                          id="postalCode"
                          placeholder="00000"
                          value={signupData.postalCode}
                          onChange={(e) => updateSignupData('postalCode', e.target.value)}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Step 3: Identity Verification */}
                  {signupStep === 3 && (
                    <div className="space-y-4 animate-fade-in">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        Identity Verification
                      </h3>
                      <div className="space-y-2">
                        <Label>Government ID Type *</Label>
                        <Select
                          value={signupData.idType}
                          onValueChange={(value) => updateSignupData('idType', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select ID type" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="national_id">National ID</SelectItem>
                            <SelectItem value="passport">Passport</SelectItem>
                            <SelectItem value="driving_license">Driving License</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="idNumber">ID Number *</Label>
                        <Input
                          id="idNumber"
                          placeholder="Enter your ID number"
                          value={signupData.idNumber}
                          onChange={(e) => updateSignupData('idNumber', e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Upload ID Document *</Label>
                        <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                          <input
                            type="file"
                            id="idDocument"
                            accept="image/*,.pdf"
                            onChange={handleFileChange}
                            className="hidden"
                          />
                          <label htmlFor="idDocument" className="cursor-pointer">
                            <Upload className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                            {signupData.idDocument ? (
                              <p className="text-sm text-primary">{signupData.idDocument.name}</p>
                            ) : (
                              <>
                                <p className="text-sm font-medium">Click to upload</p>
                                <p className="text-xs text-muted-foreground">Photo or scan (max 5MB)</p>
                              </>
                            )}
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Step 4: Payment & Security */}
                  {signupStep === 4 && (
                    <div className="space-y-4 animate-fade-in">
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        <CreditCard className="h-5 w-5 text-primary" />
                        Payment & Security
                      </h3>
                      <div className="space-y-2">
                        <Label>Payment Method *</Label>
                        <Select
                          value={signupData.paymentMethod}
                          onValueChange={(value) => updateSignupData('paymentMethod', value)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select payment method" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="mobile_money">Mobile Money</SelectItem>
                            <SelectItem value="bank">Bank Transfer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {signupData.paymentMethod === 'mobile_money' && (
                        <div className="space-y-2">
                          <Label>Mobile Money Provider *</Label>
                          <Select
                            value={signupData.paymentProvider}
                            onValueChange={(value) => updateSignupData('paymentProvider', value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select provider" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="mtn">MTN Mobile Money</SelectItem>
                              <SelectItem value="airtel">Airtel Money</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      <div className="space-y-2">
                        <Label htmlFor="billingAddress">Billing Address *</Label>
                        <Input
                          id="billingAddress"
                          placeholder="Billing address"
                          value={signupData.billingAddress}
                          onChange={(e) => updateSignupData('billingAddress', e.target.value)}
                          required
                        />
                      </div>

                      <div className="space-y-3 pt-4 border-t">
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="securityDeposit"
                            checked={signupData.securityDepositAgreed}
                            onCheckedChange={(checked) => updateSignupData('securityDepositAgreed', checked)}
                          />
                          <label htmlFor="securityDeposit" className="text-sm leading-tight cursor-pointer">
                            I agree to the security deposit terms and conditions
                          </label>
                        </div>
                        <div className="flex items-start gap-3">
                          <Checkbox
                            id="terms"
                            checked={signupData.termsAccepted}
                            onCheckedChange={(checked) => updateSignupData('termsAccepted', checked)}
                          />
                          <label htmlFor="terms" className="text-sm leading-tight cursor-pointer">
                            I accept the Terms & Conditions and Privacy Policy
                          </label>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Navigation Buttons */}
                  <div className="flex gap-3 pt-4">
                    {signupStep > 1 && (
                      <Button type="button" variant="outline" onClick={prevStep} className="flex-1">
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Back
                      </Button>
                    )}
                    {signupStep < 4 ? (
                      <Button type="button" onClick={nextStep} className="flex-1">
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </Button>
                    ) : (
                      <Button type="submit" className="flex-1" disabled={isSubmitting}>
                        {isSubmitting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Create Account'
                        )}
                      </Button>
                    )}
                  </div>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
