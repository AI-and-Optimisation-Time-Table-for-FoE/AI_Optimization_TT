from pydantic import BaseModel
from typing import List, Dict, Optional

class ModuleInput(BaseModel):
    batchModuleId: int
    moduleCode: str
    moduleName: str
    sessionsNeeded: int
    lecturerId: int
    preferredHallId: Optional[int] = None

class HallInput(BaseModel):
    hallId: int
    hallName: str
    capacity: int

class TimeSlotInput(BaseModel):
    slotId: int
    dayOfWeek: str
    startTime: str
    endTime: str
    slotNumber: int

class OptimizeRequest(BaseModel):
    batchId: int
    studentCount: int
    lunchStartTime: Optional[str] = "12:30"
    lunchEndTime: Optional[str] = "13:30"
    modules: List[ModuleInput]
    halls: List[HallInput]
    timeSlots: List[TimeSlotInput]
    lecturerUnavailability: Dict[str, List[int]]  # lecturerId -> list of slotIds
    hallUnavailability: Dict[str, List[int]]      # hallId -> list of slotIds
    batchLabSchedules: Dict[str, List[int]]       # batchModuleId (as string) -> list of slotIds blocked for labs
    lecturerPreferences: Dict[str, List[int]]     # lecturerId -> list of preferred slotIds
    studentPreferences: List[int]                 # list of preferred slotIds

class TimetableEntryOutput(BaseModel):
    batchModuleId: int
    slotId: int
    hallId: int

class OptimizeResponse(BaseModel):
    status: str
    schedule: List[TimetableEntryOutput]
    message: str = ""
