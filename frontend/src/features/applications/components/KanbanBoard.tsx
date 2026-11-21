import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from '@dnd-kit/core';
import { Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { getErrorMessage } from '@/lib/apiError';
import { formatDate } from '@/lib/format';
import { cn } from '@/lib/utils';
import { useChangeStatus, useKanbanColumn, type KanbanFilters } from '../hooks';
import { STATUSES, STATUS_LABELS, type Application, type ApplicationStatus } from '../types';
import { StatusBadge } from './StatusBadge';

/** A card that has been dropped and is waiting for the server to confirm. */
type PendingMoves = Record<string, { app: Application; to: ApplicationStatus }>;

function CardContent({ app }: { app: Application }) {
  return (
    <div className="rounded-md border bg-background p-3 shadow-sm">
      <Link
        to={`/applications/${app.id}`}
        className="block text-sm font-medium leading-snug hover:text-primary hover:underline"
      >
        {app.jobTitle}
      </Link>
      <p className="mt-0.5 text-sm text-muted-foreground">{app.companyName}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {[app.location, app.workMode?.toLowerCase(), app.appliedDate && formatDate(app.appliedDate)]
          .filter(Boolean)
          .join(' · ') || 'No details'}
      </p>
    </div>
  );
}

function DraggableCard({ app, moving }: { app: Application; moving: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: app.id,
    data: { app },
    disabled: moving, // can't drag a card that is still being saved
  });
  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={cn(
        'touch-manipulation cursor-grab active:cursor-grabbing',
        isDragging && 'opacity-30',
        moving && 'animate-pulse cursor-wait',
      )}
    >
      <CardContent app={app} />
    </div>
  );
}

function Column({
  status,
  filters,
  pending,
}: {
  status: ApplicationStatus;
  filters: KanbanFilters;
  pending: PendingMoves;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const query = useKanbanColumn(status, filters);

  const fetched = query.data
    ? [...new Map(query.data.pages.flatMap((p) => p.items).map((a) => [a.id, a])).values()] // de-duplicate across pages
    : [];
  // Cards being moved are hidden from where they came from and shown at the top of where they are going.
  const incoming = Object.values(pending)
    .filter((p) => p.to === status)
    .map((p) => ({ ...p.app, status }));
  const items = [...incoming, ...fetched.filter((a) => !pending[a.id])];

  const serverTotal = query.data?.pages[0]?.meta.total ?? 0;
  const leaving = Object.values(pending).filter((p) => p.app.status === status).length;
  const total = Math.max(0, serverTotal - leaving + incoming.length);

  return (
    <section
      ref={setNodeRef}
      aria-label={`${STATUS_LABELS[status]} column`}
      className={cn(
        'flex w-72 shrink-0 flex-col rounded-lg border bg-muted/40 transition-colors',
        isOver && 'border-primary bg-primary/5 ring-2 ring-primary/30',
      )}
    >
      <header className="flex items-center justify-between border-b p-3">
        <StatusBadge status={status} />
        <span className="text-sm text-muted-foreground" aria-label={`${total} applications`}>
          {total}
        </span>
      </header>

      <div className="max-h-[calc(100vh-22rem)] min-h-24 space-y-2 overflow-y-auto p-2">
        {query.isPending ? (
          <>
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </>
        ) : query.isError ? (
          <div className="space-y-2 p-2 text-center" role="alert">
            <p className="text-sm text-destructive">{getErrorMessage(query.error, 'Failed to load')}</p>
            <Button size="sm" variant="outline" onClick={() => void query.refetch()}>
              Retry
            </Button>
          </div>
        ) : items.length === 0 ? (
          <p className="p-4 text-center text-sm text-muted-foreground">Drop applications here</p>
        ) : (
          items.map((app) => <DraggableCard key={app.id} app={app} moving={!!pending[app.id]} />)
        )}

        {query.hasNextPage && (
          <Button
            variant="ghost"
            size="sm"
            className="w-full"
            disabled={query.isFetchingNextPage}
            onClick={() => void query.fetchNextPage()}
          >
            {query.isFetchingNextPage && <Loader2 className="h-4 w-4 animate-spin" />}
            Load more
          </Button>
        )}
      </div>
    </section>
  );
}

export function KanbanBoard({ filters }: { filters: KanbanFilters }) {
  const changeStatus = useChangeStatus();
  const [pending, setPending] = useState<PendingMoves>({});
  const [dragging, setDragging] = useState<Application | null>(null);

  // Distance/delay stop accidental drags: clicking a card's link still works, and touch users can still scroll.
  const sensors = useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 8 } }),
    useSensor(KeyboardSensor),
  );

  const onDragStart = (e: DragStartEvent) => setDragging((e.active.data.current?.app as Application) ?? null);

  const onDragEnd = async (e: DragEndEvent) => {
    setDragging(null);
    const app = e.active.data.current?.app as Application | undefined;
    const to = e.over?.id as ApplicationStatus | undefined;
    if (!app || !to || !STATUSES.includes(to) || to === app.status) return;

    setPending((p) => ({ ...p, [app.id]: { app, to } })); // optimistic: the card jumps immediately
    try {
      // Resolves after the server confirmed AND every list/column was refetched, so there is no flicker.
      await changeStatus.mutateAsync({ id: app.id, status: to });
      toast.success(`Moved “${app.jobTitle}” to ${STATUS_LABELS[to]}`);
    } catch (error) {
      toast.error(getErrorMessage(error, 'Could not move application'), {
        description: `“${app.jobTitle}” was returned to ${STATUS_LABELS[app.status]}.`,
      });
    } finally {
      setPending((p) => {
        const { [app.id]: _done, ...rest } = p;
        return rest;
      });
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={onDragStart}
      onDragEnd={onDragEnd}
      onDragCancel={() => setDragging(null)}
    >
      <div className="flex gap-4 overflow-x-auto p-4">
        {STATUSES.map((status) => (
          <Column key={status} status={status} filters={filters} pending={pending} />
        ))}
      </div>
      <DragOverlay>{dragging ? <CardContent app={dragging} /> : null}</DragOverlay>
    </DndContext>
  );
}
