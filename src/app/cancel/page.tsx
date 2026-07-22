import Link from 'next/link';

export default function CancelPage() {
  return (
    <div className="status error">
      <h1>Payment canceled</h1>
      <p>Your checkout was canceled and you have not been charged.</p>
      <Link className="link" href="/">
        ← Back to store
      </Link>
    </div>
  );
}
