import { Nav } from "@/components/Nav";

export default function Summary() {
  return (
    <div className="container">
      <h2>Night Summary</h2>
      <Nav role="u" />
      <p className="muted">Shows venues visited + promos claimed + orders. Generated at 2:00am. Stub.</p>
    </div>
  );
}
