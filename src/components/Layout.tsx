import { NavLink } from 'react-router-dom';
import { useStrings } from '../lib/i18n';

export default function Layout({ children }: { children: React.ReactNode }) {
  const { S } = useStrings();
  const tabs = [
    { to: '/', label: S.home, icon: '⛩️', end: true },
    { to: '/kana', label: S.kana, icon: 'あ' },
    { to: '/lessons', label: S.lessons, icon: '文' },
    { to: '/flashcards', label: S.flashcards, icon: '単' },
    { to: '/exam', label: S.exam, icon: '試' },
    { to: '/profile', label: S.profile, icon: '人' },
  ];
  return (
    <>
      <main>{children}</main>
      <nav className="bottom-nav">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) => (isActive ? 'active' : '')}
          >
            <span className="nav-icon">{t.icon}</span>
            <span>{t.label}</span>
          </NavLink>
        ))}
      </nav>
    </>
  );
}
