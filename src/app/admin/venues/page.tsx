import { Nav } from "@/components/Nav";

export default function VenuesAdmin() {
  return (
    <div className="container">
      <h2>Venues</h2>
      <Nav role="admin" />
      <p className="muted">Implement: add/edit venues (requires municipality), set zone, set cutoff override.</p>
    </div>
  );
}
