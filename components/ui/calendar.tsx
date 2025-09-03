'use client'

import * as React from 'react'
import {
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
} from 'lucide-react'
import { DayPicker } from 'react-day-picker'
import type { DayPickerProps } from 'react-day-picker'
import type { DayProps } from 'react-day-picker'

import { cn } from '@/lib/utils'
import { Button, buttonVariants } from '@/components/ui/button'

function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  captionLayout = 'buttons',
  buttonVariant = 'ghost',
  formatters,
  components,
  ...props
}: DayPickerProps & {
  buttonVariant?: React.ComponentProps<typeof Button>['variant']
}) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn(
        'bg-background group/calendar p-3 [--cell-size:--spacing(8)] [[data-slot=card-content]_&]:bg-transparent [[data-slot=popover-content]_&]:bg-transparent',
        String.raw`rtl:**:[.rdp-button\_next>svg]:rotate-180`,
        String.raw`rtl:**:[.rdp-button\_previous>svg]:rotate-180`,
        className
      )}
      captionLayout={captionLayout}
      formatters={{
        ...formatters,
      }}
      classNames={{
        root: cn('w-fit'),
        months: cn('flex gap-4 flex-col md:flex-row relative'),
        month: cn('flex flex-col w-full gap-4'),
        nav: cn('flex items-center gap-1 w-full absolute top-0 inset-x-0 justify-between'),
        nav_button_previous: cn('absolute left-1'),
        nav_button_next: cn('absolute right-1'),
        caption: cn('flex justify-center pt-1 relative items-center'),
        caption_label: cn('text-sm font-medium'),
        nav_button: cn(
          buttonVariants({ variant: buttonVariant }),
          'h-7 w-7 p-0 opacity-50 hover:opacity-100'
        ),
        table: cn('w-full border-collapse space-y-1'),
        head_row: cn('flex'),
        head_cell: cn(
          'text-muted-foreground rounded-md w-8 font-normal text-[0.8rem]'
        ),
        row: cn('flex w-full mt-2'),
        cell: cn('text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20'),
        day: cn(
          buttonVariants({ variant: 'ghost' }),
          'h-8 w-8 p-0 font-normal aria-selected:opacity-100'
        ),
        day_selected: cn(
          'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground'
        ),
        day_today: cn('bg-accent text-accent-foreground'),
        day_outside: 'text-muted-foreground opacity-50',
        day_disabled: 'text-muted-foreground opacity-50',
        day_range_middle:
          'aria-selected:bg-accent aria-selected:text-accent-foreground',
        day_hidden: 'invisible',
        ...classNames,
      }}
      components={{
        IconLeft: ({ ...props }) => <ChevronLeftIcon className="h-4 w-4" />,
        IconRight: ({ ...props }) => <ChevronRightIcon className="h-4 w-4" />,
        Day: ({ selected, today, outside, className, ...props }: DayProps & {
          selected?: boolean;
          today?: boolean;
          outside?: boolean;
          className?: string;
        }) => (
          <div
            {...props}
            className={cn(
              buttonVariants({ variant: 'ghost' }),
              'h-8 w-8 p-0 font-normal aria-selected:opacity-100',
              selected && 'bg-primary text-primary-foreground hover:bg-primary hover:text-primary-foreground focus:bg-primary focus:text-primary-foreground',
              today && 'bg-accent text-accent-foreground',
              outside && 'text-muted-foreground opacity-50',
              className
            )}
          />
        ),
        ...components,
      }}
      {...props}
    />
  )
}

export { Calendar }
