import './Notice.css';

/**
 * Inline banner for informational / warning / error states.
 * Tones: info | warn | danger | success
 */
export default function Notice({ tone = 'info', title, children, action }) {
  return (
    <div className={`notice notice--${tone}`} role={tone === 'danger' ? 'alert' : 'status'}>
      <div className="notice__body">
        {title ? <strong className="notice__title">{title}</strong> : null}
        {children ? <span className="notice__text">{children}</span> : null}
      </div>
      {action ? <div className="notice__action">{action}</div> : null}
    </div>
  );
}
