import { Link } from 'react-router-dom';
import PageHeader from '../components/PageHeader.jsx';

export default function NotFoundPage() {
  return (
    <>
      <PageHeader
        eyebrow="404"
        title="Page not found"
        description="That route doesn't exist in GigShift yet."
      />
      <p>
        <Link to="/">← Back to Plan</Link>
      </p>
    </>
  );
}
