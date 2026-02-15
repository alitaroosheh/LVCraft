---
alwaysApply: true
---

ARCHITECTURE DISPATCH (MANDATORY)

- If the active file extension is .cs → apply C# Clean Architecture rules ONLY.
- If the active file extension is .c or .h → apply Embedded C Clean Architecture rules ONLY.
- Never mix rules across languages.
- If a request spans both systems → treat them as separate projects and answer separately.
- If the file type is unknown → ask before applying architecture rules.

C# projects follow strict Clean Architecture.

Dependency rules (NON-NEGOTIABLE):
- Domain depends on NOTHING.
- Application depends only on Domain.
- Infrastructure depends on Application and Domain.
- API/UI depends on Application ONLY.

Layer responsibilities:

Domain:
- Entities, Value Objects, Domain Services.
- Pure business rules.
- No EF, no DTOs, no attributes, no logging, no configs.
- No framework or infrastructure references.

Application:
- Use cases, Commands, Queries.
- Ports (interfaces) defined here.
- No EF, no HTTP, no controllers.
- No framework-specific code.

Infrastructure:
- EF Core, Marten, PostgreSQL, MQTT, filesystem, external services.
- Implements Application interfaces.
- No business logic.

API/UI:
- Thin controllers / endpoints only.
- Maps input → Application use cases.
- No persistence.
- No business logic.

Strict rules:
- No “Shared” or “Common” projects.
- No anemic domain models.
- No god services.
- No static service access.
- No leaking Infrastructure types into Application or Domain.
- DTOs belong ONLY in API or Infrastructure boundaries.

When modifying code:
- Reuse existing abstractions.
- Extend behavior instead of duplicating it.
- Move misplaced code instead of wrapping it.

Output rules:
- If a request violates Clean Architecture → reject it.
- If refactoring is required → refactor existing code, don’t add parallel code.
- If code is requested → output ONLY final code.


Embedded firmware follows Clean Architecture adapted for C.

Layer model (STRICT):
- Domain
- Application
- HAL (Infrastructure)
- BSP / Drivers
- Platform

Dependency rules:
- Dependencies go inward only.
- Domain depends on NOTHING.
- Application depends only on Domain.
- HAL depends on Application and Domain.
- BSP/Drivers depend on HAL interfaces only.
- Platform is isolated and referenced by nothing.

Layer responsibilities:

Domain:
- Business rules, state machines, policies.
- Pure C (structs + functions).
- No RTOS.
- No malloc/free.
- No hardware registers.
- No delays, no time, no logging.
- No global mutable state.

Application:
- Orchestration and workflows.
- Talks to Domain.
- Uses HAL interfaces (function pointers).
- No hardware access.
- No vendor headers.
- No ISR code.

HAL:
- Implements Application interfaces.
- Owns timing, peripherals, delays.
- No business logic.

BSP / Drivers:
- Register-level hardware access.
- Vendor SDK usage.
- Interrupt handlers.
- No application or business logic.

Platform:
- Startup, linker, RTOS glue, main().
- Dependency wiring only.

Memory rules:
- No dynamic allocation unless explicitly approved.
- Single ownership for buffers.
- No hidden static allocations.
- Bounded stacks only.

ISR rules:
- ISR does minimum work.
- No business logic in ISR.
- Signal Application via flags, queues, or callbacks only.

Coding rules:
- No circular dependencies.
- No magic numbers.
- No logic-hiding macros.
- Headers expose interfaces only.
- Each module has one clear owner layer.

Output rules:
- If a request breaks these rules → reject it.
- If code is requested → output ONLY final code.
- No explanations unless explicitly asked.
