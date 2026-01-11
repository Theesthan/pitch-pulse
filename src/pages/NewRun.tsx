import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, ArrowRight, Building2, Calendar, FileText } from 'lucide-react';

type Step = 'company' | 'period' | 'details';

interface FormData {
  ticker: string;
  cik: string;
  companyName: string;
  description: string;
  runName: string;
  fiscalYearStart: number;
  fiscalYearEnd: number;
}

export default function NewRun() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('company');
  const currentYear = new Date().getFullYear();

  const [formData, setFormData] = useState<FormData>({
    ticker: '',
    cik: '',
    companyName: '',
    description: '',
    runName: '',
    fiscalYearStart: currentYear - 3,
    fiscalYearEnd: currentYear - 1,
  });

  const createRunMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!user) throw new Error('Not authenticated');

      // First, create or find the company
      const { data: existingCompany } = await supabase
        .from('companies')
        .select('id')
        .eq('ticker', data.ticker.toUpperCase())
        .maybeSingle();

      let companyId: string;

      if (existingCompany) {
        companyId = existingCompany.id;
      } else {
        const { data: newCompany, error: companyError } = await supabase
          .from('companies')
          .insert({
            ticker: data.ticker.toUpperCase(),
            cik: data.cik || null,
            name: data.companyName,
            description: data.description || null,
            created_by: user.id,
          })
          .select('id')
          .single();

        if (companyError) throw companyError;
        companyId = newCompany.id;
      }

      // Create the run
      const { data: run, error: runError } = await supabase
        .from('runs')
        .insert({
          company_id: companyId,
          name: data.runName,
          fiscal_year_start: data.fiscalYearStart,
          fiscal_year_end: data.fiscalYearEnd,
          created_by: user.id,
          status: 'draft',
        })
        .select('id')
        .single();

      if (runError) throw runError;
      return run;
    },
    onSuccess: (run) => {
      queryClient.invalidateQueries({ queryKey: ['runs'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast.success('Run created successfully');
      navigate(`/runs/${run.id}`);
    },
    onError: (error: Error) => {
      toast.error(error.message || 'Failed to create run');
    },
  });

  const steps: { key: Step; title: string; icon: React.ElementType }[] = [
    { key: 'company', title: 'Company', icon: Building2 },
    { key: 'period', title: 'Period', icon: Calendar },
    { key: 'details', title: 'Details', icon: FileText },
  ];

  const canProceed = () => {
    switch (step) {
      case 'company':
        return formData.ticker.trim() && formData.companyName.trim();
      case 'period':
        return formData.fiscalYearStart <= formData.fiscalYearEnd;
      case 'details':
        return formData.runName.trim();
      default:
        return false;
    }
  };

  const handleNext = () => {
    if (step === 'company') setStep('period');
    else if (step === 'period') setStep('details');
    else if (step === 'details') {
      createRunMutation.mutate(formData);
    }
  };

  const handleBack = () => {
    if (step === 'period') setStep('company');
    else if (step === 'details') setStep('period');
  };

  const updateForm = (field: keyof FormData, value: string | number) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="mx-auto max-w-2xl animate-fade-in">
      {/* Header */}
      <div className="mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/runs')}
          className="mb-4 text-muted-foreground"
        >
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Runs
        </Button>
        <h1 className="text-3xl font-bold">New Analysis Run</h1>
        <p className="mt-1 text-muted-foreground">
          Create a new financial analysis run for a company
        </p>
      </div>

      {/* Progress Steps */}
      <div className="mb-8 flex items-center justify-between">
        {steps.map((s, index) => (
          <div key={s.key} className="flex items-center">
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors ${
                step === s.key
                  ? 'border-primary bg-primary text-primary-foreground'
                  : steps.findIndex((st) => st.key === step) > index
                  ? 'border-primary bg-primary/20 text-primary'
                  : 'border-border text-muted-foreground'
              }`}
            >
              <s.icon className="h-5 w-5" />
            </div>
            <span
              className={`ml-3 text-sm font-medium ${
                step === s.key ? 'text-foreground' : 'text-muted-foreground'
              }`}
            >
              {s.title}
            </span>
            {index < steps.length - 1 && (
              <div
                className={`mx-4 h-0.5 w-12 ${
                  steps.findIndex((st) => st.key === step) > index
                    ? 'bg-primary'
                    : 'bg-border'
                }`}
              />
            )}
          </div>
        ))}
      </div>

      {/* Form Card */}
      <Card className="glass-card">
        <CardHeader>
          <CardTitle>
            {step === 'company' && 'Company Information'}
            {step === 'period' && 'Analysis Period'}
            {step === 'details' && 'Run Details'}
          </CardTitle>
          <CardDescription>
            {step === 'company' && 'Enter the company ticker and basic information'}
            {step === 'period' && 'Select the fiscal years for analysis'}
            {step === 'details' && 'Name your analysis run'}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {step === 'company' && (
            <>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="ticker">Ticker Symbol *</Label>
                  <Input
                    id="ticker"
                    placeholder="AAPL"
                    value={formData.ticker}
                    onChange={(e) => updateForm('ticker', e.target.value.toUpperCase())}
                    className="bg-background font-mono"
                    maxLength={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cik">CIK (Optional)</Label>
                  <Input
                    id="cik"
                    placeholder="0000320193"
                    value={formData.cik}
                    onChange={(e) => updateForm('cik', e.target.value)}
                    className="bg-background font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    SEC Central Index Key for EDGAR lookups
                  </p>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name *</Label>
                <Input
                  id="companyName"
                  placeholder="Apple Inc."
                  value={formData.companyName}
                  onChange={(e) => updateForm('companyName', e.target.value)}
                  className="bg-background"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description (Optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Brief company description..."
                  value={formData.description}
                  onChange={(e) => updateForm('description', e.target.value)}
                  className="bg-background"
                  rows={3}
                />
              </div>
            </>
          )}

          {step === 'period' && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fiscalYearStart">Start Year</Label>
                <Input
                  id="fiscalYearStart"
                  type="number"
                  min={2000}
                  max={currentYear}
                  value={formData.fiscalYearStart}
                  onChange={(e) => updateForm('fiscalYearStart', parseInt(e.target.value))}
                  className="bg-background font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fiscalYearEnd">End Year</Label>
                <Input
                  id="fiscalYearEnd"
                  type="number"
                  min={2000}
                  max={currentYear}
                  value={formData.fiscalYearEnd}
                  onChange={(e) => updateForm('fiscalYearEnd', parseInt(e.target.value))}
                  className="bg-background font-mono"
                />
              </div>
              <div className="sm:col-span-2">
                <p className="text-sm text-muted-foreground">
                  Select the fiscal year range for SEC filing analysis. Recommended: 3-5 years of
                  historical data.
                </p>
              </div>
            </div>
          )}

          {step === 'details' && (
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="runName">Run Name *</Label>
                <Input
                  id="runName"
                  placeholder={`${formData.ticker} FY${formData.fiscalYearStart}-${formData.fiscalYearEnd} Analysis`}
                  value={formData.runName}
                  onChange={(e) => updateForm('runName', e.target.value)}
                  className="bg-background"
                />
                <p className="text-xs text-muted-foreground">
                  A descriptive name to identify this analysis run
                </p>
              </div>

              {/* Summary */}
              <div className="rounded-lg border border-border bg-muted/30 p-4">
                <h4 className="mb-3 font-medium">Summary</h4>
                <dl className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Company</dt>
                    <dd className="font-medium">
                      {formData.ticker} - {formData.companyName}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-muted-foreground">Period</dt>
                    <dd className="font-mono">
                      FY{formData.fiscalYearStart} - FY{formData.fiscalYearEnd}
                    </dd>
                  </div>
                  {formData.cik && (
                    <div className="flex justify-between">
                      <dt className="text-muted-foreground">CIK</dt>
                      <dd className="font-mono">{formData.cik}</dd>
                    </div>
                  )}
                </dl>
              </div>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-4">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={step === 'company'}
              className={step === 'company' ? 'invisible' : ''}
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back
            </Button>
            <Button
              onClick={handleNext}
              disabled={!canProceed() || createRunMutation.isPending}
            >
              {createRunMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : step === 'details' ? (
                'Create Run'
              ) : (
                <>
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
