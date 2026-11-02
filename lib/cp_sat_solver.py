"""CP-SAT model for existing section bundles; JSON stdin/stdout protocol."""
import json
import math
import sys
import time
from fractions import Fraction as F
from ortools.sat.python import cp_model

DAYS = 'MTWRFSU'


def fraction(value):
    return F(str(value))


def walking_minutes(a, b):
    if a.get('room') and a.get('room') == b.get('room'):
        return 0
    x, y = a.get('location'), b.get('location')
    if not x or not y or not all(isinstance(p.get(k), (int, float)) for p in (x, y) for k in ('lat', 'long')):
        return None
    rad = math.radians
    h = math.sin(rad(y['lat'] - x['lat']) / 2)**2 + math.cos(rad(x['lat'])) * math.cos(rad(y['lat'])) * math.sin(rad(y['long'] - x['long']) / 2)**2
    meters = 6371000 * 2 * math.asin(math.sqrt(min(1, h))) * 1.3
    return math.ceil(meters / 80)


def solve(data):
    model = cp_model.CpModel()
    rows, sections, inp = data['rows'], data['sections'], data['input']
    settings = inp.get('preferences') or {}
    metrics = {key: [] for key in ('requiredCourses', 'scheduleChanges', 'preferredCourses', 'preferredSections', 'walking', 'lowGpa', 'weekendDays', 'darkGreen', 'weekendHours', 'schedulePreferences', 'gaps')}
    def term(key, coeff, expr):
        if coeff:
            metrics[key].append((fraction(coeff), expr))
    def boolean(name):
        return model.new_bool_var(name)
    def any_true(literals, name):
        out = boolean(name)
        if literals:
            model.add_max_equality(out, literals)
        else:
            model.add(out == 0)
        return out
    def all_true(literals, name):
        out = boolean(name)
        if literals:
            for literal in literals:
                model.add_implication(out, literal)
            model.add_bool_or([out] + [v.Not() for v in literals])
        else:
            model.add(out == 1)
        return out
    def positive_part(expr, bound, name):
        out = model.new_int_var(0, max(0, bound), name)
        model.add_max_equality(out, [0, expr])
        return out

    # One complete bundle or omission per course; locks prohibit omission.
    xs, choices, present, section_sources = [], [], [], [[] for _ in sections]
    credit_terms = []
    green, low = set(settings.get('darkGreenCrns', [])), set(settings.get('lowGpaCrns', []))
    for i, row in enumerate(rows):
        selection = row['selection']
        variables = [boolean(f'b_{i}_{j}') for j in range(len(row['options']))]
        xs.append(variables)
        active = any_true(variables, f'course_{i}')
        present.append(active)
        model.add(sum(variables) == active)
        if selection.get('lock') or selection.get('locks') or selection.get('lockCourse'):
            model.add(active == 1)
        choice = model.new_int_var(-1, len(variables)-1, f'choice_{i}')
        model.add(choice == -1).only_enforce_if(active.Not())
        choices.append(choice)
        # Every course the user selected is protected before any soft ranking.
        term('requiredCourses', 1, 1-active)
        if selection.get('role') == 'preferred':
            term('preferredCourses', -1, active)
        for j, (option, x) in enumerate(zip(row['options'], variables)):
            model.add(choice == j).only_enforce_if(x)
            credit = fraction(option['credits']) * 1000
            if credit.denominator != 1:
                raise ValueError('CP-SAT supports credits to three decimal places.')
            credit_terms.append(int(credit)*x)
            crns = {sections[s]['crn'] for s in option['sections']}
            term('darkGreen', -1 if crns & green else 0, x)
            term('lowGpa', 1 if crns & low else 0, x)
            for s in option['sections']:
                section_sources[s].append(x)
    model.add(sum(present) >= 1)
    credit_sum = sum(credit_terms)
    model.add(credit_sum >= math.ceil(inp.get('minCredits', 0)*1000))
    model.add(credit_sum <= math.floor(inp.get('maxCredits', 21)*1000))
    ys = [any_true(source, f'section_{i}') for i, source in enumerate(section_sources)]
    for a, b in data['conflicts']:
        model.add(ys[a]+ys[b] <= 1)
    for baseline in inp.get('baseline', []):
        selected = any_true([ys[i] for i,s in enumerate(sections) if s['crn'] == baseline['crn']], 'baseline')
        term('scheduleChanges', 1, 1-selected)
    for i, s in enumerate(sections):
        if s['crn'] in rows[s['row']]['selection'].get('preferredCrns', []):
            term('preferredSections', -1, ys[i])
        for m in s['meetings']:
            if any(not isinstance(m[k], int) for k in ('start', 'end')):
                raise ValueError('CP-SAT requires meeting times in whole minutes.')
            for event in settings.get('events', []):
                shared = sum(1 for d in event.get('days', '') if d in m['days'])
                overlap = max(0, min(event['end'], m['end'])-max(event['start'], m['start']))
                if shared and overlap and event.get('mode') != 'disabled':
                    if event.get('mode') == 'required':
                        model.add(ys[i] == 0)
                    else:
                        term('schedulePreferences', F(shared*overlap, 60)*fraction(event.get('weight', 1)), ys[i])

    daily_active, values, value_bounds = {}, [], []
    for day in DAYS:
        # Stable order matches the JS evaluator, including date-disjoint meetings.
        meetings = [(m, i, j) for i,s in enumerate(sections) for j,m in enumerate(s['meetings']) if day in m['days']]
        meetings.sort(key=lambda item: (item[0]['start'], sections[item[1]]['row'], sections[item[1]]['order'], item[2]))
        active = any_true([ys[i] for _,i,_ in meetings], 'day_'+day)
        daily_active[day] = active
        if settings.get('countBundles'):
            count_terms = [any_true([ys[i] for _,i,_ in meetings if sections[i]['row'] == row], f'count_{day}_{row}') for row in range(len(rows))]
            count_bound = len(rows)
        else:
            count_terms = [ys[i] for _,i,_ in meetings]
            count_bound = sum(max((sum(sum(1 for m in sections[s]['meetings'] if day in m['days']) for s in option['sections']) for option in row['options']), default=0) for row in rows)
        count = model.new_int_var(0, count_bound, 'count_'+day)
        model.add(count == sum(count_terms))
        day_rules = (settings.get('days') or {}).get(day) or {}
        for key in ('min', 'max'):
            rule = day_rules.get(key)
            if not rule or rule.get('mode') == 'disabled':
                continue
            target = rule.get('value', 0 if key == 'min' else 100)
            if not isinstance(target, int):
                raise ValueError('Daily class counts must be whole numbers.')
            deficit = positive_part(target-count if key == 'min' else count-target, max(target, count_bound), f'{key}_{day}')
            if key == 'min' and not rule.get('allDays'):
                effective = model.new_int_var(0, max(target, count_bound), 'active_min_'+day)
                model.add(effective == deficit).only_enforce_if(active)
                model.add(effective == 0).only_enforce_if(active.Not())
                deficit = effective
            if rule.get('mode') == 'required':
                model.add(deficit == 0)
            else:
                term('schedulePreferences', rule.get('weight', 1), deficit)
        for m, i, _ in meetings:
            for key in ('start', 'end'):
                rule = day_rules.get(key)
                if not rule or rule.get('mode') == 'disabled':
                    continue
                amount = max(0, rule.get('value', 0)-m['start']) if key == 'start' else max(0, m['end']-rule.get('value', 1440))
                if amount:
                    if rule.get('mode') == 'required':
                        model.add(ys[i] == 0)
                    else:
                        term('schedulePreferences', fraction(amount)/60*fraction(rule.get('weight', 1)), ys[i])

        # A DAG path visits every selected meeting once, in chronological order.
        # Its edges are exactly consecutive classes, so gaps/travel are exact.
        incoming, outgoing = [[] for _ in meetings], [[] for _ in meetings]
        starts, ends = [], []
        for a, (ma, sa, _) in enumerate(meetings):
            start, end = boolean(f'first_{day}_{a}'), boolean(f'last_{day}_{a}')
            starts.append(start); ends.append(end)
            for b in range(a+1, len(meetings)):
                mb, sb, _ = meetings[b]
                if sections[sa]['row'] == sections[sb]['row'] and sa != sb:
                    # Sections in the same row can coexist only in a real bundle.
                    if not any(sa in o['sections'] and sb in o['sections'] for o in rows[sections[sa]['row']]['options']):
                        continue
                edge = boolean(f'edge_{day}_{a}_{b}')
                outgoing[a].append(edge); incoming[b].append(edge)
                gap = max(0, mb['start']-ma['end'])
                term('gaps', gap, edge)
                for band in settings.get('gapBands', []):
                    if band['min'] <= gap < band['max']:
                        term('schedulePreferences', band.get('penalty', 0), edge)
                disjoint = ma.get('from') and mb.get('from') and (ma['from'] > mb['to'] or mb['from'] > ma['to'])
                walk = walking_minutes(ma, mb)
                if not disjoint and walk is not None:
                    term('walking', max(0, 2*walk-(mb['start']-ma['end'])), edge)
            model.add(start+sum(incoming[a]) == ys[sa])
            model.add(end+sum(outgoing[a]) == ys[sa])
        model.add(sum(starts) == active)
        model.add(sum(ends) == active)

        lunch = settings.get('lunch')
        if lunch and day in lunch.get('days', []) and lunch.get('mode') != 'disabled':
            start_time, end_time, duration = (lunch[k] for k in ('start', 'end', 'duration'))
            if any(not isinstance(v, int) for v in (start_time, end_time, duration)):
                raise ValueError('Lunch times and duration must be whole minutes.')
            if end_time <= start_time or duration < 0:
                raise ValueError('Invalid lunch settings.')
            available = model.new_int_var(0, end_time-start_time, 'lunch_length_'+day)
            lunch_start = model.new_int_var(start_time, end_time, 'lunch_start_'+day)
            lunch_end = model.new_int_var(start_time, end_time, 'lunch_end_'+day)
            model.add(lunch_end == lunch_start+available)
            positive = boolean('lunch_positive_'+day)
            model.add(available >= 1).only_enforce_if(positive)
            model.add(available == 0).only_enforce_if(positive.Not())
            for m, i, _ in meetings:
                if m['end'] <= start_time or m['start'] >= end_time:
                    continue
                before = boolean('lunch_before')
                model.add(lunch_end <= m['start']).only_enforce_if([positive, ys[i], before])
                model.add(lunch_start >= m['end']).only_enforce_if([positive, ys[i], before.Not()])
            deficit = positive_part(duration-available, duration, 'lunch_deficit_'+day)
            if lunch.get('mode') == 'required':
                model.add(deficit == 0)
            else:
                term('schedulePreferences', fraction(lunch.get('weight', 1))/60, deficit)

        if day in 'MTWRF':
            if settings.get('balanceMetric') == 'hours':
                coefficients = [(m['end']-m['start'], ys[i]) for m,i,_ in meetings]
                bound = sum(max((sum(sum(m['end']-m['start'] for m in sections[s]['meetings'] if day in m['days']) for s in option['sections']) for option in row['options']), default=0) for row in rows)
                value = model.new_int_var(0, bound, 'minutes_'+day)
                model.add(value == sum(n*y for n,y in coefficients))
            else:
                value, bound = count, count_bound
            values.append(value); value_bounds.append(bound)

    weight = fraction(settings.get('distributionWeight', 0))
    packed = fraction(settings.get('packed', 50))/100
    unit = 60 if settings.get('balanceMetric') == 'hours' else 1
    if weight:
        squares = []
        for i, (value, bound) in enumerate(zip(values, value_bounds)):
            square = model.new_int_var(0, bound**2, f'square_{i}')
            model.add_multiplication_equality(square, [value, value]); squares.append(square)
        total = model.new_int_var(0, sum(value_bounds), 'total_value')
        model.add(total == sum(values))
        square_total = model.new_int_var(0, sum(value_bounds)**2, 'square_total')
        model.add_multiplication_equality(square_total, [total, total])
        term('schedulePreferences', weight*(1-packed)/F(5*unit*unit), sum(squares))
        term('schedulePreferences', -weight*(1-packed)/F(25*unit*unit), square_total)
        term('schedulePreferences', weight*packed, sum(daily_active[d] for d in 'MTWRF'))

    if settings.get('maximizeWeekends'):
        free_flags = []
        for order in ('USFRWTM', DAYS):
            for i in range(len(order)):
                free_flags.append(all_true([daily_active[d].Not() for d in order[:i+1]], 'free_prefix'))
        free_days = model.new_int_var(0, 7, 'weekend_free_days')
        model.add_min_equality(free_days, [7, sum(free_flags)])
        term('weekendDays', -1, free_days)
        firsts, lasts = [], []
        for i,s in enumerate(sections):
            for m in s['meetings']:
                for day in m['days']:
                    start, end = DAYS.index(day)*1440+m['start'], DAYS.index(day)*1440+m['end']
                    firsts.append(start*ys[i]+10080*(1-ys[i])); lasts.append(end*ys[i])
        first = model.new_int_var(0, 10080, 'week_first')
        last = model.new_int_var(0, 10080, 'week_last')
        model.add_min_equality(first, firsts or [10080]); model.add_max_equality(last, lasts or [0])
        span = model.new_int_var(0, 10080, 'weekly_span')
        has_meetings = any_true(list(daily_active.values()), 'has_meetings')
        model.add(span == last-first).only_enforce_if(has_meetings)
        model.add(span == 0).only_enforce_if(has_meetings.Not())
        term('weekendHours', F(1,60), span)

    def compile_terms(terms):
        denominator = math.lcm(*(c.denominator for c,_ in terms)) if terms else 1
        return (sum(int(c*denominator)*expr for c,expr in terms), denominator)
    objectives = [compile_terms(metrics[k]) for k in ('requiredCourses', 'scheduleChanges')]
    for group in data['groups']:
        terms = [(coeff*f['weight'], expr) for f in group['factors'] for coeff,expr in metrics[f['key']]]
        objectives.append(compile_terms(terms))

    validation = model.validate()
    if validation:
        raise ValueError('Invalid CP-SAT model: '+validation)
    base = model.clone()
    candidates, seen = [], set()
    best_coverage = len(rows)+1
    class Collector(cp_model.CpSolverSolutionCallback):
        def __init__(self, enumerating=False):
            super().__init__(); self.enumerating=enumerating
        def on_solution_callback(self):
            nonlocal best_coverage
            result = tuple(self.value(choice) for choice in choices)
            omitted = sum(c < 0 for c in result)
            if omitted < best_coverage:
                best_coverage=omitted; candidates.clear(); seen.clear()
            if omitted > best_coverage:
                return
            if result not in seen and len(candidates) < 5000:
                seen.add(result); candidates.append(result)
            if self.enumerating and len(candidates) >= 5000:
                self.stop_search()
    # Optimize priorities in stages, fixing each proven optimum before the next.
    # Collect feasible incumbents as alternatives, then use remaining time to
    # enumerate more. Only complete enumeration proves the ordering of all pages.
    started = time.monotonic()
    budget = 15.0
    optimized, branches, stages = True, 0, 0
    optimal_score = []
    status = cp_model.UNKNOWN
    for objective, denominator in objectives:
        remaining = budget-(time.monotonic()-started)
        if remaining < 0.02:
            optimized=False; break
        solver = cp_model.CpSolver(); solver.parameters.max_time_in_seconds=remaining
        solver.parameters.num_search_workers=1 if data['input'].get('backgroundPreparation') else 4
        model.minimize(objective)
        status = solver.solve(model, Collector())
        branches += solver.num_branches
        if status == cp_model.INFEASIBLE:
            if not candidates:
                return {'choices':[], 'complete':True, 'bestOptimal':False, 'branches':branches, 'stats':{'stages':stages,'searchSeconds':time.monotonic()-started}}
            raise ValueError('Priority fixing unexpectedly made a feasible model infeasible.')
        if status == cp_model.MODEL_INVALID:
            raise ValueError(solver.response_stats())
        if status != cp_model.OPTIMAL:
            optimized=False; break
        model.add(objective == solver.value(objective))
        if stages == 0:
            # Fill alternative pages with maximal course coverage instead of
            # spending the candidate pool on schedules missing selected courses.
            base.add(objective == solver.value(objective))
        optimal_score.append(solver.value(objective)/denominator)
        model.clear_hints()
        for choice in choices:
            model.add_hint(choice, solver.value(choice))
        stages += 1
    remaining = budget-(time.monotonic()-started)
    complete = False
    if remaining > 0.02 and len(candidates) < 5000:
        solver = cp_model.CpSolver(); solver.parameters.max_time_in_seconds=remaining
        solver.parameters.num_search_workers=1; solver.parameters.enumerate_all_solutions=True
        # Ignore duplicate auxiliary assignments in the collector. Excluding
        # already collected choice tuples avoids revisiting known schedules.
        if candidates:
            base.add_forbidden_assignments(choices, [list(c) for c in candidates])
        lunch = settings.get('lunch') or {}
        if lunch.get('mode', 'disabled') != 'disabled' and lunch.get('days'):
            # Lunch start/length are witnesses, not schedule choices. Project
            # them out with no-good cuts instead of enumerating their many
            # equivalent integer assignments for the same selected sections.
            solver.parameters.enumerate_all_solutions=False
            class First(Collector):
                def on_solution_callback(self):
                    super().on_solution_callback(); self.stop_search()
            excluded = len(candidates)
            while remaining > 0.02 and len(candidates) < 5000:
                solver.parameters.max_time_in_seconds=remaining
                status=solver.solve(base, First(True)); branches += solver.num_branches
                if status == cp_model.INFEASIBLE:
                    complete=True; break
                if status not in (cp_model.OPTIMAL, cp_model.FEASIBLE):
                    break
                base.add_forbidden_assignments(choices, [list(c) for c in candidates[excluded:]])
                excluded=len(candidates)
                remaining=budget-(time.monotonic()-started)
        else:
            status = solver.solve(base, Collector(True)); branches += solver.num_branches
            complete = status in (cp_model.OPTIMAL, cp_model.INFEASIBLE) and len(candidates) < 5000
        if status == cp_model.MODEL_INVALID:
            raise ValueError(solver.response_stats())
    return {'choices':candidates, 'complete':complete, 'bestOptimal':optimized and bool(candidates), 'optimalScore':optimal_score if optimized else None, 'branches':branches, 'stats':{'stages':stages, 'searchSeconds':time.monotonic()-started}}


if __name__ == '__main__':
    try:
        print(json.dumps(solve(json.load(sys.stdin)), separators=(',', ':')))
    except Exception as error:
        print(json.dumps({'error':str(error)}))
