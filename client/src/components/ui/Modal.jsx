import { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { Button } from './Button';
import { FormError } from './Form';

// Built on the browser's <dialog>, which handles focus trapping, Escape to
// close and screen-reader semantics for us.
//
// Pass `dirty` while the dialog holds something unsaved (a journal entry,
// notes). A stray tap outside it, Escape or the close button then asks before
// throwing the text away. The dialog's own Cancel button still closes at once.
export function Modal({ open, onClose, title, children, footer, dirty = false }) {
  const ref = useRef(null);
  const [confirming, setConfirming] = useState(false);

  // Each time the dialog opens it starts without the question showing
  const [wasOpen, setWasOpen] = useState(open);
  if (open !== wasOpen) {
    setWasOpen(open);
    setConfirming(false);
  }

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  const requestClose = () => {
    if (dirty) setConfirming(true);
    else onClose();
  };

  return (
    <dialog
      ref={ref}
      // Escape: decide here instead of letting the browser close it
      onCancel={(event) => {
        event.preventDefault();
        requestClose();
      }}
      // Some browsers close on a second Escape regardless. If there is still
      // something unsaved, reopen and ask.
      onClose={() => {
        if (!open) return;
        if (dirty) {
          ref.current?.showModal();
          setConfirming(true);
        } else {
          onClose();
        }
      }}
      onClick={(event) => { if (event.target === ref.current) requestClose(); }}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-3xl border border-border bg-card p-0 text-foreground backdrop:bg-black/40"
    >
      {open && (
        <div className="flex max-h-[85vh] flex-col">
          <div className="flex items-center justify-between gap-4 px-6 pb-2 pt-6">
            <h2 className="text-lg">{title}</h2>
            <button type="button" onClick={requestClose} aria-label="Close" className="rounded-lg p-2 text-muted-foreground hover:bg-muted">
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
          <div className="overflow-y-auto px-6 py-4">{children}</div>
          {confirming && dirty ? (
            <div role="alert" className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-6 pb-6 pt-4">
              <p className="mr-auto font-semibold">Discard what you wrote?</p>
              <Button variant="outline" onClick={() => setConfirming(false)}>Keep editing</Button>
              <Button variant="danger" onClick={onClose}>Discard</Button>
            </div>
          ) : (
            footer && <div className="flex flex-wrap justify-end gap-2 px-6 pb-6 pt-2">{footer}</div>
          )}
        </div>
      )}
    </dialog>
  );
}

// "Are you sure?" before anything that can't be undone: deleting, cancelling,
// leaving. Shows the request's error inside, so a failure is seen where it happened.
export function ConfirmModal({ open, onClose, title, confirmLabel, cancelLabel = 'Keep it', onConfirm, loading, error, children }) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      footer={
        <>
          <Button variant="outline" onClick={onClose}>{cancelLabel}</Button>
          <Button variant="danger" loading={loading} onClick={onConfirm}>{confirmLabel}</Button>
        </>
      }
    >
      <div className="space-y-4">
        {children}
        <FormError error={error} />
      </div>
    </Modal>
  );
}
