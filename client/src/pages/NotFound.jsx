import { Button } from '@/components/ui';
import { LogoMark } from '@/components/layout/Logo';
import { usePageTitle } from '@/hooks/usePageTitle';

const NotFound = () => {
  usePageTitle('Page not found');
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <LogoMark className="mb-6 h-14 w-14" />
      <h1 className="text-3xl">We couldn't find that page</h1>
      <p className="mt-2 max-w-md text-muted-foreground">The link may be old, or the page may have moved. You're still in the right place.</p>
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <Button to="/">Go back home</Button>
        <Button to="/help" variant="outline">Get help now</Button>
      </div>
    </div>
  );
};

export default NotFound;
