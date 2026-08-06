//! Date & time functions, backported from the modern quadratic-core.
//!
//! The modern core has first-class Date/Time/DateTime values (chrono); this
//! engine's values are strings and numbers, so dates are represented as ISO
//! strings (`2026-08-06`, `14:30:00`, `2026-08-06 14:30:00`). Calendar math
//! uses Howard Hinnant's civil-calendar algorithms; no external crates.

use super::*;
use crate::formulas::FormulaError;

pub const CATEGORY: FormulaFunctionCategory = FormulaFunctionCategory {
    include_in_docs: true,
    include_in_completions: true,
    name: "Date & time functions",
    docs: "Dates are ISO strings like `2026-08-06`; times are `14:30:00`. \
           `M/D/YYYY`, `D.M.YYYY`, and `YYYY/M/D` inputs are also accepted.\n\n",
    get_functions,
};

// ---------------------------------------------------------------- calendar

fn is_leap(y: i64) -> bool {
    (y % 4 == 0 && y % 100 != 0) || y % 400 == 0
}

fn days_in_month(y: i64, m: u32) -> u32 {
    match m {
        1 | 3 | 5 | 7 | 8 | 10 | 12 => 31,
        4 | 6 | 9 | 11 => 30,
        2 => {
            if is_leap(y) {
                29
            } else {
                28
            }
        }
        _ => 30,
    }
}

/// Days since 1970-01-01 (Hinnant's `days_from_civil`).
fn days_from_civil(y: i64, m: u32, d: u32) -> i64 {
    let y = if m <= 2 { y - 1 } else { y };
    let era = if y >= 0 { y } else { y - 399 } / 400;
    let yoe = y - era * 400; // [0, 399]
    let mp = ((m + 9) % 12) as i64; // Mar=0 .. Feb=11
    let doy = (153 * mp + 2) / 5 + d as i64 - 1;
    let doe = yoe * 365 + yoe / 4 - yoe / 100 + doy;
    era * 146097 + doe - 719468
}

/// Inverse of `days_from_civil`.
fn civil_from_days(z: i64) -> (i64, u32, u32) {
    let z = z + 719468;
    let era = if z >= 0 { z } else { z - 146096 } / 146097;
    let doe = z - era * 146097;
    let yoe = (doe - doe / 1460 + doe / 36524 - doe / 146096) / 365;
    let y = yoe + era * 400;
    let doy = doe - (365 * yoe + yoe / 4 - yoe / 100);
    let mp = (5 * doy + 2) / 153;
    let d = (doy - (153 * mp + 2) / 5 + 1) as u32;
    let m = if mp < 10 { mp + 3 } else { mp - 9 } as u32;
    (if m <= 2 { y + 1 } else { y }, m, d)
}

/// ISO weekday: Mon=1 .. Sun=7 (1970-01-01 was a Thursday).
fn iso_weekday(days: i64) -> u32 {
    ((days + 3).rem_euclid(7) + 1) as u32
}

/// Sunday-based weekday index: Sun=0 .. Sat=6.
fn sun0_weekday(days: i64) -> i64 {
    (days + 4).rem_euclid(7)
}

fn format_date(y: i64, m: u32, d: u32) -> String {
    format!("{y:04}-{m:02}-{d:02}")
}

fn format_time(h: u32, mi: u32, s: u32) -> String {
    format!("{h:02}:{mi:02}:{s:02}")
}

/// `DATE`-style normalization: month/day may over- or underflow.
fn normalized_date(y: i64, m: i64, d: i64) -> (i64, u32, u32) {
    let months0 = y * 12 + (m - 1);
    let ny = months0.div_euclid(12);
    let nm = (months0.rem_euclid(12) + 1) as u32;
    civil_from_days(days_from_civil(ny, nm, 1) + d - 1)
}

// ---------------------------------------------------------------- parsing

fn split_ints(s: &str, sep: char) -> Option<Vec<i64>> {
    let parts: Vec<&str> = s.split(sep).collect();
    parts
        .iter()
        .map(|p| p.trim().parse::<i64>().ok())
        .collect::<Option<Vec<i64>>>()
        .filter(|v| v.len() == parts.len())
}

/// Parses a date from ISO (`2026-08-06`, `2026/8/6`), US (`8/6/2026`), or
/// EU-dotted (`6.8.2026`) forms. Returns (year, month, day).
fn parse_date_str(s: &str) -> Option<(i64, u32, u32)> {
    let s = s.trim();
    let (y, m, d) = if let Some(v) = split_ints(s, '-').filter(|v| v.len() == 3) {
        (v[0], v[1], v[2])
    } else if let Some(v) = split_ints(s, '/').filter(|v| v.len() == 3) {
        if v[0] >= 1000 {
            (v[0], v[1], v[2]) // YYYY/M/D
        } else {
            (v[2], v[0], v[1]) // M/D/YYYY
        }
    } else if let Some(v) = split_ints(s, '.').filter(|v| v.len() == 3) {
        (v[2], v[1], v[0]) // D.M.YYYY
    } else {
        return None;
    };
    if !(1..=12).contains(&m) {
        return None;
    }
    let (m, d_max) = (m as u32, days_in_month(y, m as u32) as i64);
    if !(1..=d_max).contains(&d) {
        return None;
    }
    Some((y, m, d as u32))
}

/// Parses `HH:MM` or `HH:MM:SS`.
fn parse_time_str(s: &str) -> Option<(u32, u32, u32)> {
    let v = split_ints(s.trim(), ':')?;
    let (h, mi, sec) = match v.len() {
        2 => (v[0], v[1], 0),
        3 => (v[0], v[1], v[2]),
        _ => return None,
    };
    if (0..24).contains(&h) && (0..60).contains(&mi) && (0..60).contains(&sec) {
        Some((h as u32, mi as u32, sec as u32))
    } else {
        None
    }
}

/// Splits a datetime string into date and optional time parts.
fn parse_datetime_str(s: &str) -> Option<((i64, u32, u32), Option<(u32, u32, u32)>)> {
    let s = s.trim();
    let (date_part, time_part) = match s.split_once(['T', ' ']) {
        Some((d, t)) => (d, Some(t)),
        None => (s, None),
    };
    let date = parse_date_str(date_part)?;
    match time_part {
        Some(t) => Some((date, Some(parse_time_str(t)?))),
        None => Some((date, None)),
    }
}

fn expected_date(v: &Spanned<Value>) -> FormulaError {
    FormulaErrorMsg::Expected {
        expected: "date (e.g. 2026-08-06)".into(),
        got: Some(v.inner.to_string().into()),
    }
    .with_span(v.span)
}

/// Extracts a date (days since epoch) from an argument.
fn arg_to_days(v: &Spanned<Value>) -> FormulaResult<i64> {
    let s = v.inner.to_string();
    match parse_datetime_str(&s) {
        Some(((y, m, d), _)) => Ok(days_from_civil(y, m, d)),
        None => Err(expected_date(v)),
    }
}

/// Extracts (h, m, s) from a time/datetime string or a fraction-of-day number.
fn arg_to_time(v: &Spanned<Value>) -> FormulaResult<(u32, u32, u32)> {
    let s = v.inner.to_string();
    if let Some(t) = parse_time_str(&s) {
        return Ok(t);
    }
    if let Some((_, Some(t))) = parse_datetime_str(&s) {
        return Ok(t);
    }
    if let Ok(n) = v.inner.to_number() {
        // Excel-style fraction of a day
        let secs = ((n.rem_euclid(1.0)) * 86400.0).round() as u32 % 86400;
        return Ok((secs / 3600, secs % 3600 / 60, secs % 60));
    }
    Err(FormulaErrorMsg::Expected {
        expected: "time (e.g. 14:30:00)".into(),
        got: Some(s.into()),
    }
    .with_span(v.span))
}

/// Flattens a holidays argument into a set of day numbers (blanks ignored).
fn holidays_set(v: Option<&Spanned<Value>>) -> Vec<i64> {
    let mut out = vec![];
    if let Some(v) = v {
        let values: Vec<Value> = match &v.inner {
            Value::Array(rows) => rows.iter().flatten().cloned().collect(),
            other => vec![other.clone()],
        };
        for value in values {
            let s = value.to_string();
            if s.trim().is_empty() {
                continue;
            }
            if let Some((y, m, d)) = parse_date_str(&s) {
                out.push(days_from_civil(y, m, d));
            }
        }
    }
    out
}

fn is_weekend(days: i64) -> bool {
    iso_weekday(days) >= 6
}

// ---------------------------------------------------------------- current time

/// (year, month, day, hour, minute, second) in local time.
#[cfg(target_arch = "wasm32")]
fn current_datetime() -> (i64, u32, u32, u32, u32, u32) {
    let now = js_sys::Date::new_0();
    (
        now.get_full_year() as i64,
        now.get_month() + 1,
        now.get_date(),
        now.get_hours(),
        now.get_minutes(),
        now.get_seconds(),
    )
}

#[cfg(not(target_arch = "wasm32"))]
fn current_datetime() -> (i64, u32, u32, u32, u32, u32) {
    let secs = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .map(|d| d.as_secs() as i64)
        .unwrap_or(0);
    let days = secs.div_euclid(86400);
    let tod = secs.rem_euclid(86400) as u32;
    let (y, m, d) = civil_from_days(days);
    (y, m, d, tod / 3600, tod % 3600 / 60, tod % 60)
}

// ---------------------------------------------------------------- helpers

fn args_n<const N: usize>(
    args: Spanned<Vec<Spanned<Value>>>,
) -> FormulaResult<[Spanned<Value>; N]> {
    let span = args.span;
    args.inner
        .try_into()
        .map_err(|_| FormulaErrorMsg::BadArgumentCount.with_span(span))
}

/// `(a)` or `(a, b)`.
fn one_or_two_args(
    args: Spanned<Vec<Spanned<Value>>>,
) -> FormulaResult<(Spanned<Value>, Option<Spanned<Value>>)> {
    let span = args.span;
    let mut a = args.inner.into_iter();
    match (a.next(), a.next(), a.next()) {
        (Some(x), y, None) => Ok((x, y)),
        _ => Err(FormulaErrorMsg::BadArgumentCount.with_span(span)),
    }
}

/// `(a, b)` or `(a, b, c)`.
fn two_or_three_args(
    args: Spanned<Vec<Spanned<Value>>>,
) -> FormulaResult<(Spanned<Value>, Spanned<Value>, Option<Spanned<Value>>)> {
    let span = args.span;
    let mut a = args.inner.into_iter();
    match (a.next(), a.next(), a.next(), a.next()) {
        (Some(x), Some(y), z, None) => Ok((x, y, z)),
        _ => Err(FormulaErrorMsg::BadArgumentCount.with_span(span)),
    }
}

fn edate_days(days: i64, months: i64, end_of_month: bool) -> i64 {
    let (y, m, d) = civil_from_days(days);
    let months0 = y * 12 + (m as i64 - 1) + months;
    let ny = months0.div_euclid(12);
    let nm = (months0.rem_euclid(12) + 1) as u32;
    let nd = if end_of_month {
        days_in_month(ny, nm)
    } else {
        d.min(days_in_month(ny, nm))
    };
    days_from_civil(ny, nm, nd)
}

fn days360(start: i64, end: i64, european: bool) -> i64 {
    let (sy, sm, mut sd) = civil_from_days(start);
    let (ey, em, mut ed) = civil_from_days(end);
    if european {
        if sd == 31 {
            sd = 30;
        }
        if ed == 31 {
            ed = 30;
        }
    } else {
        // US/NASD method
        let s_last = sd == days_in_month(sy, sm);
        if s_last {
            sd = 30;
        }
        if ed == 31 && sd == 30 {
            ed = 30;
        }
    }
    (ey - sy) * 360 + (em as i64 - sm as i64) * 30 + (ed as i64 - sd as i64)
}

fn datediff_months(start: i64, end: i64) -> i64 {
    let (sy, sm, sd) = civil_from_days(start);
    let (ey, em, ed) = civil_from_days(end);
    let mut months = (ey - sy) * 12 + (em as i64 - sm as i64);
    if ed < sd {
        months -= 1;
    }
    months
}

fn iso_week_number(days: i64) -> i64 {
    let thursday = days + 4 - iso_weekday(days) as i64;
    let (ty, _, _) = civil_from_days(thursday);
    let jan1 = days_from_civil(ty, 1, 1);
    (thursday - jan1) / 7 + 1
}

// ---------------------------------------------------------------- functions

fn get_functions() -> Vec<FormulaFunction> {
    vec![
        FormulaFunction {
            name: "TODAY",
            arg_completion: "",
            usages: &[""],
            examples: &["TODAY()"],
            doc: "Returns the current date, like `2026-08-06`.",
            eval: util::pure_fn(|args| {
                if !args.inner.is_empty() {
                    return Err(FormulaErrorMsg::BadArgumentCount.with_span(args.span));
                }
                let (y, m, d, ..) = current_datetime();
                Ok(Value::String(format_date(y, m, d)))
            }),
        },
        FormulaFunction {
            name: "NOW",
            arg_completion: "",
            usages: &[""],
            examples: &["NOW()"],
            doc: "Returns the current date and time, like `2026-08-06 14:30:00`.",
            eval: util::pure_fn(|args| {
                if !args.inner.is_empty() {
                    return Err(FormulaErrorMsg::BadArgumentCount.with_span(args.span));
                }
                let (y, m, d, h, mi, s) = current_datetime();
                Ok(Value::String(format!(
                    "{} {}",
                    format_date(y, m, d),
                    format_time(h, mi, s)
                )))
            }),
        },
        FormulaFunction {
            name: "DATE",
            arg_completion: "${1:year}, ${2:month}, ${3:day}",
            usages: &["year, month, day"],
            examples: &["DATE(2026, 8, 6)", "DATE(2026, 13, 1)"],
            doc: "Returns a date. Out-of-range months and days roll over, \
                  like in Excel: `DATE(2026, 13, 1)` is `2027-01-01`.",
            eval: util::array_mapped(|[y, m, d]| {
                let (ny, nm, nd) =
                    normalized_date(y.to_integer()?, m.to_integer()?, d.to_integer()?);
                Ok(Value::String(format_date(ny, nm, nd)))
            }),
        },
        FormulaFunction {
            name: "TIME",
            arg_completion: "${1:hour}, ${2:minute}, ${3:second}",
            usages: &["hour, minute, second"],
            examples: &["TIME(14, 30, 0)"],
            doc: "Returns a time. Out-of-range values roll over and wrap at \
                  24 hours.",
            eval: util::array_mapped(|[h, m, s]| {
                let total = h.to_integer()? * 3600 + m.to_integer()? * 60 + s.to_integer()?;
                let total = total.rem_euclid(86400) as u32;
                Ok(Value::String(format_time(
                    total / 3600,
                    total % 3600 / 60,
                    total % 60,
                )))
            }),
        },
        FormulaFunction {
            name: "YEAR",
            arg_completion: "${1:date}",
            usages: &["date"],
            examples: &["YEAR(\"2026-08-06\")"],
            doc: "Returns the year of a date.",
            eval: util::array_mapped(|[v]| {
                let (y, _, _) = civil_from_days(arg_to_days(&v)?);
                Ok(Value::Number(y as f64))
            }),
        },
        FormulaFunction {
            name: "MONTH",
            arg_completion: "${1:date}",
            usages: &["date"],
            examples: &["MONTH(\"2026-08-06\")"],
            doc: "Returns the month of a date (1–12).",
            eval: util::array_mapped(|[v]| {
                let (_, m, _) = civil_from_days(arg_to_days(&v)?);
                Ok(Value::Number(m as f64))
            }),
        },
        FormulaFunction {
            name: "DAY",
            arg_completion: "${1:date}",
            usages: &["date"],
            examples: &["DAY(\"2026-08-06\")"],
            doc: "Returns the day of the month of a date (1–31).",
            eval: util::array_mapped(|[v]| {
                let (_, _, d) = civil_from_days(arg_to_days(&v)?);
                Ok(Value::Number(d as f64))
            }),
        },
        FormulaFunction {
            name: "HOUR",
            arg_completion: "${1:time}",
            usages: &["time"],
            examples: &["HOUR(\"14:30:00\")"],
            doc: "Returns the hour of a time (0–23).",
            eval: util::array_mapped(|[v]| Ok(Value::Number(arg_to_time(&v)?.0 as f64))),
        },
        FormulaFunction {
            name: "MINUTE",
            arg_completion: "${1:time}",
            usages: &["time"],
            examples: &["MINUTE(\"14:30:00\")"],
            doc: "Returns the minute of a time (0–59).",
            eval: util::array_mapped(|[v]| Ok(Value::Number(arg_to_time(&v)?.1 as f64))),
        },
        FormulaFunction {
            name: "SECOND",
            arg_completion: "${1:time}",
            usages: &["time"],
            examples: &["SECOND(\"14:30:45\")"],
            doc: "Returns the second of a time (0–59).",
            eval: util::array_mapped(|[v]| Ok(Value::Number(arg_to_time(&v)?.2 as f64))),
        },
        FormulaFunction {
            name: "DATEVALUE",
            arg_completion: "${1:text}",
            usages: &["text"],
            examples: &["DATEVALUE(\"8/6/2026\")"],
            doc: "Parses a date from text and returns it in ISO form \
                  (`2026-08-06`). Accepts `YYYY-MM-DD`, `YYYY/M/D`, \
                  `M/D/YYYY`, and `D.M.YYYY`.",
            eval: util::array_mapped(|[v]| {
                let (y, m, d) = civil_from_days(arg_to_days(&v)?);
                Ok(Value::String(format_date(y, m, d)))
            }),
        },
        FormulaFunction {
            name: "TIMEVALUE",
            arg_completion: "${1:text}",
            usages: &["text"],
            examples: &["TIMEVALUE(\"14:30\")"],
            doc: "Parses a time from text and returns it as `HH:MM:SS`.",
            eval: util::array_mapped(|[v]| {
                let (h, m, s) = arg_to_time(&v)?;
                Ok(Value::String(format_time(h, m, s)))
            }),
        },
        FormulaFunction {
            name: "EDATE",
            arg_completion: "${1:date}, ${2:months}",
            usages: &["date, months"],
            examples: &["EDATE(\"2026-08-31\", 1)"],
            doc: "Returns the date `months` months before or after `date`, \
                  clamping to the target month's length.",
            eval: util::array_mapped(|[date, months]| {
                let days = edate_days(arg_to_days(&date)?, months.to_integer()?, false);
                let (y, m, d) = civil_from_days(days);
                Ok(Value::String(format_date(y, m, d)))
            }),
        },
        FormulaFunction {
            name: "EOMONTH",
            arg_completion: "${1:date}, ${2:months}",
            usages: &["date, months"],
            examples: &["EOMONTH(\"2026-08-06\", 0)"],
            doc: "Returns the last day of the month `months` months before \
                  or after `date`.",
            eval: util::array_mapped(|[date, months]| {
                let days = edate_days(arg_to_days(&date)?, months.to_integer()?, true);
                let (y, m, d) = civil_from_days(days);
                Ok(Value::String(format_date(y, m, d)))
            }),
        },
        FormulaFunction {
            name: "DAYS",
            arg_completion: "${1:end_date}, ${2:start_date}",
            usages: &["end_date, start_date"],
            examples: &["DAYS(\"2026-12-31\", \"2026-01-01\")"],
            doc: "Returns the number of days from `start_date` to `end_date`.",
            eval: util::array_mapped(|[end, start]| {
                Ok(Value::Number((arg_to_days(&end)? - arg_to_days(&start)?) as f64))
            }),
        },
        FormulaFunction {
            name: "DAYS360",
            arg_completion: "${1:start_date}, ${2:end_date}",
            usages: &["start_date, end_date", "start_date, end_date, european"],
            examples: &["DAYS360(\"2026-01-31\", \"2026-12-31\")"],
            doc: "Returns the number of days between two dates on a 360-day \
                  year (twelve 30-day months). Uses the US (NASD) method \
                  unless `european` is TRUE.",
            eval: util::pure_fn(|args| {
                let (start, end, method) = two_or_three_args(args)?;
                let european = match method {
                    Some(m) => m.to_bool()?,
                    None => false,
                };
                Ok(Value::Number(days360(
                    arg_to_days(&start)?,
                    arg_to_days(&end)?,
                    european,
                ) as f64))
            }),
        },
        FormulaFunction {
            name: "DATEDIF",
            arg_completion: "${1:start_date}, ${2:end_date}, ${3:unit}",
            usages: &["start_date, end_date, unit"],
            examples: &["DATEDIF(\"2020-02-29\", \"2026-08-06\", \"Y\")"],
            doc: "Returns the difference between two dates in the given unit: \
                  `\"Y\"` whole years, `\"M\"` whole months, `\"D\"` days, \
                  `\"MD\"` days ignoring months and years, `\"YM\"` months \
                  ignoring years, `\"YD\"` days ignoring years.",
            eval: util::pure_fn(|args| {
                let span = args.span;
                let [start, end, unit] = args_n::<3>(args)?;
                let s = arg_to_days(&start)?;
                let e = arg_to_days(&end)?;
                if e < s {
                    return Err(FormulaErrorMsg::Expected {
                        expected: "start_date ≤ end_date".into(),
                        got: None,
                    }
                    .with_span(span));
                }
                let (sy, sm, sd) = civil_from_days(s);
                let (ey, em, ed) = civil_from_days(e);
                let result = match unit.to_string().to_uppercase().as_str() {
                    "D" => e - s,
                    "M" => datediff_months(s, e),
                    "Y" => datediff_months(s, e) / 12,
                    "YM" => datediff_months(s, e) % 12,
                    "MD" => {
                        if ed as i64 >= sd as i64 {
                            ed as i64 - sd as i64
                        } else {
                            let (py, pm) = if em == 1 { (ey - 1, 12) } else { (ey, em - 1) };
                            days_in_month(py, pm) as i64 - sd as i64 + ed as i64
                        }
                    }
                    "YD" => {
                        let mut anchor = days_from_civil(ey, sm, sd.min(days_in_month(ey, sm)));
                        if anchor > e {
                            anchor = days_from_civil(ey - 1, sm, sd.min(days_in_month(ey - 1, sm)));
                        }
                        e - anchor
                    }
                    other => {
                        return Err(FormulaErrorMsg::Expected {
                            expected: "unit \"Y\", \"M\", \"D\", \"MD\", \"YM\", or \"YD\"".into(),
                            got: Some(other.to_string().into()),
                        }
                        .with_span(unit.span))
                    }
                };
                Ok(Value::Number(result as f64))
            }),
        },
        FormulaFunction {
            name: "WEEKDAY",
            arg_completion: "${1:date}",
            usages: &["date", "date, return_type"],
            examples: &["WEEKDAY(\"2026-08-06\")"],
            doc: "Returns the day of the week of a date. `return_type` 1 \
                  (default): Sunday=1 … Saturday=7; 2: Monday=1 … Sunday=7; \
                  3: Monday=0 … Sunday=6.",
            eval: util::pure_fn(|args| {
                let (date, return_type) = one_or_two_args(args)?;
                let days = arg_to_days(&date)?;
                let t = match &return_type {
                    Some(v) => v.to_integer()?,
                    None => 1,
                };
                let iso = iso_weekday(days) as i64; // Mon=1..Sun=7
                let result = match t {
                    1 => iso % 7 + 1,
                    2 => iso,
                    3 => iso - 1,
                    _ => {
                        return Err(FormulaErrorMsg::Expected {
                            expected: "return_type 1, 2, or 3".into(),
                            got: Some(t.to_string().into()),
                        }
                        .with_span(return_type.map_or(date.span, |v| v.span)))
                    }
                };
                Ok(Value::Number(result as f64))
            }),
        },
        FormulaFunction {
            name: "ISOWEEKNUM",
            arg_completion: "${1:date}",
            usages: &["date"],
            examples: &["ISOWEEKNUM(\"2026-01-01\")"],
            doc: "Returns the ISO 8601 week number of a date.",
            eval: util::array_mapped(|[v]| {
                Ok(Value::Number(iso_week_number(arg_to_days(&v)?) as f64))
            }),
        },
        FormulaFunction {
            name: "WEEKNUM",
            arg_completion: "${1:date}",
            usages: &["date", "date, return_type"],
            examples: &["WEEKNUM(\"2026-08-06\")"],
            doc: "Returns the week number of a date. `return_type` 1 \
                  (default): weeks start Sunday; 2: weeks start Monday; \
                  21: ISO 8601 week number.",
            eval: util::pure_fn(|args| {
                let (date, return_type) = one_or_two_args(args)?;
                let days = arg_to_days(&date)?;
                let t = match &return_type {
                    Some(v) => v.to_integer()?,
                    None => 1,
                };
                let (y, _, _) = civil_from_days(days);
                let jan1 = days_from_civil(y, 1, 1);
                let result = match t {
                    1 => (days - jan1 + sun0_weekday(jan1)) / 7 + 1,
                    2 => (days - jan1 + iso_weekday(jan1) as i64 - 1) / 7 + 1,
                    21 => iso_week_number(days),
                    _ => {
                        return Err(FormulaErrorMsg::Expected {
                            expected: "return_type 1, 2, or 21".into(),
                            got: Some(t.to_string().into()),
                        }
                        .with_span(return_type.map_or(date.span, |v| v.span)))
                    }
                };
                Ok(Value::Number(result as f64))
            }),
        },
        FormulaFunction {
            name: "NETWORKDAYS",
            arg_completion: "${1:start_date}, ${2:end_date}",
            usages: &["start_date, end_date", "start_date, end_date, holidays"],
            examples: &["NETWORKDAYS(\"2026-08-01\", \"2026-08-31\", A1:A5)"],
            doc: "Returns the number of working days between two dates \
                  (inclusive), skipping Saturdays, Sundays, and any dates in \
                  `holidays`.",
            eval: util::pure_fn(|args| {
                let (start, end, holidays) = two_or_three_args(args)?;
                let s = arg_to_days(&start)?;
                let e = arg_to_days(&end)?;
                let holidays = holidays_set(holidays.as_ref());
                let (lo, hi, sign) = if s <= e { (s, e, 1) } else { (e, s, -1) };
                let mut count = 0i64;
                for day in lo..=hi {
                    if !is_weekend(day) && !holidays.contains(&day) {
                        count += 1;
                    }
                }
                Ok(Value::Number((count * sign) as f64))
            }),
        },
        FormulaFunction {
            name: "WORKDAY",
            arg_completion: "${1:start_date}, ${2:days}",
            usages: &["start_date, days", "start_date, days, holidays"],
            examples: &["WORKDAY(\"2026-08-06\", 10)"],
            doc: "Returns the date `days` working days before or after \
                  `start_date`, skipping Saturdays, Sundays, and any dates \
                  in `holidays`.",
            eval: util::pure_fn(|args| {
                let (start, days_arg, holidays) = two_or_three_args(args)?;
                let mut day = arg_to_days(&start)?;
                let mut remaining = days_arg.to_integer()?;
                let holidays = holidays_set(holidays.as_ref());
                let step = if remaining >= 0 { 1 } else { -1 };
                remaining = remaining.abs();
                while remaining > 0 {
                    day += step;
                    if !is_weekend(day) && !holidays.contains(&day) {
                        remaining -= 1;
                    }
                }
                let (y, m, d) = civil_from_days(day);
                Ok(Value::String(format_date(y, m, d)))
            }),
        },
        FormulaFunction {
            name: "YEARFRAC",
            arg_completion: "${1:start_date}, ${2:end_date}",
            usages: &["start_date, end_date", "start_date, end_date, basis"],
            examples: &["YEARFRAC(\"2026-01-01\", \"2026-07-01\")"],
            doc: "Returns the fraction of a year between two dates. `basis` \
                  0 (default): 30/360 US; 1: actual/actual; 2: actual/360; \
                  3: actual/365; 4: 30/360 European.",
            eval: util::pure_fn(|args| {
                let (start, end, basis) = two_or_three_args(args)?;
                let s = arg_to_days(&start)?;
                let e = arg_to_days(&end)?;
                let (lo, hi) = if s <= e { (s, e) } else { (e, s) };
                let b = match &basis {
                    Some(v) => v.to_integer()?,
                    None => 0,
                };
                let result = match b {
                    0 => days360(lo, hi, false) as f64 / 360.0,
                    1 => {
                        let (ly, ..) = civil_from_days(lo);
                        let (hy, ..) = civil_from_days(hi);
                        let avg_year_len = (days_from_civil(hy + 1, 1, 1)
                            - days_from_civil(ly, 1, 1))
                            as f64
                            / (hy - ly + 1) as f64;
                        (hi - lo) as f64 / avg_year_len
                    }
                    2 => (hi - lo) as f64 / 360.0,
                    3 => (hi - lo) as f64 / 365.0,
                    4 => days360(lo, hi, true) as f64 / 360.0,
                    _ => {
                        return Err(FormulaErrorMsg::Expected {
                            expected: "basis 0–4".into(),
                            got: Some(b.to_string().into()),
                        }
                        .with_span(basis.map_or(start.span, |v| v.span)))
                    }
                };
                Ok(Value::Number(result))
            }),
        },
    ]
}

#[cfg(test)]
mod tests {
    use crate::formulas::tests::*;

    fn eval(s: &str) -> String {
        eval_to_string(&mut NoGrid, s)
    }

    #[test]
    fn test_date_normalization() {
        assert_eq!("2026-08-06", eval("DATE(2026, 8, 6)"));
        assert_eq!("2027-01-01", eval("DATE(2026, 13, 1)"));
        assert_eq!("2026-03-01", eval("DATE(2026, 2, 29)")); // 2026 not a leap year
        assert_eq!("2024-02-29", eval("DATE(2024, 2, 29)"));
        assert_eq!("2025-12-31", eval("DATE(2026, 1, 0)"));
    }

    #[test]
    fn test_date_parts() {
        assert_eq!("2026", eval("YEAR('2026-08-06')"));
        assert_eq!("8", eval("MONTH('8/6/2026')"));
        assert_eq!("6", eval("DAY('6.8.2026')"));
        assert_eq!("14", eval("HOUR('14:30:45')"));
        assert_eq!("30", eval("MINUTE('2026-08-06 14:30:45')"));
        assert_eq!("45", eval("SECOND('14:30:45')"));
    }

    #[test]
    fn test_time() {
        assert_eq!("14:30:00", eval("TIME(14, 30, 0)"));
        assert_eq!("01:00:30", eval("TIME(25, 0, 30)")); // wraps at 24h
        assert_eq!("23:59:00", eval("TIME(0, -1, 0)"));
    }

    #[test]
    fn test_edate_eomonth() {
        assert_eq!("2026-09-30", eval("EDATE('2026-08-31', 1)"));
        assert_eq!("2026-02-28", eval("EDATE('2026-01-31', 1)"));
        assert_eq!("2026-08-31", eval("EOMONTH('2026-08-06', 0)"));
        assert_eq!("2026-02-28", eval("EOMONTH('2026-01-15', 1)"));
    }

    #[test]
    fn test_days_and_datedif() {
        assert_eq!("364", eval("DAYS('2026-12-31', '2026-01-01')"));
        assert_eq!("6", eval("DATEDIF('2020-02-29', '2026-08-06', 'Y')"));
        assert_eq!("77", eval("DATEDIF('2020-02-29', '2026-08-06', 'M')"));
        assert_eq!("5", eval("DATEDIF('2020-02-29', '2026-08-06', 'YM')"));
        assert_eq!("360", eval("DAYS360('2026-01-01', '2026-12-31')"));
    }

    #[test]
    fn test_weekday_weeknum() {
        // 2026-08-06 is a Thursday
        assert_eq!("5", eval("WEEKDAY('2026-08-06')"));
        assert_eq!("4", eval("WEEKDAY('2026-08-06', 2)"));
        assert_eq!("3", eval("WEEKDAY('2026-08-06', 3)"));
        // 2026-01-01 is a Thursday -> ISO week 1
        assert_eq!("1", eval("ISOWEEKNUM('2026-01-01')"));
        assert_eq!("32", eval("WEEKNUM('2026-08-06')"));
    }

    #[test]
    fn test_networkdays_workday() {
        // August 2026: Aug 1 is a Saturday; 21 weekdays in the month
        assert_eq!("21", eval("NETWORKDAYS('2026-08-01', '2026-08-31')"));
        assert_eq!("2026-08-20", eval("WORKDAY('2026-08-06', 10)"));
        assert_eq!("2026-08-07", eval("WORKDAY('2026-08-06', 1)"));
        assert_eq!("2026-08-10", eval("WORKDAY('2026-08-07', 1)")); // skips weekend
    }

    #[test]
    fn test_yearfrac() {
        assert_eq!("0.5", eval("YEARFRAC('2026-01-01', '2026-07-01')"));
        assert_eq!("1", eval("YEARFRAC('2026-01-01', '2027-01-01', 1)"));
    }

    #[test]
    fn test_datevalue_formats() {
        assert_eq!("2026-08-06", eval("DATEVALUE('8/6/2026')"));
        assert_eq!("2026-08-06", eval("DATEVALUE('6.8.2026')"));
        assert_eq!("2026-08-06", eval("DATEVALUE('2026/8/6')"));
        assert_eq!("14:30:00", eval("TIMEVALUE('14:30')"));
    }
}
