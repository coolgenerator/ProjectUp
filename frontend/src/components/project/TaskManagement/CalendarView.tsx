import React, { useMemo } from 'react';
import { Calendar, momentLocalizer, Views, View } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { Box, Paper, Typography } from '@mui/material';
import { Task, STATUS_CONFIG } from '../../../types/task';
import { WorkItem } from '../../../types/workItem';

const localizer = momentLocalizer(moment);

interface CalendarViewProps {
  tasks: Task[];
  workItems?: WorkItem[];
  onTaskClick?: (task: Task) => void;
}

interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  resource: Task;
  status: string;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  tasks,
  workItems = [],
  onTaskClick,
}) => {
  const [view, setView] = React.useState<View>(Views.MONTH);
  const [date, setDate] = React.useState(new Date());

  // Convert tasks to calendar events
  const events = useMemo((): CalendarEvent[] => {
    const itemsToConvert = workItems.length > 0
      ? workItems.filter(item => item.type === 'task' && item.originalTask).map(item => item.originalTask!)
      : tasks;

    return itemsToConvert
      .filter(task => task.start_date || task.due_date)
      .map((task) => {
        const start = task.start_date
          ? new Date(task.start_date)
          : task.due_date
            ? new Date(task.due_date)
            : new Date();

        const end = task.due_date
          ? new Date(task.due_date)
          : task.start_date
            ? new Date(new Date(task.start_date).getTime() + 24 * 60 * 60 * 1000)
            : new Date(new Date().getTime() + 24 * 60 * 60 * 1000);

        return {
          id: task.id,
          title: task.title,
          start,
          end,
          resource: task,
          status: task.status,
        };
      });
  }, [tasks, workItems]);

  // Custom event style based on task status
  const eventStyleGetter = (event: CalendarEvent) => {
    const config = STATUS_CONFIG[event.resource.status];
    // Fallback to a default color if status is invalid/undefined
    const backgroundColor = config?.color || '#6b7280';

    return {
      style: {
        backgroundColor,
        borderRadius: '4px',
        opacity: 0.8,
        color: 'white',
        border: 'none',
        display: 'block',
        fontSize: '0.85rem',
        padding: '2px 5px',
      },
    };
  };

  if (events.length === 0) {
    return (
      <Paper
        elevation={0}
        sx={{
          p: 8,
          textAlign: 'center',
          border: '2px dashed',
          borderColor: 'divider',
          borderRadius: 1,
        }}
      >
        <Typography variant="h3" sx={{ fontSize: '3.5rem', mb: 2 }}>
          📆
        </Typography>
        <Typography variant="h6" sx={{ fontWeight: 600, color: 'text.primary', mb: 1 }}>
          No tasks with dates
        </Typography>
        <Typography color="text.secondary">
          Add start or due dates to your tasks to see them in the calendar view.
        </Typography>
      </Paper>
    );
  }

  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          p: 3,
          border: '1px solid',
          borderColor: 'divider',
          borderRadius: 1,
          height: '700px',
          '& .rbc-calendar': {
            height: '100%',
          },
          '& .rbc-header': {
            padding: '10px 3px',
            fontSize: '0.9rem',
            fontWeight: 600,
            color: '#64748b',
          },
          '& .rbc-today': {
            backgroundColor: '#f1f5f9',
          },
          '& .rbc-off-range-bg': {
            backgroundColor: '#f8fafc',
          },
          '& .rbc-event': {
            padding: '2px 5px',
            fontSize: '0.85rem',
          },
          '& .rbc-toolbar button': {
            color: '#475569',
            fontSize: '0.9rem',
            padding: '6px 12px',
            border: '1px solid #e2e8f0',
            borderRadius: '6px',
            transition: 'all 0.2s',
            '&:hover': {
              backgroundColor: '#f1f5f9',
            },
            '&:active, &.rbc-active': {
              backgroundColor: '#3b82f6',
              color: 'white',
              borderColor: '#3b82f6',
            },
          },
          '& .rbc-toolbar-label': {
            fontSize: '1.1rem',
            fontWeight: 600,
            color: '#1e293b',
          },
        }}
      >
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          view={view}
          onView={setView}
          date={date}
          onNavigate={setDate}
          onSelectEvent={(event) => {
            if (onTaskClick) {
              onTaskClick(event.resource);
            }
          }}
          eventPropGetter={eventStyleGetter}
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          popup
          tooltipAccessor={(event: CalendarEvent) => {
            return `${event.title} - ${event.resource.status}`;
          }}
        />
      </Paper>
    </Box>
  );
};

export default CalendarView;
