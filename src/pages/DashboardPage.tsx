import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  Bug,
  CalendarClock,
  CalendarDays,
  Cake,
  Pill,
  Scale,
  Soup,
  Syringe,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { CatBody } from '@/anatomy/CatBody';
import { REGIONS_BY_ID, describeParts } from '@/anatomy/regions';
import { Badge, EmptyState, ISSUE_STATUS_TONE, PageHeader, SEVERITY_TONE, cx } from '@/components/ui';
import { fileUrl } from '@/lib/api';
import { useI18n } from '@/lib/i18n';
import {
  activeMedications,
  currentFoods,
  currentMonth,
  dueDewormings,
  dueVaccinations,
  openIssues,
  pendingFollowUps,
  upcomingAppointments,
  weightTrend,
} from '@/lib/derive';
import { daysFromToday, titleCase, useFormat } from '@/lib/format';

function StatCard({ icon: Icon, label, value, sub, to, tone }: { icon: LucideIcon; label: string; value: string; sub?: string; to: string; tone?: string }) {
  return (
    <Link to={to} className="card block p-4 transition hover:border-amber-400 hover:shadow-md dark:hover:border-amber-700">
      <div className="flex items-center gap-2 text-stone-500">
        <Icon className="size-4" />
        <span className="text-xs font-semibold tracking-wide uppercase">{label}</span>
      </div>
      <p className={cx('mt-2 text-2xl font-bold', tone ?? 'text-stone-900 dark:text-stone-50')}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-stone-500">{sub}</p>}
    </Link>
  );
}

function Panel({ title, icon: Icon, to, linkLabel, children }: { title: string; icon: LucideIcon; to: string; linkLabel: string; children: React.ReactNode }) {
  return (
    <section className="card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
          <Icon className="size-4 text-stone-400" />
          {title}
        </h2>
        <Link to={to} className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-500">
          {linkLabel}
        </Link>
      </div>
      {children}
    </section>
  );
}

const Nothing = ({ children }: { children: React.ReactNode }) => <p className="text-sm text-stone-500 dark:text-stone-400">{children}</p>;

export default function DashboardPage() {
  const { pet, forPet } = useData();
  const i18n = useI18n();
  const { t, tEnum } = i18n;
  const { formatAge, formatDate, formatDateTime, formatMonth, relativeDays } = useFormat();

  const issues = forPet('issues');
  const appointments = forPet('appointments');
  const vaccinations = forPet('vaccinations');
  const medications = forPet('medications');
  const dewormings = forPet('dewormings');
  const weights = forPet('weights');
  const foods = forPet('foods');
  const journal = forPet('journal');

  const open = openIssues(issues);
  // There is no organ toggle on the dashboard, so an issue on the bladder or a
  // kidney would be invisible here. Reveal the overlay only when it has
  // something to say, keeping the summary map uncluttered otherwise.
  const showInternal = useMemo(
    () => issues.some((issue) => issue.parts.some((part) => REGIONS_BY_ID.get(part.bodyPart)?.internal)),
    [issues],
  );
  const due = dueVaccinations(vaccinations);
  const overdue = due.filter((vaccination) => (daysFromToday(vaccination.nextDueDate) ?? 0) < 0);
  const upcoming = upcomingAppointments(appointments);
  const followUps = pendingFollowUps(appointments);
  const dueDeworm = dueDewormings(dewormings);
  const meds = activeMedications(medications);
  const trend = weightTrend(weights);

  /** One merged, date-sorted stream of everything that happened recently. */
  const activity = useMemo(() => {
    const entries: { date: string; label: string; detail: string; to: string; icon: LucideIcon }[] = [
      ...appointments.map((row) => ({
        date: row.dateTime.slice(0, 10),
        label: t('dash.activityAppointment', { type: tEnum('appointmentType', row.type) }),
        detail: row.outcome || row.reason || tEnum('appointmentStatus', row.status),
        to: '/appointments',
        icon: CalendarDays,
      })),
      ...vaccinations.map((row) => ({
        date: row.date,
        label: t('dash.activityVaccination', { name: row.name }),
        detail: row.notes,
        to: '/vaccinations',
        icon: Syringe,
      })),
      ...weights.map((row) => ({
        date: row.date,
        label: t('dash.activityWeighed', { kg: row.kg }),
        detail: row.notes,
        to: '/weight',
        icon: Scale,
      })),
      ...journal.map((row) => ({
        date: row.date,
        label: row.title || t('dash.activityJournal'),
        detail: row.text,
        to: '/journal',
        icon: BookOpen,
      })),
      ...issues.map((row) => ({
        date: row.onsetDate,
        label: t('dash.activityIssue', { title: row.title }),
        detail: describeParts(i18n, row.parts),
        to: `/issues/${row.id}`,
        icon: Activity,
      })),
    ];
    const upToNow = new Date().toISOString().slice(0, 10);
    return entries
      .filter((entry) => entry.date && entry.date <= upToNow)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }, [appointments, vaccinations, weights, journal, issues, i18n, t, tEnum]);

  if (!pet) return null;

  const birthdayIn = pet.birthDate
    ? (() => {
        const born = new Date(`${pet.birthDate}T00:00:00`);
        const next = new Date();
        next.setHours(0, 0, 0, 0);
        next.setMonth(born.getMonth(), born.getDate());
        if (next < new Date(new Date().setHours(0, 0, 0, 0))) next.setFullYear(next.getFullYear() + 1);
        return daysFromToday(next.toISOString().slice(0, 10));
      })()
    : null;

  return (
    <>
      <PageHeader title={t('dash.hello', { name: pet.name })} subtitle={t('dash.subtitle')} />

      <div className="card mb-6 flex flex-wrap items-center gap-4 p-4">
        {pet.photo ? (
          <img src={fileUrl(pet.photo)} alt={pet.name} className="size-20 rounded-full object-cover" />
        ) : (
          <span className="flex size-20 items-center justify-center rounded-full bg-amber-100 text-2xl font-bold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
            {pet.name.slice(0, 1).toUpperCase()}
          </span>
        )}
        <div className="min-w-40 flex-1">
          <p className="text-lg font-semibold text-stone-900 dark:text-stone-50">{pet.name}</p>
          <p className="text-sm text-stone-500">
            {[titleCase(pet.species), pet.breed, pet.colour].filter(Boolean).join(' · ')} · {formatAge(pet.birthDate)}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {pet.neutered && <Badge tone="blue">{t('dash.neutered')}</Badge>}
            {pet.allergies.map((allergy) => (
              <Badge key={allergy} tone="red">
                {t('dash.allergy', { name: allergy })}
              </Badge>
            ))}
            {birthdayIn !== null && birthdayIn <= 30 && (
              <Badge tone="violet">
                <Cake className="size-3" />{' '}
                {t('dash.birthday', {
                  when: relativeDays(new Date(Date.now() + birthdayIn * 86_400_000).toISOString().slice(0, 10)),
                })}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          label={t('dash.openIssues')}
          value={String(open.length)}
          sub={open.length ? open.map((issue) => issue.title).slice(0, 2).join(', ') : t('dash.nothingTracked')}
          to="/health"
          tone={open.some((issue) => issue.severity === 'high') ? 'text-red-600 dark:text-red-400' : undefined}
        />
        <StatCard
          icon={Syringe}
          label={t('dash.vaccinationsDue')}
          value={String(due.length)}
          sub={
            overdue.length
              ? t('dash.overdueCount', { n: overdue.length })
              : due.length
                ? t('dash.nextOn', { date: formatDate(due[0].nextDueDate) })
                : t('dash.allUpToDate')
          }
          to="/vaccinations"
          tone={overdue.length ? 'text-red-600 dark:text-red-400' : undefined}
        />
        <StatCard
          icon={Pill}
          label={t('dash.activeMedication')}
          value={String(meds.length)}
          sub={meds.length ? meds.map((medication) => medication.name).slice(0, 2).join(', ') : t('dash.noneRightNow')}
          to="/medications"
        />
        <StatCard
          icon={Scale}
          label={t('weight.title')}
          value={trend ? `${trend.latest.kg} kg` : '—'}
          sub={
            trend?.deltaKg
              ? t('dash.sinceLastWeighIn', { delta: `${trend.deltaKg > 0 ? '+' : ''}${trend.deltaKg}` })
              : trend
                ? t('dash.recordedOn', { date: formatDate(trend.latest.date) })
                : t('dash.noWeighIns')
          }
          to="/weight"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title={t('dash.upcomingAppointments')} icon={CalendarDays} to="/appointments" linkLabel={t('dash.allAppointments')}>
            {upcoming.length === 0 ? (
              <Nothing>{t('dash.nothingScheduled')}</Nothing>
            ) : (
              <ul className="space-y-3">
                {upcoming.slice(0, 4).map((appointment) => (
                  <li key={appointment.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-stone-800 dark:text-stone-200">{tEnum('appointmentType', appointment.type)}</p>
                      <p className="text-stone-500">
                        {issues
                          .filter((issue) => appointment.issueIds.includes(issue.id))
                          .map((issue) => issue.title)
                          .join(', ') ||
                          appointment.reason ||
                          t('dash.noReason')}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-stone-700 dark:text-stone-300">{formatDateTime(appointment.dateTime)}</p>
                      <p className="text-xs text-stone-500">{relativeDays(appointment.dateTime)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {due.length > 0 && (
            <Panel title={t('dash.vaccinationsComingUp')} icon={Syringe} to="/vaccinations" linkLabel={t('dash.allVaccinations')}>
              <ul className="space-y-2 text-sm">
                {due.map((vaccination) => {
                  const days = daysFromToday(vaccination.nextDueDate) ?? 0;
                  return (
                    <li key={vaccination.id} className="flex items-center justify-between gap-3">
                      <span className="font-medium text-stone-800 dark:text-stone-200">{vaccination.name}</span>
                      <Badge tone={days < 0 ? 'red' : 'amber'}>
                        {days < 0 ? t('dash.overdue') : t('dash.due')} {relativeDays(vaccination.nextDueDate)}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}

          {followUps.length > 0 && (
            <Panel title={t('dash.followUpsToBook')} icon={CalendarClock} to="/appointments" linkLabel={t('dash.allAppointments')}>
              <ul className="space-y-2 text-sm">
                {followUps.map((appointment) => {
                  const days = daysFromToday(appointment.followUpDate) ?? 0;
                  return (
                    <li key={appointment.id} className="flex items-baseline justify-between gap-3">
                      <span>
                        <span className="font-medium text-stone-800 dark:text-stone-200">{tEnum('appointmentType', appointment.type)}</span>
                        <span className="block text-xs text-stone-500">
                          {t('dash.followUpFrom', { date: formatDate(appointment.dateTime) })}
                        </span>
                      </span>
                      <Badge tone={days < 0 ? 'red' : days <= 30 ? 'amber' : 'neutral'}>
                        {relativeDays(appointment.followUpDate)}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}

          {dueDeworm.length > 0 && (
            <Panel title={t('dash.dewormingDue')} icon={Bug} to="/deworming" linkLabel={t('deworm.title')}>
              <ul className="space-y-2 text-sm">
                {dueDeworm.map((row) => (
                  <li key={row.id} className="flex items-center justify-between gap-3">
                    <span className="font-medium text-stone-800 dark:text-stone-200">{row.product}</span>
                    <Badge tone={row.nextMonth < currentMonth() ? 'red' : 'amber'}>{formatMonth(row.nextMonth)}</Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {/* Care & sitters is hidden for now, so its dashboard panel is too. */}

          <Panel title={t('dash.recentActivity')} icon={BookOpen} to="/journal" linkLabel={t('journal.title')}>
            {activity.length === 0 ? (
              <Nothing>{t('dash.nothingRecordedYet')}</Nothing>
            ) : (
              <ol className="space-y-3 border-l border-stone-200 pl-4 dark:border-stone-800">
                {activity.map((entry, index) => (
                  <li key={`${entry.to}-${index}`} className="relative">
                    <span className="absolute top-1.5 -left-[21px] size-2 rounded-full bg-stone-300 ring-4 ring-white dark:bg-stone-600 dark:ring-stone-900" />
                    <Link to={entry.to} className="group flex items-baseline justify-between gap-3 text-sm">
                      <span>
                        <span className="font-medium text-stone-800 group-hover:text-amber-700 dark:text-stone-200 dark:group-hover:text-amber-500">
                          {entry.label}
                        </span>
                        {entry.detail && <span className="ml-1 line-clamp-1 text-stone-500">{entry.detail}</span>}
                      </span>
                      <span className="shrink-0 text-xs text-stone-400">{formatDate(entry.date)}</span>
                    </Link>
                  </li>
                ))}
              </ol>
            )}
          </Panel>
        </div>

        <div className="space-y-5">
          <section className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-stone-700 dark:text-stone-300">
                <Activity className="size-4 text-stone-400" />
                {t('health.title')}
              </h2>
              <Link to="/health" className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-500">
                {t('common.open')}
              </Link>
            </div>
            <CatBody issues={issues} showInternal={showInternal} showOffDiagram />
          </section>

          {open.length > 0 && (
            <Panel title={t('dash.openIssues')} icon={Activity} to="/health" linkLabel={t('health.title')}>
              <ul className="space-y-2 text-sm">
                {open.map((issue) => (
                  <li key={issue.id}>
                    <Link to={`/issues/${issue.id}`} className="flex items-start justify-between gap-2 hover:underline">
                      <span>
                        <span className="font-medium text-stone-800 dark:text-stone-200">{issue.title}</span>
                        <span className="block text-xs text-stone-500">{describeParts(i18n, issue.parts)}</span>
                      </span>
                      <Badge tone={issue.status === 'monitoring' ? ISSUE_STATUS_TONE.monitoring : SEVERITY_TONE[issue.severity]}>
                        {issue.status === 'monitoring' ? tEnum('issueStatus', 'monitoring') : tEnum('severity', issue.severity)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title={t('dash.currentFood')} icon={Soup} to="/food" linkLabel={t('dash.allFood')}>
            {currentFoods(foods).length === 0 ? (
              <Nothing>{t('dash.noCurrentFood')}</Nothing>
            ) : (
              <ul className="space-y-2 text-sm">
                {currentFoods(foods).map((food) => (
                  <li key={food.id}>
                    <p className="font-medium text-stone-800 dark:text-stone-200">{[food.brand, food.product].filter(Boolean).join(' ')}</p>
                    <p className="text-stone-500">
                      {food.amountPerDay || '—'}
                      {food.timesPerDay ? ` · ${t('dash.perDay', { n: food.timesPerDay })}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {trend?.deltaKg !== null && trend?.deltaKg !== undefined && trend.deltaKg !== 0 && (
            <div className="card flex items-center gap-3 p-4">
              {trend.deltaKg > 0 ? <TrendingUp className="size-5 text-orange-500" /> : <TrendingDown className="size-5 text-sky-500" />}
              <p className="text-sm text-stone-600 dark:text-stone-400">
                {trend.deltaKg > 0
                  ? t('dash.gained', { n: Math.abs(trend.deltaKg) })
                  : t('dash.lost', { n: Math.abs(trend.deltaKg) })}
              </p>
            </div>
          )}
        </div>
      </div>

      {activity.length === 0 && issues.length === 0 && appointments.length === 0 && (
        <div className="mt-6">
          <EmptyState title={t('dash.emptyTitle')} message={t('dash.emptyMessage')} />
        </div>
      )}
    </>
  );
}
