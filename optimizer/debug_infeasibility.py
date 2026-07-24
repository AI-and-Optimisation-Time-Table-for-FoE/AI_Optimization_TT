import json
from ortools.sat.python import cp_model
from models import OptimizeRequest
from constraints import apply_constraints

d = json.load(open('failed_payload.json'))
req = OptimizeRequest(**d)

# Test relaxing each constraint one by one
constraints_to_test = [
    "H1", "H2", "H4", "H5", "H6", "H7", "H10", "H11", "H12", "H13", "H14", "H15", "H16"
]

def check_feasibility(relax_constraint):
    model = cp_model.CpModel()
    
    # We need to hack apply_constraints or just copy paste the variable creation
    # Actually, apply_constraints(model, req, relaxed=False) adds everything.
    # I will just write a wrapper that reads from constraints.py or I can just relax it inside constraints.py temporarily.
    pass

