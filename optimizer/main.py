from fastapi import FastAPI, HTTPException
from models import OptimizeRequest, OptimizeResponse
from constraints import solve_hard_constraints
from genetic_algorithm import optimize_soft_constraints

app = FastAPI(title="Timetable Optimization Service")

@app.post("/optimize", response_model=OptimizeResponse)
def optimize_timetable(req: OptimizeRequest):
    # Phase 1: Solve Hard Constraints (OR-Tools CP-SAT)
    status, feasible_schedule = solve_hard_constraints(req)
    
    if status == "infeasible":
        raise HTTPException(
            status_code=400,
            detail="Infeasible: The hard constraints cannot be satisfied. Please check your data (e.g. lecturer/hall availability, batch lab hours, or module count)."
        )
        
    # Phase 2: Optimize Soft Constraints (Genetic Algorithm)
    final_schedule = optimize_soft_constraints(feasible_schedule, req)
    
    return OptimizeResponse(
        status="success",
        schedule=final_schedule,
        message="Timetable optimized successfully using OR-Tools CP-SAT and Genetic Algorithm."
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
