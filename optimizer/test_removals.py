import sys
import os
sys.path.append(os.path.abspath('C:/Users/user/Documents/timetable/optimizer'))
import json, models, constraints

d = json.load(open('C:/Users/user/Documents/timetable/optimizer/failed_payload.json'))

def test_removal(what):
    d2 = json.loads(json.dumps(d))
    if what == 'lab': d2['batchLabSchedules'] = {}
    if what == 'lec': d2['lecturerUnavailability'] = {}
    if what == 'hall': d2['hallUnavailability'] = {}
    if what == 'lunch': d2['lunchStartTime'] = None; d2['lunchEndTime'] = None
    if what == 'pref':
        for m in d2['modules']: m['preferredHallId'] = None
    if what == 'comp':
        for m in d2['modules']: m['needsComputer'] = False
        
    req = models.OptimizeRequest(**d2)
    status, _ = constraints.solve_hard_constraints_internal(req, relaxed=False)
    return status

results = {}
for w in ['lab', 'lec', 'hall', 'lunch', 'pref', 'comp']:
    results[w] = test_removal(w)
    print(f'Remove {w}:', results[w])
