"""
Job State Machine for Automation Framework
"""
from enum import Enum
from typing import Optional, Dict, Any
from datetime import datetime, timezone


class JobState(str, Enum):
    """Job lifecycle states"""
    IDLE = "idle"
    VALIDATING = "validating"
    RUNNING = "running"
    WAITING_FOR_HUMAN = "waiting_for_human"
    COMPLETED = "completed"
    FAILED = "failed"
    TIMED_OUT = "timed_out"


class JobStateMachine:
    """
    Manages job state transitions with validation
    """
    
    # Valid state transitions
    TRANSITIONS = {
        JobState.IDLE: [JobState.VALIDATING, JobState.FAILED],
        JobState.VALIDATING: [JobState.RUNNING, JobState.FAILED],
        JobState.RUNNING: [
            JobState.WAITING_FOR_HUMAN,
            JobState.COMPLETED,
            JobState.FAILED,
            JobState.TIMED_OUT
        ],
        JobState.WAITING_FOR_HUMAN: [
            JobState.RUNNING,
            JobState.FAILED,
            JobState.TIMED_OUT
        ],
        JobState.COMPLETED: [],  # Terminal state
        JobState.FAILED: [],      # Terminal state
        JobState.TIMED_OUT: []    # Terminal state
    }
    
    @classmethod
    def can_transition(cls, from_state: JobState, to_state: JobState) -> bool:
        """Check if transition is valid"""
        return to_state in cls.TRANSITIONS.get(from_state, [])
    
    @classmethod
    def is_terminal(cls, state: JobState) -> bool:
        """Check if state is terminal"""
        return len(cls.TRANSITIONS.get(state, [])) == 0
    
    @classmethod
    def validate_transition(
        cls, 
        current_state: JobState, 
        new_state: JobState
    ) -> None:
        """
        Validate state transition
        Raises ValueError if invalid
        """
        if not cls.can_transition(current_state, new_state):
            raise ValueError(
                f"Invalid state transition: {current_state} -> {new_state}"
            )
    
    @classmethod
    def get_next_states(cls, current_state: JobState) -> list[JobState]:
        """Get list of possible next states"""
        return cls.TRANSITIONS.get(current_state, [])
