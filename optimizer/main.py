from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from models import OptimizeRequest, OptimizeResponse
from constraints import solve_hard_constraints
from genetic_algorithm import optimize_soft_constraints

app = FastAPI(title="Timetable Optimization Service")

# Add CORS middleware to allow the frontend to communicate with AWS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins (update this to your Render frontend URL in production)
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)


@app.post("/optimize", response_model=OptimizeResponse)
def optimize_timetable(req: OptimizeRequest):
    import json
    try:
        with open("last_request.json", "w") as f:
            json.dump(req.dict(), f, indent=2)
    except Exception as e:
        print("Failed to save last_request:", e)
        
    # Phase 1: Solve Hard Constraints (OR-Tools CP-SAT)
    status, feasible_schedule = solve_hard_constraints(req)
    
    if status == "infeasible":
        import json
        try:
            with open("failed_payload.json", "w") as f:
                # We can dump the raw dict from Pydantic model
                json.dump(req.dict(), f, indent=2)
        except Exception as e:
            print("Failed to save payload:", e)
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
