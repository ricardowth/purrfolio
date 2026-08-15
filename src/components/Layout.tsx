import { useState, type ReactNode } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  Cat,
  CalendarDays,
  FolderOpen,
  LayoutDashboard,
  Menu,
  Moon,
  Pill,
  Scale,
  Settings,
  ShoppingBasket,
  Soup,
  Sun,
  Syringe,
  Users,
  Wallet,
  Bug,
  X,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { useTheme } from '@/lib/theme';
import { LANGS, useI18n } from '@/lib/i18n';
import type { StringKey } from '@/lib/strings';
import { fileUrl } from '@/lib/api';
import { cx, EmptyState } from '@/components/ui';

interface NavItem {
  to: string;
  label: StringKey;
  icon: LucideIcon;
}

const NAV: { heading: StringKey; items: NavItem[] }[] = [
  {
    heading: 'nav.overview',
    items: [
      { to: '/', label: 'nav.dashboard', icon: LayoutDashboard },
      { to: '/health', label: 'nav.healthMap', icon: Activity },
      { to: '/costs', label: 'nav.costs', icon: Wallet },
    ],
  },
  {
    heading: 'nav.records',
    items: [
      { to: '/appointments', label: 'nav.appointments', icon: CalendarDays },
      { to: '/vaccinations', label: 'nav.vaccinations', icon: Syringe },
      { to: '/medications', label: 'nav.medications', icon: Pill },
      { to: '/deworming', label: 'nav.deworming', icon: Bug },
      { to: '/food', label: 'nav.food', icon: Soup },
      { to: '/supplies', label: 'nav.supplies', icon: ShoppingBasket },
      { to: '/weight', label: 'nav.weight', icon: Scale },
      { to: '/journal', label: 'nav.journal', icon: BookOpen },
      { to: '/documents', label: 'nav.documents', icon: FolderOpen },
    ],
  },
  {
    heading: 'nav.people',
    items: [
      // Care & sitters is hidden from the menu for now. Its routes still work, so
      // existing records and the care sheet stay reachable by URL.
      { to: '/contacts', label: 'nav.contacts', icon: Users },
    ],
  },
  {
    heading: 'nav.manage',
    items: [
      { to: '/pets', label: 'nav.pets', icon: Cat },
      { to: '/settings', label: 'nav.settings', icon: Settings },
    ],
  },
];

/** Two-way toggle between Portuguese and English, beside the theme switch. */
function LanguageSwitcher() {
  const { lang, setLang, t } = useI18n();

  return (
    <div
      role="group"
      aria-label={t('nav.language')}
      className="inline-flex overflow-hidden rounded-lg border border-stone-300 text-xs dark:border-stone-700"
    >
      {LANGS.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => setLang(option.value)}
          aria-pressed={lang === option.value}
          title={option.label}
          className={cx(
            'cursor-pointer px-2 py-1.5 font-semibold transition-colors',
            lang === option.value
              ? 'bg-amber-600 text-white'
              : 'bg-white text-stone-500 hover:text-stone-800 dark:bg-stone-900 dark:text-stone-400 dark:hover:text-stone-100',
          )}
        >
          {option.short}
        </button>
      ))}
    </div>
  );
}

function PetAvatar({ photo, name, className }: { photo?: string; name: string; className?: string }) {
  if (photo) {
    return <img src={fileUrl(photo)} alt={name} className={cx('rounded-full object-cover', className)} />;
  }
  return (
    <span
      className={cx(
        'flex items-center justify-center rounded-full bg-amber-100 font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300',
        className,
      )}
    >
      {name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function PetSwitcher() {
  const { pets, pet, selectPet } = useData();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (pets.length === 0) {
    return (
      <button type="button" className="btn-ghost" onClick={() => navigate('/pets')}>
        <Cat className="size-4" />
        {t('nav.addAPet')}
      </button>
    );
  }

  return (
    <div className="flex items-center gap-2">
      {pet && <PetAvatar photo={pet.photo} name={pet.name} className="size-8" />}
      <select
        value={pet?.id ?? ''}
        onChange={(e) => selectPet(e.target.value)}
        aria-label={t('nav.selectedPet')}
        className="input w-auto py-1.5 font-medium"
      >
        {pets.map((option) => (
          <option key={option.id} value={option.id}>
            {option.name}
          </option>
        ))}
      </select>
    </div>
  );
}

export function Layout({ children }: { children: ReactNode }) {
  const { theme, toggle } = useTheme();
  const { t } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  const sidebar = (
    <nav className="flex h-full flex-col gap-6 overflow-y-auto p-4">
      <div className="flex items-center gap-2 px-2 pt-1">
        <span className="text-2xl">🐈</span>
        <span className="text-lg font-bold tracking-tight text-stone-900 dark:text-stone-50">Purrfolio</span>
      </div>

      {NAV.map((group) => (
        <div key={group.heading}>
          <p className="mb-1.5 px-2 text-[11px] font-semibold tracking-wider text-stone-400 uppercase">{t(group.heading)}</p>
          <ul className="space-y-0.5">
            {group.items.map((item) => (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  end={item.to === '/'}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    cx(
                      'flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium transition-colors',
                      isActive
                        ? 'bg-amber-100 text-amber-900 dark:bg-amber-950/60 dark:text-amber-200'
                        : 'text-stone-600 hover:bg-stone-200/60 hover:text-stone-900 dark:text-stone-400 dark:hover:bg-stone-800 dark:hover:text-stone-100',
                    )
                  }
                >
                  <item.icon className="size-4 shrink-0" />
                  {t(item.label)}
                </NavLink>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div className="min-h-screen lg:flex">
      <aside className="no-print sticky top-0 hidden h-screen w-60 shrink-0 border-r border-stone-200 bg-white lg:block dark:border-stone-800 dark:bg-stone-900">
        {sidebar}
      </aside>

      {menuOpen && (
        <div className="no-print fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-stone-900/50" onClick={() => setMenuOpen(false)} aria-hidden />
          <aside className="relative h-full w-64 border-r border-stone-200 bg-white dark:border-stone-800 dark:bg-stone-900">
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              className="btn-subtle absolute top-3 right-2 px-2 py-1"
              aria-label={t('nav.closeMenu')}
            >
              <X className="size-4" />
            </button>
            {sidebar}
          </aside>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="no-print sticky top-0 z-30 flex items-center gap-3 border-b border-stone-200 bg-white/90 px-4 py-2.5 backdrop-blur dark:border-stone-800 dark:bg-stone-900/90">
          <button type="button" className="btn-subtle px-2 py-1 lg:hidden" onClick={() => setMenuOpen(true)} aria-label={t('nav.openMenu')}>
            <Menu className="size-5" />
          </button>
          <div className="flex-1" />
          <PetSwitcher />
          <LanguageSwitcher />
          <button type="button" className="btn-subtle px-2 py-1.5" onClick={toggle} aria-label={t('nav.toggleDark')}>
            {theme === 'dark' ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}

/**
 * Most pages are meaningless without a pet, so they render this prompt instead
 * of an empty shell until one exists.
 */
export function RequirePet({ children }: { children: ReactNode }) {
  const { pet, loading } = useData();
  const { t } = useI18n();
  const navigate = useNavigate();

  if (loading) return null;
  if (pet) return <>{children}</>;

  return (
    <EmptyState
      icon={Cat}
      title={t('requirePet.title')}
      message={t('requirePet.message')}
      action={
        <button type="button" className="btn-primary" onClick={() => navigate('/pets')}>
          {t('requirePet.action')}
        </button>
      }
    />
  );
}
