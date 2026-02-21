import { Nav } from "@/components/Nav";

export default function AdminAnalytics() {
  return (
    <div className="container">
      <h2>Admin Analytics</h2>
      <Nav role="admin" />
      <p className="muted">Implement dashboards: clicks/checkins by zone, top venues, promo performance, voting filters.</p>
    </div>
  );
}
