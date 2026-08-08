export function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="rounded-2xl bg-warning-bg px-4 py-3 text-center text-sm font-semibold text-warning">
      ⚠️ {message}
    </div>
  );
}
