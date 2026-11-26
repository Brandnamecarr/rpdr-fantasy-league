# Recipe: Add an Admin Workflow

> A workflow is a named, ordered list of steps that an admin runs from the web's Admin → Workflows tab. A good minimal example to copy: `src/workflows/testWorkflow.ts`. One that takes input: `sendEmail.ts`.

## How it runs

`POST /admin/workflows/execute { workflowId, input? }` returns an `executionId` right away. `workflow.service.ts` then runs the steps **one after another, in the background**, and the first step that throws marks the workflow failed and skips the rest. The UI polls `GET /admin/workflows/status/:executionId`. Whatever string a step returns appears under that step in the execution modal.

## Steps

1. **Input type** (only if the workflow takes input): add `XInput` to `src/types/domain-types.ts`.
2. **File:** create `src/workflows/<camelName>.ts` and export a `WorkflowDefinition`:
   ```ts
   export const myThing: WorkflowDefinition = {
       id: 'my-thing',                        // kebab-case; the contract with the web repo
       name: 'My Thing',
       steps: [
           { name: 'MyThing-L1-DoFirst', run: async (input) => { /* ... */ return 'summary'; } },
       ],
   };
   ```
   - Step names follow `<Pascal>-L<n>-<Verb>`.
   - Write a `parseXInput(input)` that validates the generic `WorkflowInput` and throws a clear message if it's bad (see `lookFinder.ts`).
   - Log through `logger`, never `console.log`, so the output shows up in the admin Logs tab.
   - Keep steps safe to rerun wherever you can.
   - Constants shared between workflows go in `workflow.constants.ts`.
3. **Register it:** import the workflow and add it to `WORKFLOWS` in `src/workflows/workflow.definitions.ts`.
4. **Web:** add `{ id, name, stepNames, requiresInput? }` to the `WORKFLOWS` array in `rpdr-fantasy-web/src/components/Admin/WorkflowsTab.tsx`. The `id` and step names must match exactly. If the workflow takes input, also add an input form in that file.
5. Run it from the admin panel locally and check that every step reports success.
