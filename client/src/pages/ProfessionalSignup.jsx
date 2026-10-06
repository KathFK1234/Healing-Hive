import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import classNames from 'classnames';
import { HeartHandshake, Users, Building2, Check } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Button, Field, Input } from '@/components/ui';
import { AuthShell } from '@/components/AuthShell';
import { PasswordInput } from '@/components/PasswordInput';
import { ProfessionalForm } from '@/components/ProfessionalForm';
import { usePageTitle } from '@/hooks/usePageTitle';

const kinds = [
  { value: 'therapist', icon: HeartHandshake, title: 'Licensed therapist', text: 'A registered mental health professional with a valid licence.' },
  { value: 'peer', icon: Users, title: 'Peer counsellor', text: 'A trained peer supporter who can relate to what young people go through.' },
  { value: 'institution', icon: Building2, title: 'Institution', text: 'A clinic or organisation with therapists or counsellors on staff.' },
];

const stepNames = ['Who you are', 'Your account', 'Your practice'];

// Sign-up for professionals is its own three-step flow. Nothing is created
// until the last step, so leaving half-way leaves nothing behind.
const ProfessionalSignup = () => {
  usePageTitle('Join as a professional');
  const { registerProfessional } = useAuth();
  const [step, setStep] = useState(0);
  const [type, setType] = useState(null);
  const [account, setAccount] = useState({ fullName: '', email: '', phone: '', password: '' });
  const set = (key) => (event) => setAccount({ ...account, [key]: event.target.value });

  // On success the route guard notices the signed-in applicant and takes them
  // to their application page.
  const mutation = useMutation({
    mutationFn: (application) => registerProfessional({ ...account, application }),
    // Account problems (an email already in use, say) are fixed on step 2
    onError: (error) => {
      const accountFields = ['fullName', 'email', 'phone', 'password'];
      if (error.status === 409 || error.details?.some((detail) => accountFields.includes(detail.field))) setStep(1);
    },
  });

  const fieldError = (name) => mutation.error?.details?.find((detail) => detail.field === name)?.message;
  const accountReady = account.fullName.trim().length > 1 && /\S+@\S+\.\S+/.test(account.email) && account.phone.trim().length >= 9 && account.password.length >= 8;
  const isInstitution = type === 'institution';

  return (
    <AuthShell
      wide
      title="Join Healing Hive as a professional"
      description="Help young people in Kenya get quality mental health support."
      footer={
        <>
          <p>Already applied? <Link to="/login" className="font-semibold text-primary hover:underline">Sign in</Link></p>
          <p>Looking for support instead? <Link to="/signup" className="font-semibold text-primary hover:underline">Create a personal account</Link></p>
        </>
      }
    >
      <ol className="mb-10 flex items-center gap-2" aria-label="Progress">
        {stepNames.map((name, index) => (
          <li key={name} aria-current={index === step ? 'step' : undefined} className="flex flex-1 flex-col gap-2">
            <span className={classNames('h-1.5 rounded-full', index <= step ? 'bg-primary' : 'bg-border')} />
            <span className={classNames('flex items-center gap-1 text-sm font-semibold', index === step ? 'text-foreground' : 'text-muted-foreground')}>
              {index < step && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
              <span className="sr-only">Step {index + 1}: </span>{name}
            </span>
          </li>
        ))}
      </ol>

      {step === 0 && (
        <div className="space-y-4">
          <h2 className="text-xl">How will you be joining?</h2>
          {kinds.map(({ value, icon: Icon, title, text }) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={classNames(
                'flex w-full items-start gap-4 rounded-2xl border-2 p-5 text-left transition-colors',
                type === value ? 'border-primary bg-primary-soft' : 'border-border hover:bg-muted',
              )}
            >
              <Icon className="mt-1 h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
              <span>
                <span className="block text-lg font-bold">{title}</span>
                <span className="block text-muted-foreground">{text}</span>
              </span>
            </button>
          ))}
          <Button size="lg" className="mt-4" disabled={!type} onClick={() => setStep(1)}>Continue</Button>
        </div>
      )}

      {step === 1 && (
        <form className="space-y-5" onSubmit={(event) => { event.preventDefault(); setStep(2); }}>
          <h2 className="text-xl">{isInstitution ? 'Who should we contact?' : 'Your account'}</h2>
          {mutation.error?.status === 409 && (
            <p role="alert" className="rounded-2xl bg-danger-soft px-5 py-4 font-semibold text-danger">
              An account with that email already exists. <Link to="/login" className="underline">Sign in</Link> and apply from Settings instead.
            </p>
          )}
          <Field label={isInstitution ? 'Your full name' : 'Full name, as on your licence or ID'} error={fieldError('fullName')}>
            {(field) => <Input {...field} autoComplete="name" required value={account.fullName} onChange={set('fullName')} />}
          </Field>
          <Field label="Work email" error={fieldError('email')}>
            {(field) => <Input {...field} type="email" autoComplete="email" required placeholder="you@example.com" value={account.email} onChange={set('email')} />}
          </Field>
          <Field label="Phone number" hint="We may call to verify your details. It is not shown publicly." error={fieldError('phone')}>
            {(field) => <Input {...field} type="tel" autoComplete="tel" required placeholder="0712 345 678" value={account.phone} onChange={set('phone')} />}
          </Field>
          <Field label="Password" hint="At least 8 characters." error={fieldError('password')}>
            {(field) => <PasswordInput {...field} autoComplete="new-password" required minLength={8} value={account.password} onChange={set('password')} />}
          </Field>
          <div className="flex flex-wrap gap-3 pt-2">
            <Button variant="outline" size="lg" onClick={() => setStep(0)}>Back</Button>
            <Button type="submit" size="lg" disabled={!accountReady}>Continue</Button>
          </div>
        </form>
      )}

      {step === 2 && (
        <ProfessionalForm
          key={type}
          mode="apply"
          type={type}
          mutation={mutation}
          submitLabel="Send application"
          onBack={() => setStep(1)}
        />
      )}
    </AuthShell>
  );
};

export default ProfessionalSignup;
