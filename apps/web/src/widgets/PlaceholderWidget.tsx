export function PlaceholderWidget({ title }: { title: string }) {
  return (
    <div className="flex min-h-[200px] items-center justify-center bg-transparent p-8 text-white">
      <p className="text-sm opacity-80">
        {title} — widget parity build (see FEATURE_PARITY.md)
      </p>
    </div>
  );
}
