import { VenueSetupGuard } from "@/components/VenueSetupGuard";

export default function VenueLayout({ children }: { children: React.ReactNode }) {
  return (
    <div data-role="venue">
      <VenueSetupGuard />
      {children}
    </div>
  );
}
