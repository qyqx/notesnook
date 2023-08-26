/*
This file is part of the Notesnook project (https://notesnook.com/)

Copyright (C) 2023 Streetwriters (Private) Limited

This program is free software: you can redistribute it and/or modify
it under the terms of the GNU General Public License as published by
the Free Software Foundation, either version 3 of the License, or
(at your option) any later version.

This program is distributed in the hope that it will be useful,
but WITHOUT ANY WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
GNU General Public License for more details.

You should have received a copy of the GNU General Public License
along with this program.  If not, see <http://www.gnu.org/licenses/>.
*/

import {
  FormatDateOptions,
  TimeFormat,
  formatDate
} from "@notesnook/core/dist/utils/date";
import { database } from "../database";
import { formatReminderTime } from "@notesnook/core/dist/collections/reminders";
import { Reminder } from "@notesnook/core/dist/types";

export function getFormattedDate(
  date: string | number | Date,
  type: FormatDateOptions["type"]
) {
  return formatDate(date, {
    dateFormat: database.settings?.getDateFormat() as string,
    timeFormat: database.settings?.getTimeFormat() as string,
    type: type
  } as FormatDateOptions);
}

export function getFormattedReminderTime(reminder: Reminder, short = false) {
  return formatReminderTime(reminder, short, {
    dateFormat: database.settings?.getDateFormat() as string,
    timeFormat: database.settings?.getTimeFormat() as TimeFormat
  });
}
