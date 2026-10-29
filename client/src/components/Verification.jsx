import { useRef } from 'react';
import classNames from 'classnames';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CircleAlert, CircleCheck, Circle, Download, FileText, Upload } from 'lucide-react';
import { api, saveFile } from '@/lib/api';
import { formatDate } from '@/lib/format';
import { CERTIFICATE_ACCEPT, certificateProblem, certificateType, formatSize } from '@/lib/certificate';
import { Button, Card, FormError, useToast } from '@/components/ui';

// The certificate on file: its name and size, a download, and (while the
// application is open) a way to send a new one.
export function CertificateFile({ profile, canReplace = false }) {
  const toast = useToast();
  const queryClient = useQueryClient();
  const input = useRef(null);
  const { certificate } = profile;

  const upload = useMutation({
    mutationFn: async (file) => {
      const problem = certificateProblem(file);
      if (problem) throw new Error(problem);
      return api.upload('/professionals/me/certificate', file, certificateType(file));
    },
    onSuccess: (saved) => {
      // An application sent back for changes goes back to the team with it
      queryClient.setQueryData(['professionals', 'me'], {
        ...profile,
        certificate: saved,
        ...(profile.status === 'rejected' && { status: 'pending', reviewNote: undefined }),
      });
      toast(certificate ? 'Certificate replaced' : 'Certificate uploaded');
    },
  });
  const download = useMutation({
    mutationFn: () => api.download('/professionals/me/certificate'),
    onSuccess: (blob) => saveFile(blob, certificate.filename),
    onError: (error) => toast(error.message, 'error'),
  });

  const choose = () => {
    upload.reset();
    input.current.click();
  };

  return (
    <div className="space-y-3">
      {certificate && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl bg-muted px-4 py-3">
          <FileText className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden="true" />
          <p className="min-w-0 flex-1">
            <span className="block break-words font-semibold">{certificate.filename}</span>
            <span className="text-sm text-muted-foreground">{formatSize(certificate.size)} · uploaded {formatDate(certificate.uploadedAt)}</span>
          </p>
          <Button variant="ghost" size="sm" loading={download.isPending} onClick={() => download.mutate()}>
            <Download className="h-4 w-4" aria-hidden="true" /> Download
          </Button>
        </div>
      )}
      {canReplace && (
        <>
          <input
            ref={input}
            type="file"
            accept={CERTIFICATE_ACCEPT}
            className="sr-only"
            tabIndex={-1}
            aria-hidden="true"
            onChange={(event) => {
              const [file] = event.target.files;
              event.target.value = '';
              if (file) upload.mutate(file);
            }}
          />
          <Button variant={certificate ? 'outline' : 'primary'} size="sm" loading={upload.isPending} onClick={choose}>
            <Upload className="h-4 w-4" aria-hidden="true" /> {certificate ? 'Replace certificate' : 'Upload certificate'}
          </Button>
          <FormError error={upload.error} />
        </>
      )}
    </div>
  );
}

function Step({ state, title, children }) {
  const Icon = state === 'done' ? CircleCheck : state === 'problem' ? CircleAlert : Circle;
  return (
    <li className="flex gap-4">
      <Icon
        className={classNames('mt-0.5 h-6 w-6 shrink-0', {
          'text-primary': state === 'done' || state === 'now',
          'text-danger': state === 'problem',
          'text-border': state === 'later',
        })}
        aria-hidden="true"
      />
      <div className="min-w-0 flex-1">
        <p className={classNames('font-bold', state === 'later' && 'text-muted-foreground')}>
          {title}
          <span className="sr-only">: {{ done: 'done', now: 'to do now', problem: 'needs changes', later: 'not yet' }[state]}</span>
        </p>
        {children && <div className="mt-1 text-muted-foreground">{children}</div>}
      </div>
    </li>
  );
}

// What is left before a therapist or peer counsellor is listed, with the
// certificate upload where it belongs in that list.
export function VerificationSteps({ profile, email }) {
  const hasCertificate = !!profile.certificate;
  const rejected = profile.status === 'rejected';
  return (
    <Card className="mb-8">
      <h2 className="text-xl">Getting verified</h2>
      <p className="mt-1 text-muted-foreground">
        You can look around and set up your profile and hours now. People can find and book you once we have checked your certificate.
      </p>
      <ol className="mt-6 space-y-6">
        <Step state="done" title="Your details are in">
          Sent {formatDate(profile.createdAt)}. You can change them under Profile and hours.
        </Step>
        <Step state={hasCertificate ? 'done' : 'now'} title="Upload your certificate">
          <p className="mb-3">
            Your licence or practising certificate, or for peer counsellors your training certificate: a PDF or a clear photo (JPEG or PNG), up to 5 MB.
            Only you and the Healing Hive team can see it.
          </p>
          <CertificateFile profile={profile} canReplace />
        </Step>
        <Step
          state={rejected ? 'problem' : hasCertificate ? 'now' : 'later'}
          title={rejected ? 'Your application needs changes' : 'Our team checks your details'}
        >
          {rejected
            ? <><p className="text-foreground">{profile.reviewNote || 'Please review your details and send them again.'}</p><p className="mt-1">Fix your details under Profile and hours, or upload a new certificate, and it comes back to us.</p></>
            : hasCertificate
              ? `We're checking your details and certificate. We'll email ${email} as soon as there's a decision.`
              : 'This starts as soon as your certificate is in.'}
        </Step>
        <Step state="later" title="You're listed and can take bookings">
          Your profile appears in Find support, and people can book the times you set.
        </Step>
      </ol>
    </Card>
  );
}
