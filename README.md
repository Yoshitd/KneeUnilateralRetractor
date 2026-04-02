# Knee Unilateral Retractor (Post-Surgical Rehab Brace)

A knee brace design for controlled staged rehabilitation after knee surgery.
The system helps patients regain full range of motion (ROM) safely using an angle-limited actuator and phase-based constraints.

## 1. Project Goals

- Support safe controlled flexion/extension after surgery.
- Enforce progressive ROM limits per recovery stage.
- Provide repeatable motion control with safety stops and user/clinician override.
- Log usage and provide simple status feedback.

## 2. Rehab Stages and Target ROM

1. **Stage 0 - Immobilization/Protection**
   - Goal: protect repair, limit flexion to 0-30°
2. **Stage 1 - Early Motion**
   - Goal: gradual flexion to 0-60°
3. **Stage 2 - Mid-phase Recovery**
   - Goal: 0-90° with increasing tolerance
4. **Stage 3 - Full ROM**
   - Goal: 0-120°+ (or as patient-specific target)

> Note: Clinician must define angles and progression cadence for each patient.

## 3. High-Level System Architecture

- **Inputs**
  - User buttons / app commands
  - Physical limit switches / I/O safety

- **Control Logic**
  - Current stage values: `stage`, `angle_min`, `angle_max`, `max_rate`
  - PID / bang-bang output for actuator
  - Emergency stop handling

- **Outputs**
  - Actuator (motor, stepper, linear actuator, servo)
  - Brake/lock mechanism
  - UI (web app)


## 4. Hardware Components

- Chassis: adjustable knee frame + straps
- Actuator: 12V stepper with current sense and brake
- Microcontroller: Arduino nano
- Power: 12V battery/AC adapter with overcurrent and thermal protection
- Safety chains: mechanical hard stops, emergency release, quick disconnect

## 5. Software Flow

1. Start and self-check (sensor range, actuator readback, safety switches)
2. Load `stage` from config or clinician input
3. Enforce stage bounds: `target_min`, `target_max`
4. Read current angle at 50-100 Hz
5. Compute control output and cap by `max_speed`
6. Check safety (overextension, current/torque limit, timeout, emergency)
7. Log and display status
8. On stage change: gradually adjust limits rather than abrupt unlock

## 6. Safety / Certification Notes

- Include mechanical fail-safe that cannot overflex if electronics fail.
- Add redundant sensing for angle limit (active and passive stops).
- Implement watch-dog and galvanic isolation for patient safety.
- Validate with a licensed physical therapist and surgical team.

