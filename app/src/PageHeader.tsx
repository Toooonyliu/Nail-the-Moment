import type { ReactNode } from 'react';
import Brand from './Brand';

/** The three main destinations share one title line and action area. */
export default function PageHeader({ title, actions, onTitlePress, className = '' }: {
  title: string;
  actions?: ReactNode;
  onTitlePress?: () => void;
  className?: string;
}) {
  return <div className={`app-page-header ${className}`}>
    <div className="app-page-brand"><Brand/></div>
    <h1 className="app-page-title" aria-label={title}>{onTitlePress
      ? <button aria-label="Your hand and prototype information" onClick={onTitlePress}>{title}</button>
      : title}</h1>
    <div className="app-page-actions">{actions}</div>
  </div>;
}
