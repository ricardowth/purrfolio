import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Activity,
  BookOpen,
  CalendarDays,
  Cake,
  Pill,
  Plane,
  Scale,
  Soup,
  Syringe,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { useData } from '@/store/DataContext';
import { CatBody } from '@/anatomy/CatBody';
import { describePart } from '@/anatomy/regions';
import { Badge, EmptyState, ISSUE_STATUS_TONE, PageHeader, SEVERITY_TONE, cx } from '@/components/ui';
import { fileUrl } from '@/lib/api';
import {
  activeCareEvents,
  activeMedications,
  currentFoods,
  dueVaccinations,
  openIssues,
  upcomingAppointments,
  weightTrend,
} from '@/lib/derive';
import { daysFromToday, formatAge, formatDate, formatDateTime, relativeDays, titleCase } from '@/lib/format';

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
  const [viewSide, setViewSide] = useState<'left' | 'right'>('left');

  const issues = forPet('issues');
  const appointments = forPet('appointments');
  const vaccinations = forPet('vaccinations');
  const medications = forPet('medications');
  const weights = forPet('weights');
  const foods = forPet('foods');
  const careEvents = forPet('careEvents');
  const journal = forPet('journal');

  const open = openIssues(issues);
  const due = dueVaccinations(vaccinations);
  const overdue = due.filter((vaccination) => (daysFromToday(vaccination.nextDueDate) ?? 0) < 0);
  const upcoming = upcomingAppointments(appointments);
  const meds = activeMedications(medications);
  const care = activeCareEvents(careEvents);
  const trend = weightTrend(weights);

  /** One merged, date-sorted stream of everything that happened recently. */
  const activity = useMemo(() => {
    const entries: { date: string; label: string; detail: string; to: string; icon: LucideIcon }[] = [
      ...appointments.map((row) => ({
        date: row.dateTime.slice(0, 10),
        label: `${titleCase(row.type)} appointment`,
        detail: row.outcome || row.reason || titleCase(row.status),
        to: '/appointments',
        icon: CalendarDays,
      })),
      ...vaccinations.map((row) => ({ date: row.date, label: `Vaccination — ${row.name}`, detail: row.notes, to: '/vaccinations', icon: Syringe })),
      ...weights.map((row) => ({ date: row.date, label: `Weighed ${row.kg} kg`, detail: row.notes, to: '/weight', icon: Scale })),
      ...journal.map((row) => ({ date: row.date, label: row.title || 'Journal entry', detail: row.text, to: '/journal', icon: BookOpen })),
      ...issues.map((row) => ({
        date: row.onsetDate,
        label: `Issue noticed — ${row.title}`,
        detail: describePart(row.bodyPart, row.side),
        to: `/issues/${row.id}`,
        icon: Activity,
      })),
    ];
    const upToNow = new Date().toISOString().slice(0, 10);
    return entries
      .filter((entry) => entry.date && entry.date <= upToNow)
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 8);
  }, [appointments, vaccinations, weights, journal, issues]);

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
      <PageHeader title={`Hello, ${pet.name}`} subtitle="Everything that needs attention, in one place." />

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
            {pet.neutered && <Badge tone="blue">Neutered</Badge>}
            {pet.allergies.map((allergy) => (
              <Badge key={allergy} tone="red">
                Allergy: {allergy}
              </Badge>
            ))}
            {birthdayIn !== null && birthdayIn <= 30 && (
              <Badge tone="violet">
                <Cake className="size-3" /> Birthday {relativeDays(new Date(Date.now() + birthdayIn * 86_400_000).toISOString().slice(0, 10))}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Activity}
          label="Open issues"
          value={String(open.length)}
          sub={open.length ? open.map((issue) => issue.title).slice(0, 2).join(', ') : 'Nothing being tracked'}
          to="/health"
          tone={open.some((issue) => issue.severity === 'high') ? 'text-red-600 dark:text-red-400' : undefined}
        />
        <StatCard
          icon={Syringe}
          label="Vaccinations due"
          value={String(due.length)}
          sub={overdue.length ? `${overdue.length} overdue` : due.length ? `Next ${formatDate(due[0].nextDueDate)}` : 'All up to date'}
          to="/vaccinations"
          tone={overdue.length ? 'text-red-600 dark:text-red-400' : undefined}
        />
        <StatCard
          icon={Pill}
          label="Active medication"
          value={String(meds.length)}
          sub={meds.length ? meds.map((medication) => medication.name).slice(0, 2).join(', ') : 'None right now'}
          to="/medications"
        />
        <StatCard
          icon={Scale}
          label="Weight"
          value={trend ? `${trend.latest.kg} kg` : '—'}
          sub={
            trend?.deltaKg
              ? `${trend.deltaKg > 0 ? '+' : ''}${trend.deltaKg} kg since last weigh-in`
              : trend
                ? `Recorded ${formatDate(trend.latest.date)}`
                : 'No weigh-ins yet'
          }
          to="/weight"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Panel title="Upcoming appointments" icon={CalendarDays} to="/appointments" linkLabel="All appointments">
            {upcoming.length === 0 ? (
              <Nothing>Nothing scheduled.</Nothing>
            ) : (
              <ul className="space-y-3">
                {upcoming.slice(0, 4).map((appointment) => (
                  <li key={appointment.id} className="flex items-baseline justify-between gap-3 text-sm">
                    <div>
                      <p className="font-medium text-stone-800 dark:text-stone-200">{titleCase(appointment.type)}</p>
                      <p className="text-stone-500">{appointment.reason || 'No reason recorded'}</p>
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
            <Panel title="Vaccinations coming up" icon={Syringe} to="/vaccinations" linkLabel="All vaccinations">
              <ul className="space-y-2 text-sm">
                {due.map((vaccination) => {
                  const days = daysFromToday(vaccination.nextDueDate) ?? 0;
                  return (
                    <li key={vaccination.id} className="flex items-center justify-between gap-3">
                      <span className="font-medium text-stone-800 dark:text-stone-200">{vaccination.name}</span>
                      <Badge tone={days < 0 ? 'red' : 'amber'}>
                        {days < 0 ? 'Overdue' : 'Due'} {relativeDays(vaccination.nextDueDate)}
                      </Badge>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          )}

          {care.length > 0 && (
            <Panel title="Care & time away" icon={Plane} to="/care" linkLabel="Care sheet">
              <ul className="space-y-2 text-sm">
                {care.map((event) => (
                  <li key={event.id} className="flex items-center justify-between gap-3">
                    <div>
                      <p className="font-medium text-stone-800 dark:text-stone-200">{event.title}</p>
                      <p className="text-stone-500">
                        {formatDate(event.startDate)}
                        {event.endDate ? ` → ${formatDate(event.endDate)}` : ''}
                      </p>
                    </div>
                    <Badge tone="blue">{relativeDays(event.startDate)}</Badge>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Recent activity" icon={BookOpen} to="/journal" linkLabel="Journal">
            {activity.length === 0 ? (
              <Nothing>Nothing recorded yet.</Nothing>
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
                Health map
              </h2>
              <Link to="/health" className="text-xs font-medium text-amber-700 hover:underline dark:text-amber-500">
                Open
              </Link>
            </div>
            <CatBody issues={issues} viewSide={viewSide} showInternal={false} />
            <div className="mt-2 flex justify-center gap-1 text-xs">
              {(['left', 'right'] as const).map((side) => (
                <button
                  key={side}
                  type="button"
                  onClick={() => setViewSide(side)}
                  className={cx(
                    'cursor-pointer rounded px-2 py-1 font-medium',
                    viewSide === side ? 'bg-stone-200 text-stone-800 dark:bg-stone-800 dark:text-stone-200' : 'text-stone-500',
                  )}
                >
                  {titleCase(side)}
                </button>
              ))}
            </div>
          </section>

          {open.length > 0 && (
            <Panel title="Open issues" icon={Activity} to="/health" linkLabel="Health map">
              <ul className="space-y-2 text-sm">
                {open.map((issue) => (
                  <li key={issue.id}>
                    <Link to={`/issues/${issue.id}`} className="flex items-start justify-between gap-2 hover:underline">
                      <span>
                        <span className="font-medium text-stone-800 dark:text-stone-200">{issue.title}</span>
                        <span className="block text-xs text-stone-500">{describePart(issue.bodyPart, issue.side)}</span>
                      </span>
                      <Badge tone={issue.status === 'monitoring' ? ISSUE_STATUS_TONE.monitoring : SEVERITY_TONE[issue.severity]}>
                        {titleCase(issue.status === 'monitoring' ? 'monitoring' : issue.severity)}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel title="Current food" icon={Soup} to="/food" linkLabel="All food">
            {currentFoods(foods).length === 0 ? (
              <Nothing>No current food recorded.</Nothing>
            ) : (
              <ul className="space-y-2 text-sm">
                {currentFoods(foods).map((food) => (
                  <li key={food.id}>
                    <p className="font-medium text-stone-800 dark:text-stone-200">{[food.brand, food.product].filter(Boolean).join(' ')}</p>
                    <p className="text-stone-500">
                      {food.amountPerDay || '—'}
                      {food.timesPerDay ? ` · ${food.timesPerDay}×/day` : ''}
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
                {trend.deltaKg > 0 ? 'Gained' : 'Lost'} {Math.abs(trend.deltaKg)} kg since the previous weigh-in.
              </p>
            </div>
          )}
        </div>
      </div>

      {activity.length === 0 && issues.length === 0 && appointments.length === 0 && (
        <div className="mt-6">
          <EmptyState
            title="Nothing recorded yet"
            message="Start with a vet appointment or the vaccination booklet — the dashboard fills itself in from there."
          />
        </div>
      )}
    </>
  );
}
