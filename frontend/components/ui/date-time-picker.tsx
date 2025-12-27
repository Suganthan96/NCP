"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon, Clock } from "lucide-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Input } from "@/components/ui/input"

interface DateTimePickerProps {
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

export function DateTimePicker({
  value,
  onChange,
  placeholder = "Pick a date and time",
  disabled = false,
}: DateTimePickerProps) {
  const [date, setDate] = React.useState<Date | undefined>(
    value ? new Date(value) : undefined
  )
  const [time, setTime] = React.useState<string>(
    value ? format(new Date(value), "HH:mm") : "12:00"
  )

  const handleDateSelect = (selectedDate: Date | undefined) => {
    if (selectedDate) {
      setDate(selectedDate)
      updateDateTime(selectedDate, time)
    }
  }

  const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = e.target.value
    setTime(newTime)
    if (date) {
      updateDateTime(date, newTime)
    }
  }

  const updateDateTime = (selectedDate: Date, selectedTime: string) => {
    const [hours, minutes] = selectedTime.split(":").map(Number)
    const newDateTime = new Date(selectedDate)
    newDateTime.setHours(hours, minutes, 0, 0)
    
    // Format as ISO string for datetime-local input compatibility
    const isoString = newDateTime.toISOString().slice(0, 16)
    onChange?.(isoString)
  }

  const clearDateTime = () => {
    setDate(undefined)
    setTime("12:00")
    onChange?.("")
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          disabled={disabled}
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            <span>
              {format(date, "PPP")} at {time}
            </span>
          ) : (
            <span>{placeholder}</span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <div className="p-0">
          <Calendar
            mode="single"
            selected={date}
            onSelect={handleDateSelect}
            initialFocus
          />
          <div className="border-t p-3 space-y-3">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm font-medium">Select Time</span>
            </div>
            <Input
              type="time"
              value={time}
              onChange={handleTimeChange}
              className="w-full"
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  const now = new Date()
                  setDate(now)
                  setTime(format(now, "HH:mm"))
                  updateDateTime(now, format(now, "HH:mm"))
                }}
                className="flex-1"
              >
                Now
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearDateTime}
                className="flex-1"
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
