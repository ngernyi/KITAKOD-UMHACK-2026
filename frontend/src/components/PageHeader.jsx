import './PageHeader.css';

export default function PageHeader({ eyebrow, title, description, actions }) {
  return (
    <header className="pageheader">
      <div>
        {eyebrow ? <p className="pageheader__eyebrow">{eyebrow}</p> : null}
        <h1 className="pageheader__title">{title}</h1>
        {description ? <p className="pageheader__description">{description}</p> : null}
      </div>
      {actions ? <div className="pageheader__actions">{actions}</div> : null}
    </header>
  );
}
